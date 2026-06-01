/**
 * Allfix API client
 * The backend sets `allfix_token` as an HttpOnly cookie on login.
 * All requests use `credentials: "include"` so the cookie is sent automatically.
 */

const BASE_URL = import.meta.env.VITE_API_URL ?? "";

export class ApiError extends Error {
	constructor(
		public readonly status: number,
		message: string,
	) {
		super(message);
		this.name = "ApiError";
	}
}

export async function apiFetch<T>(
	path: string,
	options?: RequestInit,
): Promise<T> {
	const headers = new Headers(options?.headers);
	if (!headers.has("Content-Type") && typeof options?.body === "string") {
		headers.set("Content-Type", "application/json");
	}

	const res = await fetch(`${BASE_URL}${path}`, {
		...options,
		credentials: "include",
		headers,
	});

	if (!res.ok) {
		const body = await res.json().catch(() => ({ error: "Request failed" }));
		throw new ApiError(res.status, body.error ?? `HTTP ${res.status}`);
	}

	// 204 No Content — return undefined cast as T
	if (res.status === 204) return undefined as T;

	return res.json() as Promise<T>;
}

// ─── Vendor Types ─────────────────────────────────────────────────────────────

export type VendorStatus = "active" | "inactive";

/**
 * Vendor entity representing a third-party service provider.
 * Matches the Go Vendor model with snake_case JSON tags.
 */
export interface Vendor {
	id: string;
	name: string;
	contact_name: string | null;
	contact_phone: string;
	contact_email: string | null;
	services_offered: string[];
	status: VendorStatus;
	notes: string | null;
	created_at: string;
	updated_at: string;
}

/**
 * Request body for creating a new vendor.
 * Uses camelCase for frontend, converted to snake_case by backend.
 */
export interface CreateVendorRequest {
	name: string;
	contactName?: string;
	contactPhone: string;
	contactEmail?: string;
	servicesOffered: string[];
	notes?: string;
}

/**
 * Request body for updating a vendor.
 * Uses camelCase for frontend, converted to snake_case by backend.
 */
export interface UpdateVendorRequest {
	name?: string;
	contactName?: string;
	contactPhone?: string;
	contactEmail?: string;
	servicesOffered?: string[];
	status?: VendorStatus;
	notes?: string;
}

/**
 * Vendor assignment details for a service request.
 * Matches the RequestVendor model with snake_case JSON tags.
 */
export interface RequestVendor {
	id: string;
	request_id: string;
	vendor_id: string;
	commission_percentage: number;
	created_at: string;
	updated_at: string;
}

/**
 * Vendor information included in service request details.
 * Subset of Vendor fields with commission percentage from RequestVendor.
 */
export interface VendorInfo {
	id: string;
	name: string;
	contact_phone: string;
	commission_percentage: number;
}

/**
 * Request body for assigning a vendor to a service request.
 * Uses snake_case to match backend expectations.
 */
export interface AssignVendorRequest {
	vendor_id: string;
	commission_percentage: number;
}

/**
 * Request body for updating vendor commission percentage.
 * Uses snake_case to match backend expectations.
 */
export interface UpdateVendorCommissionRequest {
	commission_percentage: number;
}

/**
 * Extended service request with vendor information.
 * Extends ServiceRequest with vendor_id and optional vendor details.
 */
export interface ServiceRequestWithVendor {
	id: string;
	request_number: string;
	status: string;
	vendor_id: string | null;
	vendor?: VendorInfo;
	assigned_worker_id: string | null;
	// ... other ServiceRequest fields
}
