import { useState } from "react";
import { Plus, Loader2, X } from "lucide-react";
import { PageHeader } from "@/components/cb/PageHeader";
import { Card, Tabs } from "@/components/cb/Tabs";
import { KpiCard } from "@/components/cb/KpiCard";
import { Button, Field, TextInput, Select, TextArea } from "@/components/cb/Form";
import {
	DateRangePicker,
	fmtDateForAPI,
	getCurrentMonthRange,
} from "@/components/ui/date-picker";
import {
  useAdminFinanceOverview,
  useAdminFinanceIncome,
  useAdminFinanceIncomeTotal,
  useAdminFinanceExpenses,
  useAdminFinanceExpenseTotal,
  useAdminPayroll,
  useCreateExpense,
  useSystemAccount,
} from "@/hooks/useAdmin";

// pgtype.Numeric comes back as {int: "12345", exp: -2, valid: true} → 123.45
// or as a plain string/number from the TEXT cast in the overview query
const parsePgNumeric = (v: any): number => {
  if (v === null || v === undefined) return 0;
  if (typeof v === "number") return v;
  if (typeof v === "string") return parseFloat(v) || 0;
  // pgtype.Numeric JSON object
  if (typeof v === "object" && v.valid) {
    const int = parseInt(v.int ?? "0", 10);
    const exp = v.exp ?? 0;
    return int * Math.pow(10, exp);
  }
  return 0;
};

const fmt = (v: any) => {
  const n = parsePgNumeric(v);
  return `PKR ${n.toLocaleString("en-PK", { maximumFractionDigits: 2 })}`;
};
const fmtSigned = (v: any) => {
  const n = parsePgNumeric(v);
  const sign = n < 0 ? "-" : "";
  return `PKR ${sign}${Math.abs(n).toLocaleString("en-PK", { maximumFractionDigits: 2 })}`;
};
const today = () => new Date().toISOString().split("T")[0];

const INCOME_CATEGORIES = ["invoice_payment", "advance", "other"];
const EXPENSE_CATEGORIES = ["materials", "tools", "fuel", "utilities", "salary", "miscellaneous"];

