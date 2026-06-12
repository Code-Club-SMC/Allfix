import { useEffect, useMemo, useState } from "react";
import { Search, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import type { DateRange } from "react-day-picker";
import { PageHeader } from "@/components/cb/PageHeader";
import { Card } from "@/components/cb/Tabs";
import { Button, Select, TextInput, TextArea, Field } from "@/components/cb/Form";
import { StatusBadge } from "@/components/cb/StatusBadge";
import { CenteredModal } from "@/components/cb/Overlays";
import { VendorAssignmentSection } from "@/components/admin/VendorAssignmentSection";
import {
  DateRangePicker,
  getCurrentMonthRange,
  fmtDateForAPI,
} from "@/components/ui/date-picker";
import {
  useAdminRequests,
  useAdminRequestDetail,
  useAdminWorkers,
  useAssignRequestWorkers,
  useRequestWorkers,
  useUpdateAdminRequest,
  useAssignVendor,
} from "@/hooks/useAdmin";
import { useServices } from "@/hooks/useServices";
import type { RequestStatus } from "@/types/api";

const Requests = () => {
  const [q, setQ] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [status, setStatus] = useState("all");
  const [urgency, setUrgency] = useState("all");
  const [assignmentType, setAssignmentType] = useState("all");
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(getCurrentMonthRange());
  // "worker" | "vendor" — which assignment mode is shown in the modal
  const [assignMode, setAssignMode] = useState<"worker" | "vendor">("worker");

  const { data: servicesData } = useServices();
  const { data: workers } = useAdminWorkers();
  const { data, isLoading } = useAdminRequests(
    status,
    urgency,
    q,
    page,
    undefined,
    fmtDateForAPI(dateRange?.from),
    fmtDateForAPI(dateRange?.to),
    assignmentType,
  );
  const { data: detailData, isLoading: isLoadingDetail } = useAdminRequestDetail(openId);
  const { mutate: updateRequest, isPending: isUpdating } = useUpdateAdminRequest();
  const { data: requestWorkers, isLoading: isLoadingWorkers } = useRequestWorkers(openId);
  const { mutate: assignWorkers, isPending: isAssigningWorkers } = useAssignRequestWorkers();

  const services = servicesData || [];
  const rows = data?.data || [];
  const pages = data?.pageCount || 1;
  const total = data?.total || 0;
  
  const open = detailData?.request;
  const selectedServices = detailData?.services || [];
  
  const activeWorkers = workers?.filter((w: any) => w.status === "active") || [];
  const [selectedWorkerIds, setSelectedWorkerIds] = useState<string[]>([]);
  const [initialWorkerIds, setInitialWorkerIds] = useState<string[]>([]);

  // Vendor selection state lifted from VendorAssignmentSection
  const [selectedVendorId, setSelectedVendorId] = useState("");
  const [initialVendorId, setInitialVendorId] = useState("");
  const [editStatus, setEditStatus] = useState("");

  const { mutate: assignVendor, isPending: isAssigningVendor } = useAssignVendor();

  useEffect(() => {
    if (!openId) {
      setSelectedWorkerIds([]);
      setInitialWorkerIds([]);
      setSelectedVendorId("");
      setInitialVendorId("");
      setAssignMode("worker");
      setEditStatus("");
      return;
    }
    if (requestWorkers) {
      const ids = requestWorkers.map((w: any) => w.id);
      setSelectedWorkerIds(ids);
      setInitialWorkerIds(ids);
    }
  }, [openId, requestWorkers]);

  // When detail loads, set assign mode and vendor state based on whether vendor is assigned
  useEffect(() => {
    if (detailData?.request) {
      const hasVendor = !!detailData.request.vendor_id;
      setAssignMode(hasVendor ? "vendor" : "worker");
      setEditStatus(detailData.request.status || "");
      if (hasVendor) {
        setSelectedVendorId(detailData.request.vendor_id);
        setInitialVendorId(detailData.request.vendor_id);
      }
    }
  }, [detailData]);

  const workerSelectionChanged = useMemo(() => {
    const a = [...selectedWorkerIds].sort().join("|");
    const b = [...initialWorkerIds].sort().join("|");
    return a !== b;
  }, [selectedWorkerIds, initialWorkerIds]);

  const vendorSelectionChanged = useMemo(() => {
    return selectedVendorId !== initialVendorId;
  }, [selectedVendorId, initialVendorId]);

  const toggleWorker = (workerId: string) => {
    setSelectedWorkerIds((prev) =>
      prev.includes(workerId)
        ? prev.filter((id) => id !== workerId)
        : [...prev, workerId],
    );
  };

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      setQ(searchInput);
      setPage(1);
    }
  };

  const handleUpdate = (updates: any) => {
    if (!open) return;
    updateRequest(
      { id: open.id, ...updates },
      {
        onSuccess: () => setOpenId(null),
        onError: (err: any) => toast.error(err.message || "Failed to update request"),
      }
    );
  };

  const handleSave = () => {
    if (!open || !openId) return;

    const notesArea = document.getElementById("editNotes") as HTMLTextAreaElement;

    const updates: any = {};
    if (editStatus !== open.status) updates.status = editStatus;
    if (notesArea.value !== open.internal_notes) updates.internalNotes = notesArea.value;
    const hasStatusNotesUpdates = Object.keys(updates).length > 0;

    const willAssignVendor = assignMode === "vendor" && vendorSelectionChanged && selectedVendorId;
    const willAssignWorkers = assignMode === "worker" && workerSelectionChanged;
    const hasAnyChanges = hasStatusNotesUpdates || willAssignVendor || willAssignWorkers;

    if (!hasAnyChanges) {
      setOpenId(null);
      return;
    }

    if (updates.status && open.status === "pending" && updates.status !== "pending") {
      const willHaveWorkers = assignMode === "worker" && (
        workerSelectionChanged
          ? selectedWorkerIds.length > 0
          : initialWorkerIds.length > 0
      );
      const willHaveVendor = assignMode === "vendor" && (
        vendorSelectionChanged
          ? !!selectedVendorId
          : !!open.vendor_id
      );
      if (!willHaveWorkers && !willHaveVendor) {
        toast.error("Cannot change status: assign at least one worker or a vendor first.");
        return;
      }
    }

    const finishUpdate = () => {
      if (hasStatusNotesUpdates) {
        handleUpdate(updates);
      } else {
        setOpenId(null);
      }
    };

    if (willAssignVendor) {
      assignVendor(
        { requestId: openId, vendorId: selectedVendorId },
        {
          onSuccess: finishUpdate,
          onError: (err: any) => toast.error(err.message || "Failed to assign vendor"),
        }
      );
      return;
    }

    if (willAssignWorkers) {
      assignWorkers(
        { requestId: openId, workerIds: selectedWorkerIds },
        { onSuccess: finishUpdate, onError: (err: any) => toast.error(err.message || "Failed to assign workers") },
      );
      return;
    }

    finishUpdate();
  };

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader title="Requests" subtitle={`${total} request${total === 1 ? "" : "s"}`} />

      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-3.5 py-2.5">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[hsl(var(--text-tertiary))]" />
            <TextInput 
              value={searchInput} 
              onChange={(e) => setSearchInput(e.target.value)} 
              onKeyDown={handleSearch}
              placeholder="Search ID, client, area (Press Enter)…" 
              className="h-8 w-[270px] pl-8 text-[12px]" 
            />
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1">
              <DateRangePicker
                value={dateRange}
                onChange={(range) => { setDateRange(range); setPage(1); }}
                placeholder="Date range"
                className="h-8 text-[12px]"
              />
              {dateRange && (
                <button
                  type="button"
                  onClick={() => { setDateRange(undefined); setPage(1); }}
                  className="inline-flex h-8 items-center rounded-md border border-border bg-surface px-2 text-[12px] text-muted-foreground hover:text-foreground"
                  title="Clear date range"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="h-8 w-[140px] text-[12px]">
              <option value="all">All status</option>
              {(["Pending","Assigned","In Progress","Completed","Invoiced"]).map((s) =>
                <option key={s} value={s}>{s}</option>)}
            </Select>
            <Select value={urgency} onChange={(e) => { setUrgency(e.target.value); setPage(1); }} className="h-8 w-[120px] text-[12px]">
              <option value="all">Urgency</option>
              {(["Standard","Urgent"]).map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
            <Select value={assignmentType} onChange={(e) => { setAssignmentType(e.target.value); setPage(1); }} className="h-8 w-[170px] text-[12px]">
              <option value="all">All assignments</option>
              <option value="workers">Assigned to Workers</option>
              <option value="vendors">Assigned to Vendors</option>
              <option value="unassigned">Unassigned</option>
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto relative min-h-[380px]">
          {isLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}
          <table className="w-full min-w-[980px]">
            <thead>
              <tr className="border-b border-border text-left">
                {["ID","Client","Services","Area","Scheduled","Urgency","Status","Worker","Actions"].map((h) => (
                  <th key={h} className="cb-label px-3 py-2">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r: any) => (
                <tr key={r.id} className="border-b border-border/60 text-[12.5px] transition-colors last:border-0 hover:bg-subtle/70">
                  <td className="px-3 py-2 font-medium">{r.request_number}</td>
                  <td className="px-3 py-2">{r.full_name || r.client_name || "Unknown"}</td>
                  <td className="px-3 py-2">
                    {(() => {
                      const summary = (r.service_summary || r.service_name || "—") as string;
                      const primary = summary.split(", ")[0] || summary;
                      const extra = Math.max(0, Number(r.service_count || 1) - 1);

                      return (
                        <div className="flex items-center gap-2" title={summary}>
                          <span className="max-w-[190px] truncate text-foreground">{primary}</span>
                          {extra > 0 && (
                            <span className="inline-flex shrink-0 items-center rounded-full border border-border bg-subtle px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                              +{extra} more
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{r.area}</td>
                  <td className="px-3 py-2 text-muted-foreground">{new Date(r.preferred_date).toLocaleDateString()}</td>
                  <td className="px-3 py-2">
                    <span className={r.urgency === "urgent" ? "text-warning font-medium" : "text-muted-foreground"}>
                      {r.urgency}
                    </span>
                  </td>
                  <td className="px-3 py-2"><StatusBadge status={r.status as RequestStatus} /></td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {r.vendor_id ? (
                      <span className="text-[12px] text-muted-foreground" title={`Vendor: ${r.vendor_name}`}>
                        Vendor: <span className="font-medium text-foreground">{r.vendor_name}</span>
                      </span>
                    ) : r.worker_names ? (
                      <span className="max-w-[140px] truncate text-[12px]" title={r.worker_names}>
                        {r.worker_names}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-3">
                      <button onClick={() => setOpenId(r.id)} className="text-[12px] font-medium text-primary hover:underline">View</button>
                      {r.status === "pending" && <Button size="sm" variant="outline" onClick={() => setOpenId(r.id)}>Assign</Button>}
                    </div>
                  </td>
                </tr>
              ))}
              {!isLoading && rows.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-10 text-center text-[12px] text-muted-foreground">No requests match these filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-border px-3.5 py-2.5 text-[12px] text-muted-foreground">
          <span>Page {page} of {pages}</span>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
            <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        </div>
      </Card>

      <CenteredModal
        open={!!openId}
        onClose={() => setOpenId(null)}
        title={open ? `${open.request_number}` : ""}
        width={640}
        footer={
          <>
            <Button variant="outline" onClick={() => setOpenId(null)}>Close</Button>
            <Button
              disabled={isUpdating || isAssigningWorkers || isAssigningVendor || isLoadingWorkers || editStatus === "pending"}
              onClick={handleSave}
            >
              {isUpdating || isAssigningWorkers || isAssigningVendor ? "Saving..." : "Save Changes"}
            </Button>
          </>
        }
      >
        {isLoadingDetail && <div className="py-12 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" /></div>}
        {open && !isLoadingDetail && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <StatusBadge status={open.status as RequestStatus} />
              <span className="text-[12px] text-muted-foreground">Submitted {new Date(open.created_at).toLocaleString()}</span>
            </div>
            {open.description && (
              <div>
                <div className="cb-label">Description</div>
                <div className="mt-1 text-[13px] text-muted-foreground">{open.description}</div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2.5">
                <div>
                  <div className="cb-label">Client</div>
                  <div className="mt-1 text-[13px] font-medium">{open.full_name || open.client_name || "Unknown"}</div>
                  <div className="text-[12px] text-muted-foreground">{open.phone}</div>
                  <div className="text-[12px] text-muted-foreground">{open.email}</div>
                </div>
                <div>
                  <div className="cb-label">Services</div>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {selectedServices.length > 0 ? (
                      selectedServices.map((service: any) => (
                        <span key={service.id} className="inline-flex items-center rounded-md border border-border bg-subtle px-2.5 py-1 text-[12px] font-medium text-foreground">
                          {service.service_name}
                        </span>
                      ))
                    ) : (
                      <div className="text-[13px]">{services.find((s: any) => s.id === open.service_id)?.name || open.service_id}</div>
                    )}
                  </div>
                </div>
                <div>
                  <div className="cb-label">Scheduled</div>
                  <div className="mt-1 text-[13px] text-muted-foreground">{new Date(open.preferred_date).toLocaleDateString()} at {open.preferred_time}</div>
                  <div className="mt-0.5 text-[12px] text-muted-foreground">
                    Urgency: <span className={open.urgency === "urgent" ? "font-medium text-warning" : ""}>{open.urgency}</span>
                  </div>
                </div>
                <div>
                  <div className="cb-label">Address</div>
                  <div className="mt-1 text-[13px] text-muted-foreground">{open.address}, {open.area}, {open.city}</div>
                </div>
              </div>
              <div className="space-y-2.5">
                {/* Assignment mode toggle */}
                <div className="flex items-center gap-1 rounded-md border border-border bg-subtle p-0.5 w-fit">
                  <button
                    type="button"
                    onClick={() => setAssignMode("worker")}
                    className={`rounded px-3 py-1 text-[12px] font-medium transition-colors ${
                      assignMode === "worker"
                        ? "bg-surface text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Workers
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssignMode("vendor")}
                    className={`rounded px-3 py-1 text-[12px] font-medium transition-colors ${
                      assignMode === "vendor"
                        ? "bg-surface text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Vendor
                  </button>
                </div>

                {assignMode === "worker" ? (
                  <Field label="Assign workers">
                    <div className="flex flex-wrap gap-2">
                      {activeWorkers.map((w: any) => {
                        const active = selectedWorkerIds.includes(w.id);
                        return (
                          <button
                            key={w.id}
                            type="button"
                            onClick={() => toggleWorker(w.id)}
                            className={
                              active
                                ? "rounded-md border border-primary bg-subtle px-2.5 py-1 text-[12px] font-medium text-primary"
                                : "rounded-md border border-border bg-surface px-2.5 py-1 text-[12px] text-muted-foreground"
                            }
                          >
                            {w.name}
                          </button>
                        );
                      })}
                      {activeWorkers.length === 0 && (
                        <span className="text-[12px] text-muted-foreground">No active workers</span>
                      )}
                    </div>
                  </Field>
                ) : (
                  <VendorAssignmentSection
                    requestId={open.id}
                    vendorId={open.vendor_id}
                    vendorName={open.vendor_name}
                    vendorPhone={open.vendor_phone}
                    onChange={(vendorId) => {
                      setSelectedVendorId(vendorId);
                    }}
                    onClear={() => {
                      setSelectedVendorId("");
                    }}
                  />
                )}

                <Field label="Status">
                  <Select id="editStatus" value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
                    {(["pending","assigned","in_progress","completed","invoiced"]).map((s) =>
                      <option key={s} value={s}>{s}</option>)}
                  </Select>
                </Field>
                <Field label="Internal notes">
                  <TextArea id="editNotes" rows={4} placeholder="Notes for the team…" defaultValue={open.internal_notes || ""} />
                </Field>
              </div>
            </div>
          </div>
        )}
      </CenteredModal>
    </div>
  );
};

export default Requests;
