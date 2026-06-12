/**
 * TypeScript types that mirror the Go/sqlc models returned by the Allfix backend.
 * Field names match the `json:` tags in the Go structs (camelCase from sqlc emit_json_tags).
 */

// ─── Services ─────────────────────────────────────────────────────────────────
export interface Service {
	id: string;
	name: string;
	description: string;
	/** Lucide icon name (lowercase, e.g. "zap", "droplets") */
	icon: string;
	created_at: string;
	parent_id?: string | null;
	is_subcategory?: boolean;
	image_url?: string | null;
	price?: string | null;
	discount_percentage?: number | null;
	rating?: string | null;
	review_count?: number | null;
}

export interface CategoryWithCount extends Service {
	sub_service_count: number;
}

export interface CategoryDetail {
	category: CategoryWithCount;
	services: Service[];
}

// ─── Service Requests ─────────────────────────────────────────────────────────
export type RequestStatus =
	| "pending"
	| "assigned"
	| "in_progress"
	| "completed"
	| "invoiced";

export type RequestUrgency = "standard" | "urgent";

/** Matches the sqlc-generated row for ListRequestsByClient */
export interface ServiceRequest {
	id: string;
	request_number: string;
	client_id: string;
	service_id: string;
	service_name: string; // joined from services table
	service_count?: number;
	service_summary?: string;
	description: string;
	preferred_date: string; // ISO date string
	preferred_time: string;
	urgency: RequestUrgency;
	full_name: string;
	phone: string;
	email: string;
	address: string;
	city: string;
	area: string;
	status: RequestStatus;
	assigned_worker_id: string | null;
	internal_notes: string | null;
	created_at: string;
	updated_at: string;
}

/** Matches GetRequestByID response (includes worker info) */
export interface ServiceRequestDetail extends ServiceRequest {
	client_name: string;
	worker_name: string | null;
	worker_phone: string | null;
	vendor_id: string | null;
	vendor_name: string | null;
	vendor_phone: string | null;
	vendor_commission_percentage: number | null;
}

export interface RequestImage {
	id: string;
	request_id: string;
	url: string;
	created_at: string;
}

export interface RequestServiceItem {
	id: string;
	request_id: string;
	service_id: string;
	service_name: string;
	service_price?: string | null;
	created_at: string;
}

export interface RequestDetailResponse {
	request: ServiceRequestDetail;
	images: RequestImage[];
	services?: RequestServiceItem[];
}

// ─── Paginated wrapper ─────────────────────────────────────────────────────────
export interface Paginated<T> {
	data: T[];
	total: number;
	page: number;
	pageSize: number;
	pageCount: number;
}

// ─── Create Request body ───────────────────────────────────────────────────────
export interface CreateRequestBody {
	serviceIds: string[];
	description: string;
	preferredDate: string; // "YYYY-MM-DD"
	preferredTime: string; // "HH:MM"
	urgency: RequestUrgency;
	fullName: string;
	phone: string;
	email: string;
	address: string;
	city: string;
	area: string;
	imageUrls?: string[];
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export interface User {
	id: string;
	name: string;
	email: string;
	role: "admin" | "client";
}

export interface AuthResponse {
	token: string;
	user: User;
}

export interface SessionResponse {
	user: User;
}

// ─── Invoices ─────────────────────────────────────────────────────────────────
export interface Invoice {
	id: string;
	invoice_number: string;
	client_id: string;
	client_name: string;
	client_address: string | null;
	client_phone: string | null;
	service_name: string;
	service_description: string | null;
	request_id: string | null;
	subtotal: number;
	total: number;
	vendor_commission: number;
	notes: string | null;
	status: string;
	created_at: string;
	updated_at: string;
}

export interface InvoiceLineItem {
	id: string;
	invoice_id: string;
	description: string;
	quantity: number;
	rate: number;
	amount: number;
	created_at: string;
}

export interface InvoiceCommission {
	id: string;
	invoice_id: string;
	worker_id: string;
	worker_name: string;
	amount: number;
	created_by: string;
	created_at: string;
}

export interface InvoiceDetailResponse {
	invoice: Invoice;
	lineItems: InvoiceLineItem[];
	commissions: InvoiceCommission[];
	workers?: any[];
}

// ─── Service Sub-Categories ───────────────────────────────────────────────────
export interface ServiceWithParent extends Service {
	parent_id: string | null;
	parent_name: string | null;
	is_subcategory: boolean;
}

// ─── Worker Advances ───────────────────────────────────────────────────────────
export interface WorkerAdvance {
	id: string;
	worker_id: string;
	worker_name?: string;
	amount: number;
	reason: string | null;
	date_given: string;
	total_installments: number;
	installment_amount: number;
	remaining_amount: number;
	status: "active" | "paused" | "paid_off";
	created_at: string;
}

export interface AdvanceDeduction {
	id: string;
	advance_id: string;
	payroll_id: string;
	amount_deducted: number;
	deducted_at: string;
	worker_id?: string;
	reason?: string;
}

// ─── System Account ────────────────────────────────────────────────────────────
export interface SystemAccount {
	id: string;
	name: string;
	current_balance: number;
	created_at: string;
}

export interface AccountTransaction {
	id: string;
	account_id: string;
	transaction_type: string;
	amount: number;
	description: string;
	reference_type: string | null;
	reference_id: string | null;
	created_at: string;
}

// ─── Salary Slip ───────────────────────────────────────────────────────────────
export interface CommissionDetail {
	amount: number;
	invoice_id: string;
	invoice_number: string;
	invoice_date: string;
}

export interface SalarySlipResponse {
	workerName: string;
	month: number;
	year: number;
	baseAmount: string;
	commissionPaidThisMonth: string;
	advanceDeducted: string;
	netPayable: string;
	status: string;
	commissions: CommissionDetail[];
	advanceDeductions: AdvanceDeduction[];
}
