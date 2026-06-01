import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type {
	CreateRequestBody,
	Paginated,
	RequestDetailResponse,
	ServiceRequest,
} from "@/types/api";

/**
 * Hook to fetch paginated requests for the logged-in client.
 * Calls GET /api/requests?page=&pageSize=
 */
export function useClientRequests(page = 1, pageSize = 20) {
	return useQuery<Paginated<ServiceRequest>>({
		queryKey: ["clientRequests", { page, pageSize }],
		queryFn: () =>
			apiFetch<Paginated<ServiceRequest>>(
				`/api/requests?page=${page}&pageSize=${pageSize}`,
			),
	});
}

/**
 * Hook to fetch details of a specific request for the logged-in client.
 * Calls GET /api/requests/{id}
 */
export function useClientRequestDetail(id: string | null) {
	return useQuery<RequestDetailResponse>({
		queryKey: ["clientRequest", id],
		queryFn: () => apiFetch<RequestDetailResponse>(`/api/requests/${id}`),
		enabled: !!id,
	});
}

/**
 * Hook to submit a new service request.
 * Calls POST /api/requests
 */
export function useCreateRequest() {
	const queryClient = useQueryClient();

	return useMutation<ServiceRequest, Error, CreateRequestBody>({
		mutationFn: (body) =>
			apiFetch<ServiceRequest>("/api/requests", {
				method: "POST",
				body: JSON.stringify(body),
			}),
		onSuccess: () => {
			// Invalidate the list so it refetches next time it's viewed
			queryClient.invalidateQueries({ queryKey: ["clientRequests"] });
		},
	});
}
