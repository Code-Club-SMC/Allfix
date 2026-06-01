import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Loader2, Eye, Pencil } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/cb/PageHeader";
import { Card, Tabs } from "@/components/cb/Tabs";
import { KpiCard } from "@/components/cb/KpiCard";
import { Button, Field, TextInput, Select, TextArea } from "@/components/cb/Form";
import { DayChips } from "@/components/cb/DayChips";
import { SideDrawer, CenteredModal } from "@/components/cb/Overlays";
import { Avatar } from "@/components/cb/Avatar";
import {
  useAdminHROverview,
  useAdminWorkers,
  useCreateWorker,
  useUpdateWorker,
  useDeleteWorker,
  useAdminPayroll,
  useUpsertPayroll,
  useUpdatePayroll,
  useMarkPayrollPaid,
  useMarkPayrollPaidIndividual,
  useAllAdvances,
  useCreateAdvance,
  usePauseAdvance,
  useResumeAdvance,
  useCalculatePayroll,
} from "@/hooks/useAdmin";
import { useServices } from "@/hooks/useServices";

// pgtype.Numeric → number
const parsePgNumeric = (v: any): number => {
  if (v === null || v === undefined) return 0;
  if (typeof v === "number") return v;
  if (typeof v === "string") return parseFloat(v) || 0;
  if (typeof v === "object" && v.valid) {
    const int = parseInt(v.int ?? "0", 10);
    return int * Math.pow(10, v.exp ?? 0);
  }
  return 0;
};

const fmtPKR = (v: any) => `PKR ${parsePgNumeric(v).toLocaleString("en-PK", { maximumFractionDigits: 2 })}`;

