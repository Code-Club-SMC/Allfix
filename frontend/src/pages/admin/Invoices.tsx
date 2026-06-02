import { AlertTriangle, Eye, Loader2, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button, Field, Select, TextInput } from "@/components/cb/Form";
import { CenteredModal, SideDrawer } from "@/components/cb/Overlays";
import { PageHeader } from "@/components/cb/PageHeader";
import { StatusBadge } from "@/components/cb/StatusBadge";
import { Card } from "@/components/cb/Tabs";
import {
	DateRangePicker,
	fmtDateForAPI,
	getCurrentMonthRange,
} from "@/components/ui/date-picker";
import {
	useAdminInvoiceDetail,
	useAdminInvoices,
	useAdminRequestDetail,
	useCreateInvoice,
	useRequestsWithoutInvoice,
	useRequestWorkers,
	useSystemAccount,
	useUpdateInvoice,
} from "@/hooks/useAdmin";
import { RequestStatus } from "@/types/api";

const fmt = (n: number | string) => `PKR ${Number(n).toLocaleString()}`;

const blankLineItem = () => ({
	description: "",
	quantity: 1,
	rate: 0,
	amount: 0,
});

const Invoices = () => {
	const [openId, setOpenId] = useState<string | null>(null);
	const [previewId, setPreviewId] = useState<string | null>(null);
	const [page, setPage] = useState(1);
	const [dateRange, setDateRange] = useState(getCurrentMonthRange());

	const { data: listData, isLoading } = useAdminInvoices(
		undefined,
		page,
		fmtDateForAPI(dateRange.from),
		fmtDateForAPI(dateRange.to),
	);
	const { data: detailData, isLoading: isLoadingDetail } =
		useAdminInvoiceDetail(openId);
	const { data: previewData } = useAdminInvoiceDetail(previewId);

	const invoices = listData?.data || [];
	const totalInvoices = listData?.total || 0;
	const pages = listData?.pageCount || 1;

	const open = detailData?.invoice;
	const lineItems = useMemo(
		() => detailData?.lineItems || [],
		[detailData?.lineItems],
	);
	const commissions = useMemo(
		() => detailData?.commissions || [],
		[detailData?.commissions],
	);
	const invoiceWorkers = detailData?.workers || [];

	// Preview-specific data (decoupled from edit drawer)
	const previewInvoice = previewData?.invoice;
	const previewLineItems = useMemo(
		() => previewData?.lineItems || [],
		[previewData?.lineItems],
	);
	const previewCommissions = useMemo(
		() => previewData?.commissions || [],
		[previewData?.commissions],
	);
	const previewWorkers = previewData?.workers || [];

	const subtotal = Number(open?.subtotal || 0);
	const total = subtotal;

	// ── Create invoice modal state ──
	const [showCreateModal, setShowCreateModal] = useState(false);
	const [createPage, setCreatePage] = useState(1);
	const { data: requestsWithoutInvoice, isLoading: loadingRequests } =
		useRequestsWithoutInvoice(createPage);
	const [selectedRequestId, setSelectedRequestId] = useState<string | null>(
		null,
	);
	const [selectedRequest, setSelectedRequest] = useState<any>(null);
	const { data: requestWorkers, isLoading: loadingWorkers } =
		useRequestWorkers(selectedRequestId);
	const { mutate: createInvoice, isPending: isCreatingInvoice } =
		useCreateInvoice();
	const { mutate: updateInvoice, isPending: isUpdatingInvoice } =
		useUpdateInvoice();
	const { data: accountData } = useSystemAccount();

	const [workerCommissions, setWorkerCommissions] = useState<
		Record<string, string>
	>({});
	const [createInvoiceStatus, setCreateInvoiceStatus] = useState("draft");
	const [vendorCommission, setVendorCommission] = useState("");
	// Line items for create modal (auto-populated from request services)
	const [createLineItems, setCreateLineItems] = useState<
		{ description: string; quantity: number; rate: number }[]
	>([]);

	const requestList = useMemo(
		() => requestsWithoutInvoice?.data || [],
		[requestsWithoutInvoice?.data],
	);
	const hasWorkers = (requestWorkers || []).length > 0;
	const workerList: any[] = useMemo(
		() => requestWorkers || [],
		[requestWorkers],
	);

	// Fetch full request detail (including services + vendor) when a request is selected
	const { data: selectedRequestDetail } =
		useAdminRequestDetail(selectedRequestId);
	const selectedRequestServices = useMemo(
		() => selectedRequestDetail?.services || [],
		[selectedRequestDetail?.services],
	);
	const selectedRequestVendor = selectedRequestDetail?.request;

	useEffect(() => {
		if (selectedRequestId && requestList) {
			const req = requestList.find((r: any) => r.id === selectedRequestId);
			setSelectedRequest(req || null);
		} else {
			setSelectedRequest(null);
		}
	}, [selectedRequestId, requestList]);

	// Auto-populate line items from request services
	useEffect(() => {
		if (selectedRequestServices.length > 0) {
			setCreateLineItems(
				selectedRequestServices.map((s: any) => ({
					description: s.service_name || s.name || "Service",
					quantity: 1,
					rate: 0,
				})),
			);
		} else if (selectedRequest) {
			// Fallback: single line item from service summary
			setCreateLineItems([
				{
					description:
						selectedRequest.service_summary ||
						selectedRequest.service_name ||
						"Service",
					quantity: 1,
					rate: 0,
				},
			]);
		} else {
			setCreateLineItems([]);
		}
	}, [selectedRequestServices, selectedRequest]);

	useEffect(() => {
		if (workerList.length > 0) {
			const initial: Record<string, string> = {};
			workerList.forEach((w: any) => {
				initial[w.id] = workerCommissions[w.id] || "";
			});
			setWorkerCommissions(initial);
		}
	}, [workerList]);

	const resetCreateForm = () => {
		setSelectedRequestId(null);
		setSelectedRequest(null);
		setWorkerCommissions({});
		setCreateLineItems([]);
		setCreateInvoiceStatus("draft");
		setVendorCommission("");
	};

	const handleOpenCreate = () => {
		resetCreateForm();
		setShowCreateModal(true);
	};

	const handleCloseCreate = () => {
		setShowCreateModal(false);
		resetCreateForm();
	};

	const isVendorRequest = !!selectedRequestVendor?.vendor_id;
	const totalCommissions = Object.values(workerCommissions).reduce(
		(s, v) => s + (Number(v) || 0),
		0,
	);
	const calculatedTotal = createLineItems.reduce((s, li) => s + li.rate, 0);
	const canSubmitCreate =
		selectedRequestId &&
		selectedRequest &&
		(isVendorRequest || selectedRequest.worker_count > 0) &&
		createLineItems.length > 0 &&
		calculatedTotal > 0;

	const handleCreate = () => {
		if (!selectedRequest || !canSubmitCreate) return;

		const commissions = workerList
			.map((w: any) => ({
				workerId: w.id,
				amount: workerCommissions[w.id] || "0",
			}))
			.filter((c) => Number(c.amount) > 0);

		const lineItemsPayload = createLineItems.map((li) => ({
			description: li.description,
			quantity: 1,
			rate: li.rate,
			amount: li.rate,
		}));

		const payload: Record<string, unknown> = {
			requestId: selectedRequestId,
			clientId: selectedRequest.client_id,
			clientName:
				selectedRequest.full_name || selectedRequest.client_name || "",
			clientAddress: selectedRequest.address || undefined,
			clientPhone: selectedRequest.phone || undefined,
			serviceName:
				selectedRequest.service_summary || selectedRequest.service_name || "",
			subtotal: String(calculatedTotal),
			total: String(calculatedTotal),
			status: createInvoiceStatus,
			vendorCommission: vendorCommission || undefined,
			lineItems: lineItemsPayload,
			commissions,
		};

		createInvoice(payload, {
			onSuccess: () => {
				handleCloseCreate();
			},
		});
	};

	// ── Edit form state (kept for existing invoice editing) ──
	const [form, setForm] = useState({
		clientId: "",
		clientName: "",
		clientAddress: "",
		clientPhone: "",
		serviceName: "",
		serviceDescription: "",
		subtotal: "0",
		total: "0",
		notes: "",
		status: "draft",
		lineItems: [blankLineItem()] as {
			description: string;
			quantity: number;
			rate: number;
			amount: number;
		}[],
		commissions: [] as { workerId: string; amount: string }[],
	});

	const calcTotals = (items: typeof form.lineItems) => {
		const st = items.reduce((sum, it) => sum + it.quantity * it.rate, 0);
		return { subtotal: String(st), total: String(st) };
	};

	const updateLineItem = (idx: number, field: string, value: any) => {
		setForm((f) => {
			const items = f.lineItems.map((it, i) =>
				i === idx
					? {
							...it,
							[field]: value,
							amount:
								field === "quantity" || field === "rate"
									? field === "quantity"
										? Number(value) * it.rate
										: it.quantity * Number(value)
									: it.amount,
						}
					: it,
			);
			const totals = calcTotals(items);
			return {
				...f,
				lineItems: items,
				subtotal: totals.subtotal,
				total: totals.total,
			};
		});
	};

	const addLineItem = () =>
		setForm((f) => ({ ...f, lineItems: [...f.lineItems, blankLineItem()] }));
	const removeLineItem = (idx: number) =>
		setForm((f) => {
			const items = f.lineItems.filter((_, i) => i !== idx);
			const totals = calcTotals(items);
			return {
				...f,
				lineItems: items,
				subtotal: totals.subtotal,
				total: totals.total,
			};
		});

	const handleUpdate = () => {
		if (!open) return;
		const payload: Record<string, unknown> = {};
		if (form.clientName) payload.clientName = form.clientName;
		if (form.clientAddress) payload.clientAddress = form.clientAddress;
		if (form.clientPhone) payload.clientPhone = form.clientPhone;
		if (form.serviceName) payload.serviceName = form.serviceName;
		if (form.serviceDescription)
			payload.serviceDescription = form.serviceDescription;
		payload.subtotal = form.subtotal;
		payload.total = form.total;
		if (form.notes) payload.notes = form.notes;
		payload.status = form.status;
		payload.lineItems = form.lineItems.map((li) => ({
			description: li.description,
			quantity: li.quantity,
			rate: li.rate,
			amount: li.quantity * li.rate,
		}));
		payload.commissions = form.commissions.filter(
			(c) => c.workerId && Number(c.amount) > 0,
		);
		updateInvoice(
			{ id: open.id, ...payload },
			{ onSuccess: () => setOpenId(null) },
		);
	};

	// Pre-fill form when viewing existing invoice
	useEffect(() => {
		if (open && openId !== "new") {
			setForm({
				clientId: open.client_id,
				clientName: open.client_name,
				clientAddress: open.client_address || "",
				clientPhone: open.client_phone || "",
				serviceName: open.service_name,
				serviceDescription: open.service_description || "",
				subtotal: String(open.subtotal || 0),
				total: String(open.total || 0),
				notes: open.notes || "",
				status: open.status,
				lineItems:
					lineItems.length > 0
						? lineItems.map((li: any) => ({
								description: li.description,
								quantity: Number(li.quantity),
								rate: Number(li.rate),
								amount: Number(li.amount),
							}))
						: [blankLineItem()],
				commissions: commissions.map((c: any) => ({
					workerId: c.worker_id,
					amount: String(c.amount),
				})),
			});
		}
	}, [open, lineItems, commissions]);

	const addCommission = () =>
		setForm((f) => ({
			...f,
			commissions: [...f.commissions, { workerId: "", amount: "" }],
		}));
	const updateCommission = (idx: number, field: string, value: string) =>
		setForm((f) => ({
			...f,
			commissions: f.commissions.map((c, i) =>
				i === idx ? { ...c, [field]: value } : c,
			),
		}));
	const removeCommission = (idx: number) =>
		setForm((f) => ({
			...f,
			commissions: f.commissions.filter((_, i) => i !== idx),
		}));

	const statusColor = (status: string) => {
		switch (status) {
			case "pending":
				return "bg-warning";
			case "assigned":
				return "bg-primary";
			case "in_progress":
				return "bg-info";
			case "completed":
				return "bg-success";
			default:
				return "bg-muted-foreground";
		}
	};

	return (
		<div className="mx-auto max-w-[1400px]">
			<PageHeader
				title="Invoices"
				subtitle={isLoading ? "Loading..." : `${totalInvoices} invoices total`}
				actions={
					<Button onClick={handleOpenCreate}>
						<Plus className="h-3.5 w-3.5" /> New Invoice
					</Button>
				}
			/>

			<Card>
				<div className="flex flex-wrap items-center gap-2 border-b border-border px-3.5 py-2.5">
					<div className="ml-auto flex flex-wrap items-center gap-2">
						<DateRangePicker
							value={dateRange}
							onChange={(range) => {
								setDateRange(range || {});
								setPage(1);
							}}
						/>
					</div>
				</div>

				<div className="relative min-h-[280px] overflow-x-auto">
					{isLoading && (
						<div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50">
							<Loader2 className="h-6 w-6 animate-spin text-primary" />
						</div>
					)}
					<table className="w-full">
						<thead>
							<tr className="border-b border-border text-left">
								{[
									"Invoice #",
									"Client",
									"Service",
									"Date",
									"Amount",
									"Status",
									"Actions",
								].map((h) => (
									<th key={h} className="cb-label px-3 py-2">
										{h}
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{invoices.map((inv: any) => (
								<tr
									key={inv.id}
									className="border-b border-border/60 text-[12.5px] transition-colors last:border-0 hover:bg-subtle/70"
								>
									<td className="px-3 py-2 font-medium">
										{inv.invoice_number}
									</td>
									<td className="px-3 py-2">{inv.client_name}</td>
									<td className="px-3 py-2">{inv.service_name}</td>
									<td className="px-3 py-2 text-muted-foreground">
										{new Date(inv.created_at).toLocaleDateString()}
									</td>
									<td className="px-3 py-2 font-medium">{fmt(inv.total)}</td>
									<td className="px-3 py-2">
										<StatusBadge status={inv.status as RequestStatus} />
									</td>
									<td className="px-3 py-2">
										<div className="flex items-center gap-2">
										<button
											className="flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground"
											onClick={() => {
												setOpenId(null);
												setPreviewId(inv.id);
											}}
											title="Preview"
										>
											<Eye className="h-3.5 w-3.5" />
										</button>
										<button
											className="text-[12px] font-medium text-primary hover:underline"
											onClick={() => {
												setPreviewId(null);
												setOpenId(inv.id);
											}}
										>
											Edit
										</button>
										</div>
									</td>
								</tr>
							))}
							{!isLoading && invoices.length === 0 && (
								<tr>
									<td
										colSpan={7}
										className="py-10 text-center text-muted-foreground"
									>
										No invoices found.
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>

				<div className="flex items-center justify-between border-t border-border px-3.5 py-2.5 text-[12px] text-muted-foreground">
					<span>
						Page {page} of {pages}
					</span>
					<div className="flex items-center gap-2">
						<Button
							size="sm"
							variant="outline"
							disabled={page <= 1}
							onClick={() => setPage((p) => p - 1)}
						>
							Previous
						</Button>
						<Button
							size="sm"
							variant="outline"
							disabled={page >= pages}
							onClick={() => setPage((p) => p + 1)}
						>
							Next
						</Button>
					</div>
				</div>
			</Card>

			{/* ── CREATE INVOICE MODAL ── */}
			<CenteredModal
				open={showCreateModal}
				onClose={handleCloseCreate}
				title="Create Invoice"
				width={520}
				footer={
					<>
						<Button variant="outline" onClick={handleCloseCreate}>
							Cancel
						</Button>
						<Button
							disabled={isCreatingInvoice || !canSubmitCreate}
							onClick={handleCreate}
						>
							{isCreatingInvoice ? "Creating..." : "Create Invoice"}
						</Button>
					</>
				}
			>
				<div className="space-y-4 text-[13px]">
					{/* Request Selection */}
					<div>
						<label className="cb-label mb-1.5 block">
							Select Request <span className="text-destructive">*</span>
						</label>
						{loadingRequests ? (
							<div className="flex h-10 items-center gap-2 rounded-md border border-border px-3 text-[12px] text-muted-foreground">
								<Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading
								requests…
							</div>
						) : requestList.length === 0 ? (
							<div className="rounded-md border border-border bg-subtle/30 px-3 py-2.5 text-[12px] text-muted-foreground">
								No eligible requests found. All requests are either invoiced or
								pending worker assignment.
							</div>
						) : (
							<select
								value={selectedRequestId || ""}
								onChange={(e) => setSelectedRequestId(e.target.value || null)}
								className="h-10 w-full rounded-md border border-border bg-surface px-3 text-[13px] text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
							>
								<option value="" disabled>
									Choose a request…
								</option>
								{requestList.map((req: any) => (
									<option key={req.id} value={req.id}>
										{req.request_number} • {req.full_name || req.client_name} •{" "}
										{req.service_name} ({req.status})
									</option>
								))}
							</select>
						)}
					</div>

					{/* Derived Details (read-only) */}
					{selectedRequest && (
						<div className="rounded-md border border-border bg-subtle/30 px-3.5 py-3">
							<div className="mb-2 flex items-center gap-2">
								<span
									className={`inline-block h-2 w-2 rounded-full ${statusColor(selectedRequest.status)}`}
								/>
								<span className="text-[12px] font-medium capitalize">
									{selectedRequest.status?.replace(/_/g, " ")}
								</span>
								{selectedRequest.worker_count === 0 && (
									<span className="ml-auto inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-[11px] font-medium text-warning">
										<AlertTriangle className="h-3 w-3" /> No workers
									</span>
								)}
								{selectedRequest.worker_count > 0 && (
									<span className="ml-auto text-[11px] text-muted-foreground">
										{selectedRequest.worker_count} worker
										{selectedRequest.worker_count > 1 ? "s" : ""} assigned
									</span>
								)}
							</div>
							<div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12px]">
								<div>
									<span className="text-muted-foreground">Client:</span>{" "}
									<span className="font-medium">
										{selectedRequest.full_name || selectedRequest.client_name}
									</span>
								</div>
								<div>
									<span className="text-muted-foreground">Phone:</span>{" "}
									<span>{selectedRequest.phone || "—"}</span>
								</div>
								<div className="col-span-2">
									<span className="text-muted-foreground">Service:</span>{" "}
									<span>
										{selectedRequest.service_summary ||
											selectedRequest.service_name}
									</span>
								</div>
								<div>
									<span className="text-muted-foreground">Scheduled:</span>{" "}
									<span>
										{new Date(
											selectedRequest.preferred_date,
										).toLocaleDateString()}{" "}
										· {selectedRequest.preferred_time}
									</span>
								</div>
								<div>
									<span className="text-muted-foreground">Area:</span>{" "}
									<span>{selectedRequest.area || "—"}</span>
								</div>
								<div className="col-span-2">
									<span className="text-muted-foreground">Address:</span>{" "}
									<span>{selectedRequest.address || "—"}</span>
								</div>
							</div>
						</div>
					)}

					{/* No workers warning — only show for non-vendor requests */}
					{selectedRequest &&
						selectedRequest.worker_count === 0 &&
						!isVendorRequest && (
							<div className="flex items-start gap-2 rounded-md bg-warning/10 px-3 py-2.5 text-[12px] text-warning">
								<AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
								<div>
									<div className="font-medium">Cannot create invoice</div>
									<div>
										This request has no workers assigned. Assign worker(s)
										before generating an invoice.
									</div>
								</div>
							</div>
						)}

					{/* Vendor commission input */}
					{isVendorRequest && (
						<div className="rounded-md border border-border bg-subtle/30 px-3 py-2.5 text-[12px]">
							<div className="font-medium text-foreground mb-2">
								Vendor Assignment
							</div>
							<div className="text-muted-foreground mb-2">
								Vendor:{" "}
								<span className="font-medium text-foreground">
									{selectedRequestVendor?.vendor_name || "—"}
								</span>
							</div>
							<Field label="Vendor Commission %">
								<TextInput
									type="number"
									min="0"
									max="100"
									step="0.01"
									placeholder="e.g. 10"
									value={vendorCommission}
									onChange={(e) => setVendorCommission(e.target.value)}
									className="h-8 text-[12px]"
								/>
							</Field>
							{calculatedTotal > 0 && Number(vendorCommission) > 0 && (
								<div className="mt-1.5 text-muted-foreground">
									= PKR{" "}
									{(
										(calculatedTotal * Number(vendorCommission)) /
										100
									).toLocaleString(undefined, { maximumFractionDigits: 2 })}
								</div>
							)}
						</div>
					)}

					{/* Line items with per-item pricing */}
					{createLineItems.length > 0 && (
						<div className="rounded-md border border-border bg-subtle/30 px-3 py-2.5 text-[12px]">
							<div className="font-medium text-foreground mb-2">
								Line Items
							</div>
							<div className="space-y-2">
								{createLineItems.map((li, i) => (
									<div key={i} className="flex items-center gap-2">
										<div className="min-w-0 flex-1 truncate text-muted-foreground">
											{li.description}
										</div>
										<TextInput
											type="number"
											placeholder="0"
											value={li.rate || ""}
											onChange={(e) => {
												const rate = Number(e.target.value) || 0;
												setCreateLineItems((prev) =>
													prev.map((item, idx) =>
														idx === i ? { ...item, rate } : item,
													),
												);
											}}
											className="h-8 w-[100px] text-right text-[12px]"
										/>
									</div>
								))}
							</div>
							<div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-[13px] font-semibold">
								<span>Total</span>
								<span>{fmt(createLineItems.reduce((s, li) => s + li.rate, 0))}</span>
							</div>
						</div>
					)}

					{/* Invoice Status */}
					<Field label="Status">
						<Select value={createInvoiceStatus} onChange={(e) => setCreateInvoiceStatus(e.target.value)}>
							<option value="draft">Draft</option>
							<option value="sent">Sent</option>
							<option value="paid">Paid</option>
						</Select>
					</Field>

					{/* Account Balance */}
					{accountData && (
						<div className="rounded-md border border-border bg-subtle/30 px-3 py-2.5 text-[12px] space-y-2">
							<div className="flex items-center justify-between">
								<span className="text-muted-foreground">Current Balance</span>
								<span className={`font-semibold ${Number(accountData.balance ?? 0) < 0 ? "text-destructive" : ""}`}>
									{fmt(Number(accountData.balance ?? 0))}
								</span>
							</div>

							{/* Live calculation — only relevant when invoice is paid */}
							{createInvoiceStatus === "paid" && (calculatedTotal > 0 || totalCommissions > 0 || Number(vendorCommission) > 0) && (
								<div className="space-y-1 border-t border-border pt-2">
									{calculatedTotal > 0 && (
										<div className="flex items-center justify-between text-muted-foreground">
											<span>Invoice Total:</span>
											<span>+ {fmt(calculatedTotal)}</span>
										</div>
									)}
									{Number(vendorCommission) > 0 && (
										<div className="flex items-center justify-between text-warning">
											<span>Vendor Commission ({vendorCommission}%):</span>
											<span>− {fmt((calculatedTotal * Number(vendorCommission)) / 100)}</span>
										</div>
									)}
									{totalCommissions > 0 && (
										<div className="flex items-center justify-between text-muted-foreground">
											<span>Worker Commissions:</span>
											<span>− {fmt(totalCommissions)}</span>
										</div>
									)}
									<div className="flex items-center justify-between border-t border-border pt-1 font-semibold">
										<span>Projected Balance:</span>
										<span className={
											(Number(accountData.balance ?? 0) + calculatedTotal - (calculatedTotal * Number(vendorCommission)) / 100 - totalCommissions) < 0
												? "text-destructive" : ""
										}>
											{fmt(
											Number(accountData.balance ?? 0) +
											calculatedTotal -
											(calculatedTotal * Number(vendorCommission)) / 100 -
											totalCommissions
											)}
										</span>
									</div>
								</div>
							)}
						</div>
					)}

					{/* Worker Commissions */}
					{selectedRequestId && hasWorkers && (
						<div className="border-t border-border pt-3">
							<div className="mb-2 flex items-center justify-between">
								<div className="cb-label">Worker Commissions</div>
								<div className="text-[11px] text-muted-foreground">
									Paid when invoice is marked as Paid
								</div>
							</div>
							{loadingWorkers ? (
								<div className="flex h-8 items-center gap-2 text-[12px] text-muted-foreground">
									<Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading
									workers…
								</div>
							) : workerList.length === 0 ? (
								<div className="text-[12px] text-muted-foreground">
									No workers assigned to this request.
								</div>
							) : (
								<div className="space-y-2">
									{workerList.map((w: any) => (
										<div key={w.id} className="flex items-center gap-3">
											<div className="min-w-0 flex-1">
												<div className="text-[12px] font-medium">{w.name}</div>
												<div className="text-[11px] text-muted-foreground">
													{w.phone}
												</div>
											</div>
											<TextInput
												type="number"
												placeholder="0"
												value={workerCommissions[w.id] || ""}
												onChange={(e) =>
													setWorkerCommissions((prev) => ({
														...prev,
														[w.id]: e.target.value,
													}))
												}
												className="h-8 w-[120px] text-right text-[12px]"
											/>
										</div>
									))}
								</div>
							)}
							{/* Commission payout info */}
							{totalCommissions > 0 && (
								<div className="mt-2 flex items-start gap-2 rounded-md bg-warning/10 px-3 py-2 text-[12px] text-warning">
									<AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
									<div>
										<div className="font-medium">Commission payout</div>
										<div>
											{fmt(totalCommissions)} will be paid to workers when the
											invoice status is changed to "Paid".
										</div>
									</div>
								</div>
							)}
						</div>
					)}
				</div>
			</CenteredModal>

			{/* ── VIEW / EDIT DRAWER ── */}
			<SideDrawer
				open={!!openId && openId !== "new"}
				onClose={() => setOpenId(null)}
				title={open ? `Invoice ${open.invoice_number}` : ""}
				width={520}
				footer={
					open && (
						<Button disabled={isUpdatingInvoice} onClick={handleUpdate}>
							{isUpdatingInvoice ? "Saving..." : "Save Changes"}
						</Button>
					)
				}
			>
				{isLoadingDetail && (
					<div className="py-12 text-center">
						<Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
					</div>
				)}
				{open && !isLoadingDetail && (
					<div className="space-y-4 text-[13px]">
						<div className="grid grid-cols-2 gap-3">
							<Field label="Client name">
								<TextInput
									value={form.clientName}
									onChange={(e) =>
										setForm((f) => ({ ...f, clientName: e.target.value }))
									}
								/>
							</Field>
							<Field label="Client phone">
								<TextInput
									value={form.clientPhone}
									onChange={(e) =>
										setForm((f) => ({ ...f, clientPhone: e.target.value }))
									}
								/>
							</Field>
						</div>
						<Field label="Client address">
							<TextInput
								value={form.clientAddress}
								onChange={(e) =>
									setForm((f) => ({ ...f, clientAddress: e.target.value }))
								}
							/>
						</Field>
						<div className="grid grid-cols-2 gap-3">
							<Field label="Service">
								<TextInput
									value={form.serviceName}
									onChange={(e) =>
										setForm((f) => ({ ...f, serviceName: e.target.value }))
									}
								/>
							</Field>
							<Field label="Status">
								<select
									value={form.status}
									onChange={(e) =>
										setForm((f) => ({ ...f, status: e.target.value }))
									}
									className="h-9 w-full rounded-md border border-border bg-surface px-2 text-[13px]"
								>
									<option value="draft">Draft</option>
									<option value="sent">Sent</option>
									<option value="paid">Paid</option>
								</select>
							</Field>
						</div>

						<div className="border-t border-border pt-3">
							<div className="mb-2 flex items-center justify-between">
								<span className="cb-label">Line Items</span>
								<button
									onClick={addLineItem}
									className="text-[12px] font-medium text-primary hover:underline"
								>
									+ Add item
								</button>
							</div>
							{form.lineItems.map((li, i) => (
								<div
									key={i}
									className="mb-2 grid grid-cols-[1fr_80px_28px] gap-2"
								>
									<TextInput
										placeholder="Description"
										value={li.description}
										onChange={(e) =>
											updateLineItem(i, "description", e.target.value)
										}
										className="text-[12px]"
									/>
									<TextInput
										type="number"
										placeholder="Rate"
										value={li.rate}
										onChange={(e) =>
											updateLineItem(i, "rate", Number(e.target.value))
										}
										className="text-[12px]"
									/>
									<button
										onClick={() => removeLineItem(i)}
										className="flex items-center justify-center text-muted-foreground hover:text-destructive"
									>
										×
									</button>
								</div>
							))}
						</div>

						<div className="border-t border-border pt-3">
							<div className="mb-2 flex items-center justify-between">
								<span className="cb-label">Worker Commissions</span>
								<button
									onClick={addCommission}
									className="text-[12px] font-medium text-primary hover:underline"
								>
									+ Add commission
								</button>
							</div>
							{form.commissions.map((c, i) => (
								<div
									key={i}
									className="mb-2 grid grid-cols-[1fr_100px_28px] gap-2"
								>
									<select
										value={c.workerId}
										onChange={(e) =>
											updateCommission(i, "workerId", e.target.value)
										}
										className="h-9 rounded-md border border-border bg-surface px-2 text-[12px]"
									>
										<option value="" disabled>
											Select worker…
										</option>
										{invoiceWorkers.map((w: any) => (
											<option key={w.id} value={w.id}>
												{w.name}
											</option>
										))}
									</select>
									<TextInput
										type="number"
										placeholder="Amount"
										value={c.amount}
										onChange={(e) =>
											updateCommission(i, "amount", e.target.value)
										}
										className="text-[12px]"
									/>
									<button
										onClick={() => removeCommission(i)}
										className="flex items-center justify-center text-muted-foreground hover:text-destructive"
									>
										×
									</button>
								</div>
							))}
							{/* Edit commission payout info */}
							{(() => {
								const editTotalComm = form.commissions.reduce(
									(s, c) => s + (Number(c.amount) || 0),
									0,
								);
								if (editTotalComm > 0) {
									const isPaid = open?.status === "paid";
									return (
										<div className="mt-2 flex items-start gap-2 rounded-md bg-warning/10 px-3 py-2 text-[12px] text-warning">
											<AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
											<div>
												<div className="font-medium">Commission payout</div>
												<div>
													{isPaid
														? `${fmt(editTotalComm)} will be deducted from the account immediately upon save.`
														: `${fmt(editTotalComm)} will be paid to workers when the invoice status is changed to "Paid".`}
												</div>
											</div>
										</div>
									);
								}
								return null;
							})()}
						</div>

						<div className="border-t border-border pt-3">
							<div className="ml-auto w-full max-w-[260px] space-y-1">
								<Row label="Subtotal" value={fmt(form.subtotal)} />
								<div className="flex items-center justify-between border-t border-border pt-2">
									<span className="font-semibold">Total</span>
									<span className="text-[18px] font-semibold text-primary">
										{fmt(form.total)}
									</span>
								</div>
								{Number(open.vendor_commission || 0) > 0 && (
									<>
										<div className="flex items-center justify-between text-warning">
											<span className="text-[12px]">Vendor Commission ({open.vendor_commission}%)</span>
											<span className="text-[12px]">
												- {fmt(Number(form.total) * Number(open.vendor_commission) / 100)}
											</span>
										</div>
										<div className="flex items-center justify-between text-success">
											<span className="text-[12px] font-medium">
												Net Revenue
											</span>
											<span className="text-[12px] font-medium">
												{fmt(
													Number(form.total) * (1 - Number(open.vendor_commission) / 100),
												)}
											</span>
										</div>
									</>
								)}
							</div>
						</div>

						<Field label="Notes">
							<textarea
								rows={3}
								value={form.notes}
								onChange={(e) =>
									setForm((f) => ({ ...f, notes: e.target.value }))
								}
								placeholder="Add a note for the client…"
								className="w-full rounded-md border border-border bg-surface px-3 py-2 text-[13px] outline-none focus:border-primary focus:ring-1 focus:ring-primary"
							/>
						</Field>
					</div>
				)}
			</SideDrawer>

			{/* A4 preview */}
			{previewInvoice && (
				<CenteredModal
					open
					onClose={() => setPreviewId(null)}
					title={`Preview ${previewInvoice.invoice_number}`}
					width={760}
					footer={
						<Button variant="outline" onClick={() => setPreviewId(null)}>
							Close
						</Button>
					}
				>
					<div className="overflow-y-auto px-1 py-1 text-[12.5px]">
						<div className="flex items-start justify-between">
							<div>
								<div className="text-[20px] font-semibold tracking-tight">
									Allfix
								</div>
								<div className="text-[12px] text-muted-foreground">
									Islamabad, Pakistan
								</div>
								<div className="text-[12px] text-muted-foreground">
									billing@allfix.pk
								</div>
							</div>
							<div className="text-right">
								<div className="text-[18px] font-semibold">Invoice</div>
								<div className="text-[12px] text-muted-foreground">
									{previewInvoice.invoice_number}
								</div>
								<div className="text-[12px] text-muted-foreground">
									{new Date(previewInvoice.created_at).toLocaleDateString()}
								</div>
							</div>
						</div>
						<div className="mt-6 grid grid-cols-2 gap-6">
							<div>
								<div className="cb-label">Bill To</div>
								<div className="mt-1 font-medium">{previewInvoice.client_name}</div>
								<div className="text-[12px] text-muted-foreground">
									{previewInvoice.client_address || ""}
								</div>
							</div>
							<div>
								<div className="cb-label">Service</div>
								<div className="mt-1">{previewInvoice.service_name}</div>
							</div>
						</div>
						{previewWorkers.length > 0 && (
							<div className="mt-4">
								<div className="cb-label">Assigned Workers</div>
								<div className="mt-1 text-[12px]">
									{previewWorkers.map((w: any) => w.name).join(", ")}
								</div>
							</div>
						)}
						<table className="mt-6 w-full">
							<thead>
								<tr className="border-b-2 border-primary text-left">
									<th className="cb-label py-2">Description</th>
									<th className="cb-label py-2 text-right">Amount</th>
								</tr>
							</thead>
							<tbody>
								{previewLineItems.map((it: any, i: number) => (
									<tr key={i} className="border-b border-border">
										<td className="py-2">{it.description}</td>
										<td className="py-2 text-right font-medium">
											{fmt(it.amount)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
						<div className="ml-auto mt-3 w-full max-w-[260px] space-y-1">
							<Row label="Subtotal" value={fmt(Number(previewInvoice.subtotal || 0))} />
							{previewCommissions.length > 0 && (
								<div className="border-t border-dashed border-border pt-1">
									<div className="text-[11px] text-muted-foreground">
										Commissions
									</div>
									{previewCommissions.map((c: any, i: number) => (
										<Row
											key={i}
											label={c.worker_name || "Worker"}
											value={fmt(c.amount)}
										/>
									))}
								</div>
							)}
							<div className="mt-2 flex items-center justify-between rounded-lg bg-subtle px-3 py-2">
								<span className="font-semibold">Total Due</span>
								<span className="text-[18px] font-semibold text-primary">
									{fmt(Number(previewInvoice.total || 0))}
								</span>
							</div>
							{Number(previewInvoice.vendor_commission || 0) > 0 && (
								<>
									<div className="flex items-center justify-between text-warning text-[12px]">
										<span>Vendor Commission ({previewInvoice.vendor_commission}%)</span>
										<span>- {fmt(Number(previewInvoice.total || 0) * Number(previewInvoice.vendor_commission || 0) / 100)}</span>
									</div>
									<div className="flex items-center justify-between text-success text-[12px] font-medium border-t border-border pt-1">
										<span>Net Revenue</span>
										<span>{fmt(Number(previewInvoice.total || 0) * (1 - Number(previewInvoice.vendor_commission || 0) / 100))}</span>
									</div>
								</>
							)}
						</div>
						<div className="mt-8 border-t border-border pt-3 text-[12px] text-muted-foreground">
							{previewInvoice.notes || "Thank you for your business."}
						</div>
					</div>
				</CenteredModal>
			)}
		</div>
	);
};

const Row = ({ label, value }: { label: string; value: string }) => (
	<div className="flex items-center justify-between">
		<span className="text-muted-foreground">{label}</span>
		<span>{value}</span>
	</div>
);

export default Invoices;
