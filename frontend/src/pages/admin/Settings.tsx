import { AlertCircle, AlertTriangle, Loader2, Pencil, Plus, Trash2, X, Upload } from "lucide-react";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { Button, Field, TextArea, TextInput } from "@/components/cb/Form";
import { PageHeader } from "@/components/cb/PageHeader";
import { Card } from "@/components/cb/Tabs";
import {
	useCreateService,
	useDeleteService,
	useServicesHierarchical,
	useUpdateService,
} from "@/hooks/useServices";
import { useClearData } from "@/hooks/useAdmin";
import { apiFetch } from "@/lib/api";

const blankForm = () => ({
	name: "",
	description: "",
	parentId: "",
	isSubcategory: false,
	imageUrl: "",
	price: "",
});

const Settings = () => {
	const { data: services, isLoading, isError } = useServicesHierarchical();

	const {
		mutate: createService,
		isPending: creating,
		error: createError,
	} = useCreateService();
	const {
		mutate: updateService,
		isPending: updating,
		error: updateError,
	} = useUpdateService();
	const { mutate: deleteService, isPending: deleting } = useDeleteService();
	const { mutate: clearData, isPending: isClearing } = useClearData();

	const [showAdd, setShowAdd] = useState(false);
	const [editId, setEditId] = useState<string | null>(null);
	const [form, setForm] = useState(blankForm());
	const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const isSaving = creating || updating;
	const saveError = (createError || updateError) as Error | null;
	const serviceList = (services || []) as any[];
	const hasCategories = serviceList.some((s: any) => !s.is_subcategory && s.id !== (editId || ""));

	const openAdd = () => {
		setForm(blankForm());
		setEditId(null);
		setShowAdd(true);
	};

	const openEdit = (s: any) => {
		setForm({
			name: s.name,
			description: s.description,
			parentId: s.parent_id || "",
			isSubcategory: s.is_subcategory || false,
			imageUrl: s.image_url || "",
			price: s.price || "",
		});
		setEditId(s.id);
		setShowAdd(true);
	};

	const closeForm = () => {
		setShowAdd(false);
		setEditId(null);
		setForm(blankForm());
	};

	const handleSave = () => {
		if (!form.name.trim() || !form.description.trim()) return;
		const payload: any = {
			name: form.name,
			description: form.description,
			parentId: form.parentId || undefined,
			isSubcategory: !!form.parentId,
			imageUrl: form.imageUrl || null,
			price: form.price ? String(form.price) : null,
		};
		if (editId) {
			updateService({ id: editId, ...payload }, { onSuccess: closeForm });
		} else {
			createService(payload, { onSuccess: closeForm });
		}
	};

	const handleDelete = (id: string) => {
		deleteService(id, { onSuccess: () => setDeleteConfirm(null) });
	};

	return (
		<div className="mx-auto max-w-[900px] space-y-8">
			<PageHeader
				title="Settings"
				subtitle="Manage services and system configuration."
			/>

			<Card>
				<div className="flex items-center justify-between border-b border-border px-5 py-3">
					<div>
						<h2 className="cb-section">Services</h2>
						<p className="mt-0.5 text-[12px] text-muted-foreground">
							{serviceList.length} service{serviceList.length !== 1 ? "s" : ""}{" "}
							available to clients
						</p>
					</div>
					<Button size="sm" onClick={openAdd}>
						<Plus className="h-3.5 w-3.5" />
						Add Service
					</Button>
				</div>

				{showAdd && (
					<div className="border-b border-border bg-subtle/40 px-5 py-4">
						<div className="mb-3 flex items-center justify-between">
							<h3 className="text-[13px] font-normal">
								{editId ? "Edit Service" : "New Service"}
							</h3>
							<button
								onClick={closeForm}
								className="text-muted-foreground hover:text-foreground"
							>
								<X className="h-4 w-4" />
							</button>
						</div>

						{saveError && (
							<div className="mb-3 flex items-center gap-2 bg-danger/10 px-3 py-2 text-[12px] text-danger">
								<AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
								{saveError.message || "Failed to save service."}
							</div>
						)}

						<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
							<Field label="Name">
								<TextInput
									value={form.name}
									onChange={(e) =>
										setForm((p) => ({ ...p, name: e.target.value }))
									}
									placeholder={form.isSubcategory ? "e.g. Fan Installation" : "e.g. Electrical"}
									autoFocus
								/>
							</Field>
							<Field label="Parent Category">
								<select
									className="h-9 w-full rounded-md border border-border bg-background px-3 text-[13px] disabled:opacity-50 disabled:cursor-not-allowed"
									value={form.parentId}
									onChange={(e) =>
										setForm((p) => ({ ...p, parentId: e.target.value, isSubcategory: !!e.target.value }))
									}
									disabled={!hasCategories}
								>
									<option value="">{hasCategories ? "Top-level category" : "No categories yet"}</option>
									{serviceList
										.filter((s: any) => !s.is_subcategory && s.id !== editId)
										.map((s: any) => (
											<option key={s.id} value={s.id}>{s.name}</option>
										))}
									</select>
								{!hasCategories ? (
									<p className="mt-1 text-[11px] text-warning">
										Create a top-level category first, then add services under it.
									</p>
								) : (
									<p className="mt-1 text-[11px] text-muted-foreground">
										Select a parent to make this a sub-service
									</p>
								)}
							</Field>
							<Field label="Price (Rs)">
								<TextInput
									type="number"
									value={form.price}
									onChange={(e) =>
										setForm((p) => ({ ...p, price: e.target.value }))
									}
									placeholder="e.g. 1000"
								/>
								<p className="mt-1 text-[11px] text-muted-foreground">
									Leave empty if pricing varies
								</p>
							</Field>
							<Field label="Description" className="sm:col-span-2">
								<TextArea
									rows={2}
									value={form.description}
									onChange={(e) =>
										setForm((p) => ({ ...p, description: e.target.value }))
									}
									placeholder="Brief description shown to clients"
								/>
							</Field>
							<Field label="Service Image" className="sm:col-span-2">
								<div className="space-y-3">
									{form.imageUrl && (
										<div className="relative aspect-video w-full max-w-xs overflow-hidden rounded-lg border border-border">
											<img
												src={form.imageUrl}
												alt="Preview"
												className="h-full w-full object-cover"
											/>
											<button
												type="button"
												onClick={() => setForm((p) => ({ ...p, imageUrl: "" }))}
												className="absolute top-2 right-2 rounded-full bg-black/50 p-1 text-white hover:bg-black/70"
											>
												<X className="h-4 w-4" />
											</button>
										</div>
									)}
									<div className="flex items-center gap-3">
										<label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-subtle">
											<Upload className="h-4 w-4" />
											Upload Image
										<input
											ref={fileInputRef}
											type="file"
											accept="image/*"
											className="hidden"
											onChange={async (e) => {
												const file = e.target.files?.[0];
												if (!file) return;

												const formData = new FormData();
												formData.append("file", file);

												try {
													const result = await apiFetch<{ url: string }>("/api/admin/upload", {
														method: "POST",
														body: formData,
													});
													setForm((p) => ({ ...p, imageUrl: result.url }));
													toast.success("Image uploaded successfully");
												} catch (err) {
													toast.error("Failed to upload image");
												} finally {
													if (fileInputRef.current) {
														fileInputRef.current.value = "";
													}
												}
											}}
										/>
										</label>
										{form.imageUrl && (
											<span className="text-xs text-muted-foreground">
												Image attached
											</span>
										)}
									</div>
									<p className="text-[11px] text-muted-foreground">
										Upload a service image (max 10MB). Supported: JPG, PNG, GIF, WebP
									</p>
								</div>
							</Field>
						</div>

						<div className="mt-4 flex items-center justify-end gap-2">
							<Button variant="outline" size="sm" onClick={closeForm}>
								Cancel
							</Button>
							<Button
								size="sm"
								disabled={
									isSaving || !form.name.trim() || !form.description.trim()
								}
								onClick={handleSave}
							>
								{isSaving
									? "Saving…"
									: editId
										? "Save Changes"
										: "Create Service"}
							</Button>
						</div>
					</div>
				)}

				{isLoading ? (
					<div className="flex h-32 items-center justify-center">
						<Loader2 className="h-5 w-5 animate-spin text-primary" />
					</div>
				) : isError ? (
					<div className="flex h-32 items-center justify-center gap-2 text-[13px] text-danger">
						<AlertCircle className="h-4 w-4" />
						Failed to load services.
					</div>
				) : (
					<table className="w-full">
						<thead>
							<tr className="border-b border-border text-left">
								<th className="cb-label px-5 py-2.5">Name</th>
								<th className="cb-label px-5 py-2.5">Description</th>
								<th className="cb-label px-5 py-2.5">Price</th>
								<th className="cb-label px-5 py-2.5">Type</th>
								<th className="cb-label px-5 py-2.5 text-right">Actions</th>
							</tr>
						</thead>
						<tbody>
							{serviceList.map((s: any) => (
								<tr
									key={s.id}
									className="border-b border-border/60 text-[13px] last:border-0 hover:bg-subtle"
								>
											<td className="px-5 py-3 font-medium">
												{s.is_subcategory ? (
													<span className="ml-4 text-muted-foreground">↳ {s.name}</span>
												) : (
													s.name
												)}
											</td>
											<td className="max-w-[200px] truncate px-5 py-3 text-muted-foreground">
												{s.description}
											</td>
											<td className="px-5 py-3">
												{s.price ? (
													<span className="font-medium text-foreground">
														Rs {parseFloat(s.price).toLocaleString()}
													</span>
												) : (
													<span className="text-muted-foreground">—</span>
												)}
											</td>
											<td className="px-5 py-3">
												{s.is_subcategory ? (
													<span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">Service</span>
												) : (
													<span className="rounded-full bg-subtle px-2 py-0.5 text-[11px] font-medium text-muted-foreground">Category</span>
												)}
											</td>
									<td className="px-5 py-3">
										<div className="flex items-center justify-end gap-3">
											<button
												onClick={() => openEdit(s)}
												className="flex items-center gap-1 text-[12px] font-medium text-primary hover:underline"
											>
												<Pencil className="h-3 w-3" />
												Edit
											</button>

											{deleteConfirm === s.id ? (
												<div className="flex items-center gap-1.5">
													<span className="text-[11px] text-danger">
														Delete?
													</span>
													<button
														disabled={deleting}
														onClick={() => handleDelete(s.id)}
														className="text-[11px] font-normal text-danger hover:underline disabled:opacity-50"
													>
														Yes
													</button>
													<button
														onClick={() => setDeleteConfirm(null)}
														className="text-[11px] text-muted-foreground hover:underline"
													>
														No
													</button>
												</div>
											) : (
												<button
													onClick={() => setDeleteConfirm(s.id)}
													className="flex items-center gap-1 text-[12px] text-muted-foreground hover:text-danger"
												>
													<Trash2 className="h-3 w-3" />
													Delete
												</button>
											)}
										</div>
									</td>
								</tr>
							))}

							{serviceList.length === 0 && (
								<tr>
									<td
										colSpan={5}
										className="py-12 text-center text-[13px] text-muted-foreground"
									>
										No services yet. Start by creating a category, then add services under it.
									</td>
								</tr>
							)}
						</tbody>
					</table>
				)}
			</Card>

			{/* ── Data Management ── */}
			<Card className="mt-6">
				<div className="px-5 py-4">
					<h2 className="text-[14px] font-semibold">Data Management</h2>
					<p className="mt-1 text-[12px] text-muted-foreground">
						Clear the entire database.
					</p>
					<div className="mt-4 flex flex-wrap gap-3">
						<Button
							size="sm"
							variant="outline"
							className="text-destructive border-destructive/30 hover:bg-destructive/10"
							disabled={isClearing}
							onClick={() => {
							if (confirm("⚠️ This will DELETE all data (clients, requests, invoices, etc.). Continue?")) {
								clearData(undefined, { onSuccess: () => toast.success("Database cleared!") });
							}
							}}
						>
							{isClearing ? (
								<Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
							) : (
								<AlertTriangle className="mr-1.5 h-3.5 w-3.5" />
							)}
							Clear All Data
						</Button>
					</div>
				</div>
			</Card>
		</div>
	);
};

export default Settings;