// Convert pgtype.Time JSON {microseconds, valid} → "HH:MM" string
const pgtimeToString = (t: any): string => {
  if (!t || !t.valid) return "";
  const totalSeconds = Math.floor(t.microseconds / 1_000_000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

const pgtimeDisplay = (t: any): string => pgtimeToString(t) || "—";

// Format compensation_type for display: "fixed_salary" → "Fixed Salary"
const fmtCompType = (t: string) =>
  (t || "—").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

// Blank worker form state
const blankWorker = () => ({
  id: "",
  name: "",
  phone: "",
  cnic: "",
  salary: "",
  availStart: "09:00",
  availEnd: "18:00",
  status: "active",
  notes: "",
  days: [true, true, true, true, true, false, false],
  trades: [] as string[],
});

const HR = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState("overview");

  // ── Worker drawer state ──────────────────────────────────────────────────
  const [workerDrawer, setWorkerDrawer] = useState<"closed" | "add" | "edit">("closed");
  const [wf, setWf] = useState(blankWorker()); // worker form

  const now = new Date();
  const [payrollMonth, setPayrollMonth] = useState(now.getMonth() + 1);
  const [payrollYear, setPayrollYear] = useState(now.getFullYear());
  const [editPayrollId, setEditPayrollId] = useState<string | null>(null);
  const [pf, setPf] = useState({ workerId: "", baseAmount: "", deductions: "0", advanceDeductedThisMonth: "0", status: "pending", netPayable: "0" });
  const [showAddPayrollDialog, setShowAddPayrollDialog] = useState(false);
  const [showAddAdvance, setShowAddAdvance] = useState(false);
  const [af, setAf] = useState({ workerId: "", amount: "", reason: "", dateGiven: new Date().toISOString().split("T")[0], totalInstallments: 1 });

  const { data: overview, isLoading: loadingOverview } = useAdminHROverview();
  const { data: workers, isLoading: loadingWorkers } = useAdminWorkers();
  const { data: payroll, isLoading: loadingPayroll } = useAdminPayroll(payrollMonth, payrollYear);
  const { data: services } = useServices();
  const { mutate: createWorker, isPending: savingWorker } = useCreateWorker();
  const { mutate: updateWorker, isPending: updatingWorker } = useUpdateWorker();
  const { mutate: deleteWorker } = useDeleteWorker();
  const { mutate: upsertPayroll, isPending: savingPayroll } = useUpsertPayroll();
  const { mutate: updatePayroll, isPending: updatingPayroll } = useUpdatePayroll();
  const { mutate: markPayrollPaid, isPending: processingPayroll } = useMarkPayrollPaid();
  const { mutate: markPayrollPaidIndividual } = useMarkPayrollPaidIndividual();
  const { data: calculatedPayroll, isLoading: loadingCalculatedPayroll } = useCalculatePayroll(payrollMonth, payrollYear);
  const { data: advancesData, isLoading: loadingAdvances } = useAllAdvances();
  const { mutate: createAdvance, isPending: savingAdvance } = useCreateAdvance();
  const { mutate: pauseAdvance } = usePauseAdvance();
  const { mutate: resumeAdvance } = useResumeAdvance();

  const workerList: any[] = (workers as any[]) || [];
  const payrollList: any[] = (payroll as any[]) || [];
  const calculatedList: any[] = (calculatedPayroll as any[]) || [];
  const advancesList: any[] = (advancesData as any)?.data || [];

  // Helper: find payroll entry for a worker in current month/year
  const getWorkerPayrollStatus = (workerId: string) => {
    const entry = payrollList.find((p: any) => p.worker_id === workerId);
    return entry ? entry.status : null;
  };

  // Helper: get calculated data for selected worker
  const selectedWorkerCalc = calculatedList.find((c: any) => c.workerId === pf.workerId);

  // Helper: get active advances for selected worker
  const selectedWorkerAdvances = advancesList.filter((a: any) => a.worker_id === pf.workerId && (a.status === "active" || a.status === "paused"));

  // Auto-recalculate net payable when inputs change
  useEffect(() => {
    const base = parseFloat(pf.baseAmount) || 0;
    const ded = parseFloat(pf.deductions) || 0;
    const advDed = parseFloat(pf.advanceDeductedThisMonth) || 0;
    const net = Math.max(0, base - ded - advDed);
    setPf((prev) => ({ ...prev, netPayable: String(net) }));
  }, [pf.baseAmount, pf.deductions, pf.advanceDeductedThisMonth]);

  // ── Open edit drawer pre-populated with worker data ──────────────────────
  const openEdit = (w: any) => {
    setWf({
      id: w.id,
      name: w.name || "",
      phone: w.phone || "",
      cnic: w.cnic || "",
      salary: w.monthly_salary ? String(w.monthly_salary) : "",
      availStart: pgtimeToString(w.availability_start) || "09:00",
      availEnd: pgtimeToString(w.availability_end) || "18:00",
      status: w.status || "active",
      notes: w.notes || "",
      days: w.availability_days
        ? [0, 1, 2, 3, 4, 5, 6].map((i) => (w.availability_days as number[]).includes(i))
        : [true, true, true, true, true, false, false],
      trades: Array.isArray(w.trades) ? w.trades : [],
    });
    setWorkerDrawer("edit");
  };

  const openAdd = () => {
    setWf(blankWorker());
    setWorkerDrawer("add");
  };

  const closeWorkerDrawer = () => setWorkerDrawer("closed");

  // Auto-populate payroll form when worker is selected
  const handleWorkerSelect = (workerId: string) => {
    const calc = calculatedList.find((c: any) => c.workerId === workerId);
    const base = calc ? String(calc.baseAmount) : "";
    const advDed = calc ? String(calc.advanceDeduction) : "0";
    const baseNum = parseFloat(base) || 0;
    const dedNum = parseFloat(advDed) || 0;
    const net = String(baseNum - dedNum);
    setPf({
      workerId,
      baseAmount: base,
      deductions: "0",
      advanceDeductedThisMonth: advDed,
      status: "pending",
      netPayable: net,
    });
  };

  // ── Build payload from form state ────────────────────────────────────────
  const buildWorkerPayload = () => ({
    name: wf.name,
    phone: wf.phone,
    cnic: wf.cnic || undefined,
    trades: wf.trades,
    compensationType: "fixed_salary",
    monthlySalary: wf.salary || undefined,
    availabilityDays: wf.days.map((d, i) => (d ? i : -1)).filter((i) => i >= 0),
    availabilityStart: wf.availStart || undefined,
    availabilityEnd: wf.availEnd || undefined,
    status: wf.status,
    notes: wf.notes || undefined,
  });

  const handleSaveWorker = () => {
    if (workerDrawer === "add") {
      createWorker(buildWorkerPayload(), { onSuccess: closeWorkerDrawer });
    } else {
      updateWorker(
        { id: wf.id, ...buildWorkerPayload() },
        { onSuccess: closeWorkerDrawer }
      );
    }
  };

  // Build trade distribution from real workers
  const tradeDist = (services || [])
    .map((s: any) => ({
      name: s.name,
      count: workerList.filter((w) => w.trades?.includes(s.name) || w.trades?.includes(s.id)).length,
    }))
    .filter((d) => d.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
  const tradeMax = Math.max(...tradeDist.map((d) => d.count), 1);

  const isSaving = savingWorker || updatingWorker;

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader
        title="HR"
        subtitle="Workers and payroll."
        actions={
          tab === "workers" ? (
            <Button onClick={openAdd}><Plus className="h-3.5 w-3.5" />Add Worker</Button>
          ) : tab === "payroll" ? (
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => { setShowAddPayrollDialog(true); setPf({ workerId: "", baseAmount: "", deductions: "0", advanceDeductedThisMonth: "0", status: "pending", netPayable: "0" }); }}><Plus className="h-3.5 w-3.5" />Add Entry</Button>
              <Button size="sm" disabled={processingPayroll} onClick={() => markPayrollPaid({ month: payrollMonth, year: payrollYear })}>
                {processingPayroll ? "Processing…" : "Mark All Paid"}
              </Button>
            </div>
          ) : tab === "advances" ? (
            <Button size="sm" onClick={() => setShowAddAdvance(true)}><Plus className="h-3.5 w-3.5" />Give Advance</Button>
          ) : null
        }
      />
      <Tabs
        value={tab}
        onChange={setTab}
        options={[
          { value: "overview", label: "Overview" },
          { value: "workers", label: "Workers" },
          { value: "payroll", label: "Payroll" },
          { value: "advances", label: "Advances" },
        ]}
        className="mb-4"
      />

      {/* ── Overview ── */}
      {tab === "overview" && (
        <>
          {loadingOverview ? (
            <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
              <KpiCard label="Total Workers" value={overview?.totalWorkers ?? workerList.length} />
              <KpiCard label="Active" value={overview?.active ?? 0} />
              <KpiCard label="On Leave" value={overview?.onLeave ?? 0} />
            </div>
          )}
          {tradeDist.length > 0 && (
            <Card className="mt-6">
              <div className="border-b border-border px-3.5 py-2.5"><h2 className="cb-section">Workers by trade</h2></div>
              <div className="px-3.5 py-3">
                {tradeDist.map((d) => (
                  <div key={d.name} className="grid grid-cols-[140px_1fr_36px] items-center gap-3 py-1">
                    <span className="truncate text-[13px]">{d.name}</span>
                    <div className="h-2 rounded-r-sm bg-subtle">
                      <div className="h-2 rounded-r-sm bg-primary" style={{ width: `${(d.count / tradeMax) * 100}%` }} />
                    </div>
                    <span className="text-right text-[12px] text-muted-foreground">{d.count}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}

      {/* ── Workers ── */}
      {tab === "workers" && (
        <Card>
          {loadingWorkers ? (
            <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left">
                  {["Worker", "Trades", "Phone", "Compensation", "Availability", "Status", "Actions"].map((h) => (
                    <th key={h} className="cb-label px-3 py-2">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {workerList.map((w: any) => (
                  <tr key={w.id} className="border-b border-border/60 text-[12.5px] last:border-0 hover:bg-subtle/70">
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={w.name} size={28} />
                        <div>
                          <div className="font-medium">{w.name}</div>
                          <div className="text-[11px] text-muted-foreground">{w.cnic || ""}</div>
                        </div>
                      </div>
                    </td>
                    {/* Trades */}
                    <td className="px-3 py-2.5">
                      {Array.isArray(w.trades) && w.trades.length > 0
                        ? w.trades.map((t: string) => (
                            <span key={t} className="mr-1 inline-flex items-center rounded-full bg-subtle px-2 py-0.5 text-[11px] text-muted-foreground">{t}</span>
                          ))
                        : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">{w.phone}</td>
                    <td className="px-3 py-2.5">
                      {fmtCompType(w.compensation_type || w.compensationType)}
                      {w.monthly_salary ? ` · PKR ${parsePgNumeric(w.monthly_salary).toLocaleString("en-PK", { maximumFractionDigits: 2 })}` : ""}
                      {w.commission_pct ? ` · ${parsePgNumeric(w.commission_pct)}%` : ""}
                    </td>
                    {/* Availability — show day chips + time range */}
                    <td className="px-3 py-2.5">
                      <DayChips
                        value={
                          Array.isArray(w.availability_days) && w.availability_days.length > 0
                            ? [0,1,2,3,4,5,6].map((i) => (w.availability_days as number[]).includes(i))
                            : [false,false,false,false,false,false,false]
                        }
                        size="sm"
                      />
                      {(pgtimeToString(w.availability_start) || pgtimeToString(w.availability_end)) && (
                        <div className="mt-1 text-[11px] text-muted-foreground">
                          {pgtimeDisplay(w.availability_start)} – {pgtimeDisplay(w.availability_end)}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="inline-flex items-center gap-1.5 text-[12px]">
                        <span className={`h-1.5 w-1.5 rounded-full ${w.status === "active" ? "bg-success" : w.status === "on_leave" ? "bg-warning" : "bg-[hsl(var(--text-tertiary))]"}`} />
                        <span className="capitalize">{(w.status || "").replace("_", " ")}</span>
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/admin/workers/${w.id}`)}
                          className="text-[12px] font-medium text-primary hover:underline"
                          title="View profile"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => openEdit(w)}
                          className="text-[12px] font-medium text-primary hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete worker "${w.name}"?`)) deleteWorker(w.id);
                          }}
                          className="text-[12px] font-medium text-destructive hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {workerList.length === 0 && (
                  <tr><td colSpan={7} className="py-12 text-center text-[13px] text-muted-foreground">No workers yet. Add your first worker.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {/* ── Payroll ── */}
      {tab === "payroll" && (
        <>
          <div className="mb-4 flex items-center gap-2">
            <Select className="h-8 w-[80px] text-[12px]" value={String(payrollMonth)} onChange={(e) => setPayrollMonth(Number(e.target.value))}>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>{new Date(2000, i).toLocaleString("default", { month: "short" })}</option>
              ))}
            </Select>
            <Select className="h-8 w-[100px] text-[12px]" value={String(payrollYear)} onChange={(e) => setPayrollYear(Number(e.target.value))}>
              {[now.getFullYear(), now.getFullYear() - 1].map((y) => <option key={y} value={y}>{y}</option>)}
            </Select>
          </div>
          <Card>
            {loadingPayroll ? (
              <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border text-left">
                  {["Worker", "Type", "Base", "Jobs", "Commission", "Deductions", "Net Payable", "Status", "Actions"].map((h) => (
                    <th key={h} className="cb-label px-3 py-2">{h}</th>
                  ))}
                  </tr>
                </thead>
                <tbody>
                  {payrollList.map((p: any) => (
                    <tr key={p.id} className="border-b border-border/60 text-[12.5px] last:border-0 hover:bg-subtle/70">
                      <td className="px-3 py-2 font-medium">{p.worker_name || "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground capitalize">{fmtCompType(p.compensation_type || "")}</td>
                      <td className="px-3 py-2">{fmtPKR(p.base_amount)}</td>
                      <td className="px-3 py-2 text-muted-foreground">{p.jobs_count ?? "—"}</td>
                      <td className="px-3 py-2">{fmtPKR(p.commission_earned)}</td>
                      <td className="px-3 py-2 text-muted-foreground">{fmtPKR(p.deductions)}</td>
                      <td className="px-3 py-2 font-medium">{fmtPKR(p.net_payable)}</td>
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center gap-1.5 text-[12px]">
                          <span className={`h-1.5 w-1.5 rounded-full ${p.status === "paid" ? "bg-success" : "bg-warning"}`} />
                          <span className="capitalize">{p.status}</span>
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setEditPayrollId(p.id);
                              setPf({
                                workerId: p.worker_id || "",
                                baseAmount: String(p.base_amount || 0),
                                deductions: String(p.deductions || 0),
                                advanceDeductedThisMonth: String(p.advance_deducted_this_month || 0),
                                status: p.status || "pending",
                                netPayable: String(p.net_payable || 0),
                              });
                            }}
                            className="text-[12px] font-medium text-primary hover:underline"
                            title="Edit"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          {p.status !== "paid" && (
                            <button
                              onClick={() => markPayrollPaidIndividual(p.id)}
                              className="text-[12px] font-medium text-primary hover:underline"
                            >
                              Mark Paid
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {payrollList.length === 0 && (
                    <tr><td colSpan={9} className="py-12 text-center text-[13px] text-muted-foreground">No payroll records for this period. Click "Add Entry" to create one.</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </Card>

          {/* Payroll Add/Edit Dialog */}
          <CenteredModal
            open={showAddPayrollDialog || !!editPayrollId}
            onClose={() => { setShowAddPayrollDialog(false); setEditPayrollId(null); setPf({ workerId: "", baseAmount: "", deductions: "0", advanceDeductedThisMonth: "0", status: "pending", netPayable: "0" }); }}
            title={editPayrollId ? "Edit Payroll Entry" : `Add Payroll Entry — ${new Date(2000, payrollMonth - 1).toLocaleString("default", { month: "long" })} ${payrollYear}`}
            width={560}
            footer={
              <>
                <Button variant="outline" size="sm" onClick={() => { setShowAddPayrollDialog(false); setEditPayrollId(null); setPf({ workerId: "", baseAmount: "", deductions: "0", advanceDeductedThisMonth: "0", status: "pending", netPayable: "0" }); }}>Cancel</Button>
                <Button
                  size="sm"
                  disabled={(savingPayroll || updatingPayroll) || (!editPayrollId && !pf.workerId) || !pf.baseAmount}
                  onClick={() => {
                    const base = parseFloat(pf.baseAmount) || 0;
                    const ded = parseFloat(pf.deductions) || 0;
                    const advDed = parseFloat(pf.advanceDeductedThisMonth) || 0;
                    const net = base - ded - advDed;
                    if (editPayrollId) {
                      updatePayroll(
                        {
                          id: editPayrollId,
                          body: {
                            baseAmount: String(base),
                            deductions: String(ded),
                            advanceDeductedThisMonth: String(advDed),
                            netPayable: String(net),
                            status: pf.status,
                          },
                        },
                        { onSuccess: () => { setEditPayrollId(null); setPf({ workerId: "", baseAmount: "", deductions: "0", advanceDeductedThisMonth: "0", status: "pending", netPayable: "0" }); } }
                      );
                    } else {
                      upsertPayroll(
                        {
                          workerId: pf.workerId,
                          month: payrollMonth,
                          year: payrollYear,
                          baseAmount: String(base),
                          deductions: String(ded),
                          advanceDeductedThisMonth: String(advDed),
                          netPayable: String(net),
                          status: pf.status,
                        },
                        { onSuccess: () => { setShowAddPayrollDialog(false); setPf({ workerId: "", baseAmount: "", deductions: "0", advanceDeductedThisMonth: "0", status: "pending", netPayable: "0" }); } }
                      );
                    }
                  }}
                >
                  {savingPayroll || updatingPayroll ? "Saving…" : (editPayrollId ? "Update Entry" : "Save Entry")}
                </Button>
              </>
            }
          >
            <div className="space-y-4">
              <Field label="Worker">
                <Select
                  value={pf.workerId}
                  disabled={!!editPayrollId}
                  onChange={(e) => handleWorkerSelect(e.target.value)}
                >
                  <option value="" disabled>Select worker…</option>
                  {workerList.map((w: any) => {
                    const payrollStatus = getWorkerPayrollStatus(w.id);
                    const isPaid = payrollStatus === "paid";
                    return (
                      <option key={w.id} value={w.id} disabled={isPaid}>
                        {w.name} {isPaid ? "(Paid)" : payrollStatus === "pending" ? "(Pending)" : ""}
                      </option>
                    );
                  })}
                </Select>
              </Field>

              {pf.workerId && selectedWorkerCalc && (
                <div className="rounded-md border border-border bg-subtle/50 p-3 space-y-2">
                  <div className="text-[12px] font-medium text-foreground">Worker Details</div>
                  <div className="grid grid-cols-2 gap-2 text-[12px]">
                    <div>
                      <span className="text-muted-foreground">Base Salary:</span>{" "}
                      <span className="font-medium">{fmtPKR(selectedWorkerCalc.baseAmount)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Advance Deduction:</span>{" "}
                      <span className="font-medium text-warning">-{fmtPKR(selectedWorkerCalc.advanceDeduction)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Net Payable:</span>{" "}
                      <span className="font-medium text-primary">{fmtPKR(selectedWorkerCalc.netPayable)}</span>
                    </div>
                  </div>

                  {selectedWorkerAdvances.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <div className="text-[11px] font-medium text-muted-foreground">Pending Advances</div>
                      {selectedWorkerAdvances.map((a: any) => (
                        <div key={a.id} className="flex items-center justify-between text-[11px]">
                          <span className="text-muted-foreground">{a.reason || "Advance"}</span>
                          <span className="font-medium">{fmtPKR(a.remaining_amount)} remaining · {fmtPKR(a.installment_amount)}/mo</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <Field label="Base amount (PKR)">
                  <TextInput type="number" placeholder="0" value={pf.baseAmount} onChange={(e) => setPf(p => ({ ...p, baseAmount: e.target.value }))} />
                </Field>
                <Field label="Other deductions (PKR)">
                  <TextInput type="number" placeholder="0" value={pf.deductions} onChange={(e) => setPf(p => ({ ...p, deductions: e.target.value }))} />
                </Field>
                <Field label="Advance deducted (PKR)">
                  <TextInput type="number" placeholder="0" value={pf.advanceDeductedThisMonth} onChange={(e) => setPf(p => ({ ...p, advanceDeductedThisMonth: e.target.value }))} />
                </Field>
                <Field label="Net Payable (PKR)">
                  <TextInput type="number" placeholder="0" value={pf.netPayable} readOnly className="bg-subtle" />
                </Field>
              </div>

              <Field label="Status">
                <Select value={pf.status} onChange={(e) => setPf(p => ({ ...p, status: e.target.value }))}>
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                </Select>
              </Field>
            </div>
          </CenteredModal>
        </>
      )}

      {/* ── Advances ── */}
      {tab === "advances" && (
        <Card>
          {showAddAdvance && (
            <div className="border-b border-border bg-subtle/30 px-3.5 py-3">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-[13px] font-semibold">Give Advance</h3>
                <button onClick={() => setShowAddAdvance(false)} className="text-muted-foreground hover:text-foreground text-[18px] leading-none">×</button>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Field label="Worker">
                  <Select value={af.workerId} onChange={(e) => setAf(p => ({ ...p, workerId: e.target.value }))}>
                    <option value="" disabled>Select worker…</option>
                    {workerList.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </Select>
                </Field>
                <Field label="Amount (PKR)">
                  <TextInput type="number" placeholder="0" value={af.amount} onChange={(e) => setAf(p => ({ ...p, amount: e.target.value }))} />
                </Field>
                <Field label="Date given">
                  <TextInput type="date" value={af.dateGiven} onChange={(e) => setAf(p => ({ ...p, dateGiven: e.target.value }))} />
                </Field>
                <Field label="Reason" className="sm:col-span-2">
                  <TextInput placeholder="e.g. Medical emergency" value={af.reason} onChange={(e) => setAf(p => ({ ...p, reason: e.target.value }))} />
                </Field>
                <Field label="Deduct over (months)">
                  <TextInput type="number" min={1} placeholder="1" value={af.totalInstallments} onChange={(e) => setAf(p => ({ ...p, totalInstallments: parseInt(e.target.value) || 1 }))} />
                </Field>
              </div>
              <div className="mt-2.5 flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowAddAdvance(false)}>Cancel</Button>
                <Button
                  size="sm"
                  disabled={savingAdvance || !af.workerId || !af.amount}
                  onClick={() => {
                    createAdvance(
                      {
                        workerId: af.workerId,
                        amount: af.amount,
                        reason: af.reason,
                        dateGiven: af.dateGiven,
                        totalInstallments: af.totalInstallments,
                      },
                      { onSuccess: () => { setShowAddAdvance(false); setAf({ workerId: "", amount: "", reason: "", dateGiven: new Date().toISOString().split("T")[0], totalInstallments: 1 }); } }
                    );
                  }}
                >
                  {savingAdvance ? "Saving…" : "Give Advance"}
                </Button>
              </div>
            </div>
          )}
          {loadingAdvances ? (
            <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left">
                  {["Worker", "Amount", "Reason", "Date Given", "Installments", "Remaining", "Status", "Actions"].map(h => <th key={h} className="cb-label px-3 py-2">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {((advancesData as any)?.data || []).map((a: any) => (
                  <tr key={a.id} className="border-b border-border/60 text-[12.5px] last:border-0 hover:bg-subtle/70">
                    <td className="px-3 py-2 font-medium">{a.worker_name || "—"}</td>
                    <td className="px-3 py-2">{fmtPKR(a.amount)}</td>
                    <td className="px-3 py-2 text-muted-foreground">{a.reason || "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{a.date_given ? new Date(a.date_given).toLocaleDateString() : "—"}</td>
                    <td className="px-3 py-2">{a.total_installments}</td>
                    <td className="px-3 py-2">{fmtPKR(a.remaining_amount)}</td>
                    <td className="px-3 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] ${a.status === "active" ? "bg-success/10 text-success" : a.status === "paused" ? "bg-warning/10 text-warning" : "bg-muted text-muted-foreground"}`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {a.status === "active" ? (
                        <Button size="sm" variant="outline" onClick={() => pauseAdvance(a.id)}>Pause</Button>
                      ) : a.status === "paused" ? (
                        <Button size="sm" variant="outline" onClick={() => resumeAdvance(a.id)}>Resume</Button>
                      ) : null}
                    </td>
                  </tr>
                ))}
                {((advancesData as any)?.data || []).length === 0 && (
                  <tr><td colSpan={8} className="py-12 text-center text-[13px] text-muted-foreground">No advances recorded yet.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {/* ── Add / Edit Worker Drawer (shared) ── */}
      <SideDrawer
        open={workerDrawer !== "closed"}
        onClose={closeWorkerDrawer}
        title={workerDrawer === "edit" ? `Edit Worker` : "Add Worker"}
        width={420}
        footer={
          <>
            <Button variant="outline" onClick={closeWorkerDrawer}>Cancel</Button>
            <Button disabled={isSaving || !wf.name || !wf.phone} onClick={handleSaveWorker}>
              {isSaving ? "Saving…" : workerDrawer === "edit" ? "Save Changes" : "Save Worker"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Full name">
            <TextInput value={wf.name} onChange={(e) => setWf((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Bilal Ahmed" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone">
              <TextInput value={wf.phone} onChange={(e) => setWf((p) => ({ ...p, phone: e.target.value }))} placeholder="0300-0000000" />
            </Field>
            <Field label="CNIC">
              <TextInput value={wf.cnic} onChange={(e) => setWf((p) => ({ ...p, cnic: e.target.value }))} placeholder="42101-0000000-0" />
            </Field>
          </div>
          <Field label="Trades (select all that apply)">
            <div className="flex flex-wrap gap-1.5">
              {((services || []) as any[]).map((s: any) => {
                const selected = wf.trades.includes(s.name);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() =>
                      setWf((p) => ({
                        ...p,
                        trades: selected
                          ? p.trades.filter((t) => t !== s.name)
                          : [...p.trades, s.name],
                      }))
                    }
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                      selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-surface text-muted-foreground hover:bg-subtle"
                    }`}
                  >
                    {s.name}
                  </button>
                );
              })}
            </div>
          </Field>
          <Field label="Monthly salary (PKR)">
            <TextInput type="number" value={wf.salary} onChange={(e) => setWf((p) => ({ ...p, salary: e.target.value }))} placeholder="35000" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Available from">
              <TextInput type="time" value={wf.availStart} onChange={(e) => setWf((p) => ({ ...p, availStart: e.target.value }))} />
            </Field>
            <Field label="Available until">
              <TextInput type="time" value={wf.availEnd} onChange={(e) => setWf((p) => ({ ...p, availEnd: e.target.value }))} />
            </Field>
          </div>
          <Field label="Availability days">
            <DayChips value={wf.days} onChange={(d) => setWf((p) => ({ ...p, days: d }))} size="md" />
          </Field>
          <Field label="Status">
            <Select value={wf.status} onChange={(e) => setWf((p) => ({ ...p, status: e.target.value }))}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="on_leave">On Leave</option>
            </Select>
          </Field>
          <Field label="Notes">
            <TextArea rows={3} value={wf.notes} onChange={(e) => setWf((p) => ({ ...p, notes: e.target.value }))} placeholder="Internal notes…" />
          </Field>
        </div>
      </SideDrawer>

    </div>
  );
};

export default HR;
