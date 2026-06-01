import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { Service, ServiceWithParent } from "@/types/api";

/** GET /api/services — public, no auth required */
export function useServices() {
	return useQuery<Service[]>({
		queryKey: ["services"],
		queryFn: () => apiFetch<Service[]>("/api/services"),
	});
}

/** GET /api/admin/services/hierarchical — admin only */
export function useServicesHierarchical() {
	return useQuery<ServiceWithParent[]>({
		queryKey: ["services", "hierarchical"],
		queryFn: () => apiFetch<ServiceWithParent[]>("/api/admin/services/hierarchical"),
	});
}

/** GET /api/admin/services/categories — admin only */
export function useServiceCategories() {
	return useQuery<Service[]>({
		queryKey: ["services", "categories"],
		queryFn: () => apiFetch<Service[]>("/api/admin/services/categories"),
	});
}

/** POST /api/admin/services */
export function useCreateService() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (body: {
			name: string;
			description: string;
			icon: string;
			parentId?: string;
			isSubcategory?: boolean;
		}) =>
			apiFetch<Service>("/api/admin/services", {
				method: "POST",
				body: JSON.stringify(body),
			}),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["services"] });
			qc.invalidateQueries({ queryKey: ["services", "hierarchical"] });
			qc.invalidateQueries({ queryKey: ["services", "categories"] });
		},
	});
}

/** PATCH /api/admin/services/:id */
export function useUpdateService() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({
			id,
			...body
		}: {
			id: string;
			name?: string;
			description?: string;
			icon?: string;
			parentId?: string;
			isSubcategory?: boolean;
		}) =>
			apiFetch<Service>(`/api/admin/services/${id}`, {
				method: "PATCH",
				body: JSON.stringify(body),
			}),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["services"] });
			qc.invalidateQueries({ queryKey: ["services", "hierarchical"] });
			qc.invalidateQueries({ queryKey: ["services", "categories"] });
		},
	});
}

/** DELETE /api/admin/services/:id */
export function useDeleteService() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (id: string) =>
			apiFetch(`/api/admin/services/${id}`, { method: "DELETE" }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["services"] });
			qc.invalidateQueries({ queryKey: ["services", "hierarchical"] });
			qc.invalidateQueries({ queryKey: ["services", "categories"] });
		},
	});
}
