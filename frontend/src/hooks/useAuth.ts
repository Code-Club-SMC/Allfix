import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { AuthResponse, SessionResponse } from "@/types/api";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface LoginParams {
	email: string;
	password: string;
}

export interface RegisterParams extends LoginParams {
	name: string;
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

/**
 * Fetch the current authenticated session.
 * Used to determine if the user is logged in natively via our backend.
 */
export function useSession() {
	return useQuery<SessionResponse>({
		queryKey: ["session"],
		queryFn: () => apiFetch<SessionResponse>("/api/auth/session"),
		retry: false, // Don't keep retrying if unauthorized
	});
}

/**
 * Login mutation.
 * Success sets the HttpOnly cookie and invalidates the session query.
 */
export function useLogin() {
	const queryClient = useQueryClient();

	return useMutation<AuthResponse, Error, LoginParams>({
		mutationFn: (body) =>
			apiFetch<AuthResponse>("/api/auth/sign-in", {
				method: "POST",
				body: JSON.stringify(body),
			}),
		onSuccess: (data) => {
			// Pre-populate the session cache to avoid an extra network roundtrip
			queryClient.setQueryData(["session"], { user: data.user });
		},
	});
}

/**
 * Register mutation (for clients).
 * Success sets token and invalidates session.
 */
export function useRegister() {
	const queryClient = useQueryClient();

	return useMutation<AuthResponse, Error, RegisterParams>({
		mutationFn: (body) =>
			apiFetch<AuthResponse>("/api/auth/sign-up", {
				method: "POST",
				body: JSON.stringify(body),
			}),
		onSuccess: (data) => {
			queryClient.setQueryData(["session"], { user: data.user });
		},
	});
}

/**
 * Logout mutation.
 * Clears the cookie on the server and invalidates the session locally.
 */
export function useLogout() {
	const queryClient = useQueryClient();

	return useMutation<{ message: string }, Error, void>({
		mutationFn: () =>
			apiFetch<{ message: string }>("/api/auth/sign-out", {
				method: "POST",
			}),
		onSuccess: () => {
			// Remove session data entirely
			queryClient.removeQueries({ queryKey: ["session"] });
			// We might want to re-route here in specific implementations
		},
	});
}