const Finance = () => {
  const [tab, setTab] = useState("overview");
  const [page, setPage] = useState(1);
  const [dateRange, setDateRange] = useState(getCurrentMonthRange());
  const now = new Date();
  const [payrollMonth] = useState(now.getMonth() + 1);
  const [payrollYear] = useState(now.getFullYear());

  // Add expense form
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ date: today(), description: "", category: "materials", amount: "", vendorPayee: "" });

  const from = fmtDateForAPI(dateRange.from);
  const to = fmtDateForAPI(dateRange.to);

  const { data: overview, isLoading: loadingOverview } = useAdminFinanceOverview(from, to);
  const { data: incomeData, isLoading: loadingIncome } = useAdminFinanceIncome(page, from, to);
  const { data: expenseData, isLoading: loadingExpenses } = useAdminFinanceExpenses(page, from, to);
  const { data: incomeTotalData, isLoading: loadingIncomeTotal } = useAdminFinanceIncomeTotal(from, to);
  const { data: expenseTotalData, isLoading: loadingExpenseTotal } = useAdminFinanceExpenseTotal(from, to);
  const { data: payroll, isLoading: loadingPayroll } = useAdminPayroll(payrollMonth, payrollYear);
  const { data: accountData, isLoading: loadingAccount } = useSystemAccount();
  const { mutate: createExpense, isPending: savingExpense } = useCreateExpense();

  const incomeRows: any[] = (incomeData as any)?.data || [];
  const expenseRows: any[] = (expenseData as any)?.data || [];
  const payrollRows: any[] = (payroll as any[]) || [];
  const incomePages = (incomeData as any)?.pageCount || 1;
  const expensePages = (expenseData as any)?.pageCount || 1;

  const totalIncome = parsePgNumeric(incomeTotalData?.total ?? 0);
  const totalExpense = parsePgNumeric(expenseTotalData?.total ?? 0);

  const handleAddExpense = () => {
    if (!expenseForm.description || !expenseForm.amount) return;
    createExpense(
      { date: expenseForm.date, description: expenseForm.description, category: expenseForm.category, amount: expenseForm.amount, vendorPayee: expenseForm.vendorPayee || undefined },
      { onSuccess: () => { setShowAddExpense(false); setExpenseForm({ date: today(), description: "", category: "materials", amount: "", vendorPayee: "" }); } }
    );
  };

  const fmtCompType = (t: string) => (t || "—").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader
        title="Finance"
        subtitle="Income, expenses and salary ledger."
        actions={
          tab === "expenses" ? (
            <Button size="sm" onClick={() => setShowAddExpense(true)}><Plus className="h-3.5 w-3.5" />Add Expense</Button>
          ) : null
        }
      />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={tab}
          onChange={(t) => { setTab(t); setPage(1); }}
          className="mb-0"
          options={[
            { value: "overview", label: "Overview" },
            { value: "income", label: "Income" },
            { value: "expenses", label: "Expenses" },
            { value: "ledger", label: "Salary Ledger" },
          ]}
        />
        <DateRangePicker
          value={dateRange}
          onChange={(range) => {
            setDateRange(range || {});
            setPage(1);
          }}
        />
      </div>

      {/* ── Overview ── */}
      {tab === "overview" && (
        <>
          {loadingOverview || loadingAccount ? (
            <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <KpiCard label="Income (this month)" value={fmt(overview?.totalIncome ?? 0)} />
              <KpiCard label="Expenses (this month)" value={fmt(overview?.totalExpenses ?? 0)} />
              <KpiCard label="Net Profit" value={fmtSigned(overview?.netProfit ?? 0)} />
              <KpiCard
                label="Account Balance"
                value={fmtSigned(accountData?.balance ?? 0)}
                valueClassName={parsePgNumeric(accountData?.balance ?? 0) < 0 ? "text-destructive" : ""}
              />
            </div>
          )}
          {!loadingOverview && overview?.monthlyData?.length > 0 && (
            <Card className="mt-6">
              <div className="border-b border-border px-3.5 py-2.5">
                <h2 className="cb-section">Last 6 months</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="cb-label px-3 py-2">Month</th>
                      <th className="cb-label px-3 py-2">Income</th>
                      <th className="cb-label px-3 py-2">Expenses</th>
                      <th className="cb-label px-3 py-2">Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.monthlyData.map((m: any) => {
                      const inc = parsePgNumeric(m.total_income);
                      const exp = parsePgNumeric(m.total_expenses);
                      return (
                        <tr key={m.month_label} className="border-b border-border/60 text-[12.5px] last:border-0">
                          <td className="px-3 py-2 font-medium">{m.month_label}</td>
                          <td className="px-3 py-2 text-success">{fmt(inc)}</td>
                          <td className="px-3 py-2 text-danger">{fmt(exp)}</td>
                          <td className={`px-3 py-2 font-medium ${inc - exp >= 0 ? "text-success" : "text-danger"}`}>
                            {fmtSigned(inc - exp)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      {/* ── Income ── */}
      {tab === "income" && (
        <Card>
          {loadingIncome ? (
            <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left">
                  {["Date", "Description", "Category", "Amount", "Source"].map(h => <th key={h} className="cb-label px-3 py-2">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {incomeRows.map((r: any) => (
                  <tr key={r.id} className="border-b border-border/60 text-[12.5px] last:border-0 hover:bg-subtle/70">
                    <td className="px-3 py-2 text-muted-foreground">{r.date ? new Date(r.date).toLocaleDateString() : "—"}</td>
                    <td className="px-3 py-2">{r.description}</td>
                    <td className="px-3 py-2"><span className="rounded-full bg-success/10 px-2 py-0.5 text-[11px] text-success capitalize">{(r.category || "").replace(/_/g, " ")}</span></td>
                    <td className="px-3 py-2 font-medium text-success">{fmt(r.amount)}</td>
                    <td className="px-3 py-2 text-muted-foreground">{r.source || "—"}</td>
                  </tr>
                ))}
                {incomeRows.length === 0 && <tr><td colSpan={5} className="py-12 text-center text-[13px] text-muted-foreground">No income records yet.</td></tr>}
              </tbody>
              {incomeRows.length > 0 && (
                <tfoot>
                  <tr className="bg-subtle text-[13px] font-medium">
                    <td className="px-3 py-2" colSpan={3}>Total (all pages)</td>
                    <td className="px-3 py-2 text-success">
                      {loadingIncomeTotal ? "Loading…" : fmt(totalIncome)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          )}
          <div className="flex items-center justify-between border-t border-border px-3.5 py-2.5 text-[12px] text-muted-foreground">
              <span>Page {page} of {incomePages}</span>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                <Button size="sm" variant="outline" disabled={page >= incomePages} onClick={() => setPage(p => p + 1)}>Next</Button>
              </div>
            </div>
        </Card>
      )}

      {/* ── Expenses ── */}
      {tab === "expenses" && (
        <Card>
          {showAddExpense && (
            <div className="border-b border-border bg-subtle/30 px-3.5 py-3">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-[13px] font-semibold">New Expense Record</h3>
                <button onClick={() => setShowAddExpense(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Field label="Date"><TextInput type="date" value={expenseForm.date} onChange={(e) => setExpenseForm(p => ({ ...p, date: e.target.value }))} /></Field>
                <Field label="Amount (PKR)"><TextInput type="number" placeholder="0" value={expenseForm.amount} onChange={(e) => setExpenseForm(p => ({ ...p, amount: e.target.value }))} /></Field>
                <Field label="Category">
                  <Select value={expenseForm.category} onChange={(e) => setExpenseForm(p => ({ ...p, category: e.target.value }))}>
                    {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</option>)}
                  </Select>
                </Field>
                <Field label="Description" className="sm:col-span-2">
                  <TextInput placeholder="e.g. Paint materials from Liberty" value={expenseForm.description} onChange={(e) => setExpenseForm(p => ({ ...p, description: e.target.value }))} />
                </Field>
                <Field label="Vendor / Payee">
                  <TextInput placeholder="e.g. Liberty Paints" value={expenseForm.vendorPayee} onChange={(e) => setExpenseForm(p => ({ ...p, vendorPayee: e.target.value }))} />
                </Field>
              </div>
              <div className="mt-2.5 flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowAddExpense(false)}>Cancel</Button>
                <Button size="sm" disabled={savingExpense || !expenseForm.description || !expenseForm.amount} onClick={handleAddExpense}>
                  {savingExpense ? "Saving…" : "Save"}
                </Button>
              </div>
            </div>
          )}
          {loadingExpenses ? (
            <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left">
                  {["Date", "Description", "Category", "Amount", "Vendor / Payee"].map(h => <th key={h} className="cb-label px-3 py-2">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {expenseRows.map((r: any) => (
                  <tr key={r.id} className="border-b border-border/60 text-[12.5px] last:border-0 hover:bg-subtle/70">
                    <td className="px-3 py-2 text-muted-foreground">{r.date ? new Date(r.date).toLocaleDateString() : "—"}</td>
                    <td className="px-3 py-2">{r.description}</td>
                    <td className="px-3 py-2"><span className="rounded-full bg-danger/10 px-2 py-0.5 text-[11px] text-danger capitalize">{(r.category || "").replace(/_/g, " ")}</span></td>
                    <td className="px-3 py-2 font-medium text-danger">{fmt(r.amount)}</td>
                    <td className="px-3 py-2 text-muted-foreground">{r.vendor_payee || "—"}</td>
                  </tr>
                ))}
                {expenseRows.length === 0 && <tr><td colSpan={5} className="py-12 text-center text-[13px] text-muted-foreground">No expense records yet.</td></tr>}
              </tbody>
              {expenseRows.length > 0 && (
                <tfoot>
                  <tr className="bg-subtle text-[13px] font-medium">
                    <td className="px-3 py-2" colSpan={3}>Total (all pages)</td>
                    <td className="px-3 py-2 text-danger">
                      {loadingExpenseTotal ? "Loading…" : fmt(totalExpense)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          )}
          <div className="flex items-center justify-between border-t border-border px-3.5 py-2.5 text-[12px] text-muted-foreground">
              <span>Page {page} of {expensePages}</span>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                <Button size="sm" variant="outline" disabled={page >= expensePages} onClick={() => setPage(p => p + 1)}>Next</Button>
              </div>
            </div>
        </Card>
      )}

      {/* ── Salary Ledger ── */}
      {tab === "ledger" && (
        <Card>
          {loadingPayroll ? (
            <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left">
                  {["Worker", "Month/Year", "Type", "Base", "Commission", "Deductions", "Net Payable", "Status"].map(h => (
                    <th key={h} className="cb-label px-3 py-2">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payrollRows.map((p: any) => (
                  <tr key={p.id} className="border-b border-border/60 text-[12.5px] last:border-0 hover:bg-subtle/70">
                    <td className="px-3 py-2 font-medium">{p.worker_name || "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{new Date(2000, (p.month || 1) - 1).toLocaleString("default", { month: "short" })} {p.year}</td>
                    <td className="px-3 py-2 text-muted-foreground capitalize">{fmtCompType(p.compensation_type || "")}</td>
                    <td className="px-3 py-2">{fmt(p.base_amount)}</td>
                    <td className="px-3 py-2">{fmt(p.commission_earned)}</td>
                    <td className="px-3 py-2 text-muted-foreground">{fmt(p.deductions)}</td>
                    <td className="px-3 py-2 font-medium">{fmt(p.net_payable)}</td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center gap-1.5 text-[12px]">
                        <span className={`h-1.5 w-1.5 rounded-full ${p.status === "paid" ? "bg-success" : "bg-warning"}`} />
                        <span className="capitalize">{p.status}</span>
                      </span>
                    </td>
                  </tr>
                ))}
                {payrollRows.length === 0 && (
                  <tr><td colSpan={8} className="py-12 text-center text-[13px] text-muted-foreground">No payroll records yet.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </Card>
      )}
    </div>
  );
};

export default Finance;
