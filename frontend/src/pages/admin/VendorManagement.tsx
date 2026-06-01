import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Loader2, Plus, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/cb/PageHeader";
import { Card } from "@/components/cb/Tabs";
import { Button, Select, TextInput, TextArea, Field } from "@/components/cb/Form";
import { CenteredModal } from "@/components/cb/Overlays";
import {
	useVendors,
	useVendor,
	useCreateVendor,
	useUpdateVendor,
	useDeleteVendor,
} from "@/hooks/useVendors";
import type { VendorStatus } from "@/lib/api";

const VendorManagement = () => {
	const navigate = useNavigate();
	const [q, setQ] = useState("");
	const [searchInput, setSearchInput] = useState("");
	const [status, setStatus] = useState("all");
	const [page, setPage] = useState(1);
	const [openId, setOpenId] = useState<string | null>(null);

	const { data, isLoading } = useVendors(page, q, status);
	const { data: vendorDetail, isLoading: isLoadingDetail } = useVendor(openId);
	const { mutate: createVendor, isPending: isCreating } = useCreateVendor();
	const { mutate: updateVendor, isPending: isUpdating } = useUpdateVendor();
	const { mutate: deleteVendor, isPending: isDeleting } = useDeleteVendor();

	const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
	const [confirmText, setConfirmText] = useState("");
	const canConfirmDelete = confirmText.trim() === deleteTarget?.name;

	const rows = data?.data || [];
	const pages = data?.pageCount || 1;
	const total = data?.total || 0;

	const vendor = vendorDetail;
	const isNewVendor = openId === "new";

	const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") {
			setQ(searchInput);
			setPage(1);
		}
	};

	const handleDeleteConfirm = () => {
		if (!deleteTarget || !canConfirmDelete) return;
		deleteVendor(deleteTarget.id, {
			onSuccess: () => {
				setDeleteTarget(null);
				setConfirmText("");
			},
			onError: (err: Error) => {
				toast.error(err.message || "Failed to delete vendor");
			},
		});
	};

	const handleSave = () => {
		const nameInput = document.getElementById("vendorName") as HTMLInputElement;
		const contactNameInput = document.getElementById("vendorContactName") as HTMLInputElement;
		const contactPhoneInput = document.getElementById("vendorContactPhone") as HTMLInputElement;
		const contactEmailInput = document.getElementById("vendorContactEmail") as HTMLInputElement;
		const servicesInput = document.getElementById("vendorServices") as HTMLInputElement;
		const statusSelect = document.getElementById("vendorStatus") as HTMLSelectElement;
		const notesArea = document.getElementById("vendorNotes") as HTMLTextAreaElement;

		const name = nameInput.value.trim();
		const contactPhone = contactPhoneInput.value.trim();

		if (!name || !contactPhone) {
			alert("Name and contact phone are required");
			return;
		}

		const servicesOffered = servicesInput.value
			.split(",")
			.map((s) => s.trim())
			.filter((s) => s.length > 0);

		const body = {
			name,
			contactName: contactNameInput.value.trim() || undefined,
			contactPhone,
			contactEmail: contactEmailInput.value.trim() || undefined,
			servicesOffered,
			status: statusSelect.value as VendorStatus,
			notes: notesArea.value.trim() || undefined,
		};

		if (isNewVendor) {
			createVendor(body, {
				onSuccess: () => setOpenId(null),
			});
		} else if (openId) {
			updateVendor(
				{ id: openId, ...body },
				{
					onSuccess: () => setOpenId(null),
				},
			);
		}
	};

	return (
		<div className="mx-auto max-w-[1400px]">
			<PageHeader
				title="Vendor Management"
				subtitle={`${total} vendor${total === 1 ? "" : "s"}`}
			/>

			<Card>
				<div className="flex flex-wrap items-center gap-2 border-b border-border px-3.5 py-2.5">
					<div className="relative">
						<Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[hsl(var(--text-tertiary))]" />
						<TextInput
							value={searchInput}
							onChange={(e) => setSearchInput(e.target.value)}
							onKeyDown={handleSearch}
							placeholder="Search by name (Press Enter)…"
							className="h-8 w-[270px] pl-8 text-[12px]"
						/>
					</div>
					<div className="ml-auto flex flex-wrap items-center gap-2">
						<Select
							value={status}
							onChange={(e) => {
								setStatus(e.target.value);
								setPage(1);
							}}
							className="h-8 w-[140px] text-[12px]"
						>
							<option value="all">All status</option>
							<option value="active">Active</option>
							<option value="inactive">Inactive</option>
						</Select>
						<Button
							size="sm"
							onClick={() => setOpenId("new")}
							className="h-8 gap-1.5"
						>
							<Plus className="h-3.5 w-3.5" />
							Create Vendor
						</Button>
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
								{[
									"Name",
									"Contact Phone",
									"Contact Email",
									"Services Offered",
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
							{rows.map((v: any) => (
								<tr
									key={v.id}
									className="border-b border-border/60 text-[12.5px] transition-colors last:border-0 hover:bg-subtle/70"
								>
									<td className="px-3 py-2 font-medium">{v.name}</td>
									<td className="px-3 py-2 text-muted-foreground">
										{v.contact_phone}
									</td>
									<td className="px-3 py-2 text-muted-foreground">
										{v.contact_email || "—"}
									</td>
									<td className="px-3 py-2">
										{v.services_offered && v.services_offered.length > 0 ? (
											<div className="flex items-center gap-2">
												<span className="max-w-[190px] truncate text-foreground">
													{v.services_offered[0]}
												</span>
												{v.services_offered.length > 1 && (
													<span className="inline-flex shrink-0 items-center rounded-full border border-border bg-subtle px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
														+{v.services_offered.length - 1} more
													</span>
												)}
											</div>
										) : (
											<span className="text-muted-foreground">—</span>
										)}
									</td>
									<td className="px-3 py-2">
										<span
											className={
												v.status === "active"
													? "inline-flex items-center rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success"
													: "inline-flex items-center rounded-full border border-border bg-subtle px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
											}
										>
											{v.status}
										</span>
									</td>
									<td className="px-3 py-2">
										<div className="flex items-center gap-3">
											<button
												onClick={() => navigate(`/admin/vendors/${v.id}`)}
												className="text-[12px] font-medium text-primary hover:underline"
												title="View profile"
											>
												<Eye className="h-3.5 w-3.5" />
											</button>
											<button
												onClick={() => setOpenId(v.id)}
												className="text-[12px] font-medium text-primary hover:underline"
											>
												Edit
											</button>
											<button
												onClick={() => setDeleteTarget({ id: v.id, name: v.name })}
												className="text-[12px] font-medium text-destructive hover:underline"
											>
												Delete
											</button>
										</div>
									</td>
								</tr>
							))}
							{!isLoading && rows.length === 0 && (
								<tr>
									<td
										colSpan={6}
										className="px-4 py-10 text-center text-[12px] text-muted-foreground"
									>
										No vendors match these filters.
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
					<div className="flex items-center gap-1">
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

			<CenteredModal
				open={!!openId}
				onClose={() => setOpenId(null)}
				title={isNewVendor ? "Create Vendor" : "Edit Vendor"}
				width={640}
				footer={
					<>
						<Button variant="outline" onClick={() => setOpenId(null)}>
							Cancel
						</Button>
						<Button
							disabled={isCreating || isUpdating}
							onClick={handleSave}
						>
							{isCreating || isUpdating ? "Saving..." : "Save"}
						</Button>
					</>
				}
			>
				{isLoadingDetail && !isNewVendor && (
					<div className="py-12 text-center">
						<Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
					</div>
				)}
				{(isNewVendor || (!isLoadingDetail && vendor)) && (
					<div className="space-y-4">
						<Field label="Name" required>
							<TextInput
								id="vendorName"
								placeholder="ABC Plumbing Services"
								defaultValue={vendor?.name || ""}
							/>
						</Field>

						<Field label="Contact Name">
							<TextInput
								id="vendorContactName"
								placeholder="John Doe"
								defaultValue={vendor?.contact_name || ""}
							/>
						</Field>

						<Field label="Contact Phone" required>
							<TextInput
								id="vendorContactPhone"
								placeholder="+92-300-1234567"
								defaultValue={vendor?.contact_phone || ""}
							/>
						</Field>

						<Field label="Contact Email">
							<TextInput
								id="vendorContactEmail"
								type="email"
								placeholder="john@abcplumbing.com"
								defaultValue={vendor?.contact_email || ""}
							/>
						</Field>

						<Field label="Services Offered">
							<TextInput
								id="vendorServices"
								placeholder="plumbing, pipe-fitting, repairs"
								defaultValue={vendor?.services_offered?.join(", ") || ""}
							/>
							<span className="text-xs text-muted-foreground">
								Comma-separated list of services
							</span>
						</Field>

						<Field label="Status">
							<Select id="vendorStatus" defaultValue={vendor?.status || "active"}>
								<option value="active">Active</option>
								<option value="inactive">Inactive</option>
							</Select>
						</Field>

						<Field label="Notes">
							<TextArea
								id="vendorNotes"
								rows={3}
								placeholder="Additional notes about this vendor…"
								defaultValue={vendor?.notes || ""}
							/>
						</Field>
					</div>
				)}
			</CenteredModal>

			{/* ─ DELETE CONFIRMATION MODAL ── */}
			<CenteredModal
				open={!!deleteTarget}
				onClose={() => {
					setDeleteTarget(null);
					setConfirmText("");
				}}
				title="Delete Vendor"
				width={480}
				footer={
					<>
						<Button
							variant="outline"
							onClick={() => {
								setDeleteTarget(null);
								setConfirmText("");
							}}
							disabled={isDeleting}
						>
							Cancel
						</Button>
						<Button
							variant="destructive"
							disabled={!canConfirmDelete || isDeleting}
							onClick={handleDeleteConfirm}
						>
							{isDeleting ? "Deleting…" : "Delete Vendor"}
						</Button>
					</>
				}
			>
				<div className="space-y-4 text-[13px]">
					<div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2.5">
						<p className="font-medium text-destructive">The vendor will be marked as inactive.</p>
						<p className="text-muted-foreground">
							This removes the vendor from active listings. Data remains recoverable.
						</p>
					</div>
					<p>
						To confirm, type the vendor name exactly as shown below:
					</p>
					<div className="rounded-md bg-subtle px-3 py-2 font-mono text-[12px]">
						{deleteTarget?.name}
					</div>
					<Field label="Type vendor name to confirm">
						<TextInput
							value={confirmText}
							onChange={(e) => setConfirmText(e.target.value)}
							placeholder="Enter vendor name…"
							onKeyDown={(e) => {
								if (e.key === "Enter" && canConfirmDelete) handleDeleteConfirm();
							}}
						/>
					</Field>
					{confirmText && !canConfirmDelete && (
						<p className="text-[12px] text-destructive">
							Name does not match. Please type it exactly.
						</p>
					)}
				</div>
			</CenteredModal>
		</div>
	);
};

export default VendorManagement;
