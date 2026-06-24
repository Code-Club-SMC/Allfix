import { AlertCircle, AlertTriangle, Loader2, Pencil, Plus, Trash2, X, Upload, Check, Minus } from "lucide-react";
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
import { apiFetch, resolveAssetUrl } from "@/lib/api";
import type { TermsAndConditions } from "@/types/api";

const blankForm = () => ({
	name: "",
	description: "",
	parentId: "",
	isSubcategory: false,
	imageUrl: "",
	price: "",
	discountPercentage: "",
	termsAndConditions: {
		includes: [] as string[],
		does_not_include: [] as string[],
		liability_disclaimer: "",
	} as TermsAndConditions,
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

	const [newInclude, setNewInclude] = useState("");
	const [newExclude, setNewExclude] = useState("");

	const isSaving = creating || updating;
	const saveError = (createError || updateError) as Error | null;
	const serviceList = (services || []) as any[];
	const hasCategories = serviceList.some((s: any) => !s.is_subcategory && s.id !== (editId || ""));

	const openAdd = () => {
		setForm(blankForm());
		setEditId(null);
		setShowAdd(true);
		setNewInclude("");
		setNewExclude("");
	};

	const openAddForCategory = (categoryId: string) => {
		setForm({
			...blankForm(),
			parentId: categoryId,
			isSubcategory: true,
		});
		setEditId(null);
		setShowAdd(true);
		setNewInclude("");
		setNewExclude("");
	};

	const openEdit = (s: any) => {
		let tc: TermsAndConditions = {
			includes: [],
			does_not_include: [],
			liability_disclaimer: "",
		};
		if (s.terms_and_conditions) {
			try {
				tc = typeof s.terms_and_conditions === "string"
					? JSON.parse(s.terms_and_conditions)
					: s.terms_and_conditions;
			} catch {
				// ignore parse errors
			}
		}
		setForm({
			name: s.name,
			description: s.description,
			parentId: s.parent_id || "",
			isSubcategory: s.is_subcategory || false,
			imageUrl: s.image_url || "",
			price: s.price || "",
			discountPercentage: s.discount_percentage ? String(s.discount_percentage) : "",
			termsAndConditions: tc,
		});
		setEditId(s.id);
		setShowAdd(true);
		setNewInclude("");
		setNewExclude("");
	};

	const closeForm = () => {
		setShowAdd(false);
		setEditId(null);
		setForm(blankForm());
		setNewInclude("");
		setNewExclude("");
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
			discountPercentage: form.discountPercentage ? parseInt(form.discountPercentage) : 0,
			termsAndConditions: form.termsAndConditions,
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

	const addInclude = () => {
		if (!newInclude.trim()) return;
		setForm((p) => ({
			...p,
			termsAndConditions: {
				...p.termsAndConditions,
				includes: [...p.termsAndConditions.includes, newInclude.trim()],
			},
		}));
		setNewInclude("");
	};

	const removeInclude = (index: number) => {
		setForm((p) => ({
			...p,
			termsAndConditions: {
				...p.termsAndConditions,
				includes: p.termsAndConditions.includes.filter((_, i) => i !== index),
			},
		}));
	};

	const addExclude = () => {
		if (!newExclude.trim()) return;
		setForm((p) => ({
			...p,
			termsAndConditions: {
				...p.termsAndConditions,
				does_not_include: [...p.termsAndConditions.does_not_include, newExclude.trim()],
			},
		}));
		setNewExclude("");
	};

	const removeExclude = (index: number) => {
		setForm((p) => ({
			...p,
			termsAndConditions: {
				...p.termsAndConditions,
				does_not_include: p.termsAndConditions.does_not_include.filter((_, i) => i !== index),
			},
		}));
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
								{editId
									? "Edit Service"
									: form.parentId
										? `Add Service to ${serviceList.find((s: any) => s.id === form.parentId)?.name ?? "Category"}`
										: "New Service"}
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
								{form.parentId ? (
									<>
										<div className="flex h-9 items-center gap-2 rounded-md border border-border bg-subtle px-3 text-[13px]">
											<span className="text-muted-foreground">Adding to:</span>
											<span className="font-medium text-foreground">
												{serviceList.find((s: any) => s.id === form.parentId)?.name ?? "—"}
											</span>
										</div>
										<p className="mt-1 text-[11px] text-muted-foreground">
											This service will be created as a sub-service of the selected category.
										</p>
									</>
								) : (
									<>
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
									</>
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
							<Field label="Discount (%)">
								<TextInput
									type="number"
									value={form.discountPercentage}
									onChange={(e) =>
										setForm((p) => ({ ...p, discountPercentage: e.target.value }))
									}
									placeholder="e.g. 20"
									min="0"
									max="100"
								/>
								<p className="mt-1 text-[11px] text-muted-foreground">
									Show fake discount on customer view (0-100)
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
											src={resolveAssetUrl(form.imageUrl)}
											alt="Preview"
											className="h-full w-full object-cover"
											onError={(e) => {
												const target = e.target as HTMLImageElement;
												target.style.display = "none";
											}}
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

							{/* Terms & Conditions Section */}
							<div className="sm:col-span-2 space-y-4 border-t border-border pt-4 mt-2">
								<h4 className="text-[13px] font-semibold text-foreground">Terms & Conditions</h4>

								{/* Includes */}
								<div>
									<label className="text-[12px] font-medium text-green-700">INCLUDES</label>
									<div className="mt-2 space-y-2">
										{form.termsAndConditions.includes.map((item, index) => (
											<div key={index} className="flex items-center gap-2">
												<Check className="h-4 w-4 text-green-600 flex-shrink-0" />
												<span className="text-[13px] text-foreground flex-1">{item}</span>
												<button
													type="button"
													onClick={() => removeInclude(index)}
													className="text-muted-foreground hover:text-danger"
												>
													<X className="h-3.5 w-3.5" />
												</button>
											</div>
										))}
										<div className="flex gap-2">
											<TextInput
												value={newInclude}
												onChange={(e) => setNewInclude(e.target.value)}
												placeholder="Add item included in service..."
												onKeyDown={(e) => {
													if (e.key === "Enter") {
														e.preventDefault();
														addInclude();
													}
												}}
											/>
											<Button size="sm" variant="outline" onClick={addInclude} type="button">
												<Plus className="h-3.5 w-3.5" />
											</Button>
										</div>
									</div>
								</div>

								{/* Does Not Include */}
								<div>
									<label className="text-[12px] font-medium text-red-600">DOES NOT INCLUDE</label>
									<div className="mt-2 space-y-2">
										{form.termsAndConditions.does_not_include.map((item, index) => (
											<div key={index} className="flex items-center gap-2">
												<Minus className="h-4 w-4 text-red-500 flex-shrink-0" />
												<span className="text-[13px] text-foreground flex-1">{item}</span>
												<button
													type="button"
													onClick={() => removeExclude(index)}
													className="text-muted-foreground hover:text-danger"
												>
													<X className="h-3.5 w-3.5" />
												</button>
											</div>
										))}
										<div className="flex gap-2">
											<TextInput
												value={newExclude}
												onChange={(e) => setNewExclude(e.target.value)}
												placeholder="Add item NOT included in service..."
												onKeyDown={(e) => {
													if (e.key === "Enter") {
														e.preventDefault();
														addExclude();
													}
												}}
											/>
											<Button size="sm" variant="outline" onClick={addExclude} type="button">
												<Plus className="h-3.5 w-3.5" />
											</Button>
										</div>
									</div>
								</div>

								{/* Liability Disclaimer */}
								<div>
									<label className="text-[12px] font-medium text-foreground">LIABILITY DISCLAIMER</label>
									<TextArea
										rows={3}
										value={form.termsAndConditions.liability_disclaimer}
										onChange={(e) =>
											setForm((p) => ({
												...p,
												termsAndConditions: {
													...p.termsAndConditions,
													liability_disclaimer: e.target.value,
												},
											}))
										}
										placeholder="We are not liable for any damage or malfunction to your equipment or property..."
										className="mt-2"
									/>
								</div>
							</div>
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
								<th className="cb-label px-5 py-2.5">Discount</th>
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
												{s.discount_percentage > 0 ? (
													<span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-700">
														{s.discount_percentage}% OFF
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
											{!s.is_subcategory && (
												<button
													onClick={() => openAddForCategory(s.id)}
													className="flex items-center gap-1 text-[12px] font-medium text-primary hover:underline"
												>
													<Plus className="h-3 w-3" />
													Add Service
												</button>
											)}
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
										colSpan={6}
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

			{/* ─ Data Management ── */}
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
