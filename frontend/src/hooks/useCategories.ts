import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { CategoryWithCount, CategoryDetail } from "@/types/api";

/** GET /api/services/categories — public, no auth required */
export function useServiceCategories() {
	return useQuery<CategoryWithCount[]>({
		queryKey: ["serviceCategories"],
		queryFn: () => apiFetch<CategoryWithCount[]>("/api/services/categories"),
	});
}

/** GET /api/services/category/{id} — public, no auth required */
export function useCategoryDetail(id: string | null) {
	return useQuery<CategoryDetail>({
		queryKey: ["categoryDetail", id],
		queryFn: () => apiFetch<CategoryDetail>(`/api/services/category/${id}`),
		enabled: !!id,
	});
}
