import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export function useVendors(
	page = 1,
	search?: string,
	status?: string,
) {
	return useQuery({
		queryKey: ["admin_vendors", page, search, status],
		queryFn: () => {
			const params = new URLSearchParams({
				page: String(page),
				pageSize: "20",
			});
			if (search) params.append("search", search);
			if (status && status !== "all") params.append("status", status);
			return apiFetch(`/api/admin/vendors?${params.toString()}`);
		},
	});
}

export function useVendor(id: string | null) {
	return useQuery({
		queryKey: ["admin_vendor_detail", id],
		queryFn: () => apiFetch(`/api/admin/vendors/${id}`),
		enabled: !!id && id !== "new",
	});
}

export function useCreateVendor() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (body: Record<string, unknown>) =>
			apiFetch("/api/admin/vendors", {
				method: "POST",
				body: JSON.stringify(body),
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["admin_vendors"] });
			queryClient.invalidateQueries({ queryKey: ["admin_hr_overview"] });
		},
	});
}

export function useUpdateVendor() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ id, ...body }: { id: string } & Record<string, unknown>) =>
			apiFetch(`/api/admin/vendors/${id}`, {
				method: "PUT",
				body: JSON.stringify(body),
			}),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ["admin_vendors"] });
			queryClient.invalidateQueries({
				queryKey: ["admin_vendor_detail", variables.id],
			});
			queryClient.invalidateQueries({ queryKey: ["admin_hr_overview"] });
		},
	});
}

export function useDeleteVendor() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (id: string) =>
			apiFetch(`/api/admin/vendors/${id}`, { method: "DELETE" }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["admin_vendors"] });
			queryClient.invalidateQueries({ queryKey: ["admin_hr_overview"] });
		},
		onError: (err: any) => {
			alert(err.message || "Failed to delete vendor");
		},
	});
}

export function useActiveVendors() {
	return useQuery({
		queryKey: ["admin_vendors_active"],
		queryFn: () => apiFetch("/api/admin/vendors?status=active"),
	});
}
