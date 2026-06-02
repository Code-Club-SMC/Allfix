import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type {
	RequestDetailResponse,
	InvoiceDetailResponse,
	WorkerAdvance,
	SystemAccount,
	AccountTransaction,
	SalarySlipResponse,
	Paginated,
} from "@/types/api";

export function useAdminDashboard(from?: string, to?: string) {
	return useQuery({
		queryKey: ["admin_dashboard", from, to],
		queryFn: () => {
			const params = new URLSearchParams();
			if (from) params.append("from", from);
			if (to) params.append("to", to);
			const query = params.toString();
			return apiFetch(`/api/admin/dashboard${query ? `?${query}` : ""}`);
		},
	});
}

export function useAdminRequests(
	status?: string,
	urgency?: string,
	search?: string,
	page = 1,
	serviceId?: string,
	from?: string,
	to?: string,
	assignmentType?: string,
) {
	return useQuery({
		queryKey: [
			"admin_requests",
			status,
			urgency,
			search,
			page,
			serviceId,
			from,
			to,
			assignmentType,
		],
		queryFn: () => {
			const params = new URLSearchParams({
				page: String(page),
				pageSize: "20",
			});
			if (status && status !== "all")
				params.append("status", status.toLowerCase());
			if (urgency && urgency !== "all")
				params.append("urgency", urgency.toLowerCase());
			if (search) params.append("search", search);
			if (serviceId) params.append("serviceId", serviceId);
			if (from) params.append("from", from);
			if (to) params.append("to", to);
			if (assignmentType && assignmentType !== "all")
				params.append("assignment_type", assignmentType);
			return apiFetch(`/api/admin/requests?${params.toString()}`);
		},
	});
}

export function useAdminRequestDetail(id: string | null) {
	return useQuery<RequestDetailResponse>({
		queryKey: ["admin_request_detail", id],
		queryFn: () => apiFetch(`/api/admin/requests/${id}`),
		enabled: !!id,
	});
}

export function useUpdateAdminRequest() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({
			id,
			...body
		}: {
			id: string;
			status?: string;
			assignedWorkerId?: string;
			internalNotes?: string;
		}) =>
			apiFetch(`/api/admin/requests/${id}`, {
				method: "PATCH",
				body: JSON.stringify(body),
			}),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ["admin_requests"] });
			queryClient.invalidateQueries({
				queryKey: ["admin_request_detail", variables.id],
			});
			queryClient.invalidateQueries({ queryKey: ["admin_dashboard"] });
		},
	});
}

export function useClients() {
	return useQuery({
		queryKey: ["admin_clients"],
		queryFn: () => apiFetch("/api/admin/clients"),
	});
}

export function useAdminInvoices(
	status?: string,
	page = 1,
	from?: string,
	to?: string,
) {
	return useQuery({
		queryKey: ["admin_invoices", status, page, from, to],
		queryFn: () => {
			const params = new URLSearchParams({
				page: String(page),
				pageSize: "20",
			});
			if (status && status !== "all")
				params.append("status", status.toLowerCase());
			if (from) params.append("from", from);
			if (to) params.append("to", to);
			return apiFetch(`/api/admin/invoices?${params.toString()}`);
		},
	});
}

export function useAdminInvoiceDetail(id: string | null) {
	return useQuery<InvoiceDetailResponse>({
		queryKey: ["admin_invoice_detail", id],
		queryFn: () => apiFetch(`/api/admin/invoices/${id}`),
		enabled: !!id && id !== "new",
	});
}

export function useCreateInvoice() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (body: Record<string, unknown>) =>
			apiFetch("/api/admin/invoices", {
				method: "POST",
				body: JSON.stringify(body),
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["admin_invoices"] });
			queryClient.invalidateQueries({ queryKey: ["admin_finance_overview"] });
			queryClient.invalidateQueries({ queryKey: ["admin_finance_income"] });
			queryClient.invalidateQueries({ queryKey: ["admin_system_account"] });
			queryClient.invalidateQueries({ queryKey: ["admin_payroll"] });
			queryClient.invalidateQueries({ queryKey: ["admin_dashboard"] });
		},
	});
}

export function useUpdateInvoice() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ id, ...body }: { id: string } & Record<string, unknown>) =>
			apiFetch(`/api/admin/invoices/${id}`, {
				method: "PATCH",
				body: JSON.stringify(body),
			}),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ["admin_invoices"] });
			queryClient.invalidateQueries({
				queryKey: ["admin_invoice_detail", variables.id],
			});
			queryClient.invalidateQueries({ queryKey: ["admin_finance_overview"] });
			queryClient.invalidateQueries({ queryKey: ["admin_finance_income"] });
			queryClient.invalidateQueries({ queryKey: ["admin_finance_expenses"] });
			queryClient.invalidateQueries({ queryKey: ["admin_system_account"] });
			queryClient.invalidateQueries({ queryKey: ["admin_payroll"] });
			queryClient.invalidateQueries({ queryKey: ["admin_dashboard"] });
		},
	});
}

export function useDeleteInvoice() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (id: string) =>
			apiFetch(`/api/admin/invoices/${id}`, { method: "DELETE" }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["admin_invoices"] });
			queryClient.invalidateQueries({ queryKey: ["admin_finance_overview"] });
			queryClient.invalidateQueries({ queryKey: ["admin_finance_income"] });
			queryClient.invalidateQueries({ queryKey: ["admin_system_account"] });
			queryClient.invalidateQueries({ queryKey: ["admin_payroll"] });
			queryClient.invalidateQueries({ queryKey: ["admin_dashboard"] });
		},
	});
}

export function useRequestsWithoutInvoice(page = 1) {
	return useQuery({
		queryKey: ["admin_requests_without_invoice", page],
		queryFn: () => {
			const params = new URLSearchParams({
				page: String(page),
				pageSize: "20",
			});
			return apiFetch(`/api/admin/invoices/requests-without-invoice?${params.toString()}`);
		},
	});
}

export function useRequestWorkers(requestId: string | null) {
	return useQuery({
		queryKey: ["admin_request_workers", requestId],
		queryFn: () => apiFetch(`/api/admin/requests/${requestId}/workers`),
		enabled: !!requestId,
	});
}

export function useAssignRequestWorkers() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({
			requestId,
			workerIds,
		}: {
			requestId: string;
			workerIds: string[];
		}) =>
			apiFetch(`/api/admin/requests/${requestId}/workers`, {
				method: "POST",
				body: JSON.stringify({ workerIds }),
			}),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ["admin_request_workers", variables.requestId] });
			queryClient.invalidateQueries({ queryKey: ["admin_request_detail", variables.requestId] });
			queryClient.invalidateQueries({ queryKey: ["admin_requests"] });
			queryClient.invalidateQueries({ queryKey: ["admin_dashboard"] });
		},
	});
}

export function useWorkerCommissionTotal(workerId?: string, month?: number, year?: number) {
	return useQuery({
		queryKey: ["admin_worker_commission_total", workerId, month, year],
		queryFn: () => {
			const params = new URLSearchParams();
			if (workerId) params.append("workerId", workerId);
			if (month) params.append("month", String(month));
			if (year) params.append("year", String(year));
			return apiFetch(`/api/admin/payroll/commission-total?${params.toString()}`);
		},
		enabled: !!workerId && !!month && !!year,
	});
}

// ─── HR ───────────────────────────────────────────────────────────────────────

export function useAdminHROverview() {
	return useQuery({
		queryKey: ["admin_hr_overview"],
		queryFn: () => apiFetch("/api/admin/hr/overview"),
	});
}

export function useAdminWorkers() {
	return useQuery({
		queryKey: ["admin_workers"],
		queryFn: () => apiFetch("/api/admin/workers"),
	});
}

export function useCreateWorker() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (body: Record<string, unknown>) =>
			apiFetch("/api/admin/workers", {
				method: "POST",
				body: JSON.stringify(body),
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["admin_workers"] });
			queryClient.invalidateQueries({ queryKey: ["admin_hr_overview"] });
		},
	});
}

export function useUpdateWorker() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ id, ...body }: { id: string } & Record<string, unknown>) =>
			apiFetch(`/api/admin/workers/${id}`, {
				method: "PATCH",
				body: JSON.stringify(body),
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["admin_workers"] });
		},
	});
}

export function useDeleteWorker() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (id: string) =>
			apiFetch(`/api/admin/workers/${id}`, { method: "DELETE" }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["admin_workers"] });
			queryClient.invalidateQueries({ queryKey: ["admin_hr_overview"] });
		},
	});
}

export function useAdminVendors() {
	return useQuery({
		queryKey: ["admin_vendors"],
		queryFn: () => apiFetch("/api/admin/vendors"),
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
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["admin_vendors"] });
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
	});
}

export function useAssignVendor() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({
			requestId,
			vendorId,
		}: {
			requestId: string;
			vendorId: string;
		}) =>
			apiFetch(`/api/admin/requests/${requestId}/vendor`, {
				method: "POST",
				body: JSON.stringify({
					vendor_id: vendorId,
				}),
			}),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ["admin_request_detail", variables.requestId] });
			queryClient.invalidateQueries({ queryKey: ["admin_requests"] });
			queryClient.invalidateQueries({ queryKey: ["admin_dashboard"] });
		},
	});
}

export function useRemoveVendor() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (requestId: string) =>
			apiFetch(`/api/admin/requests/${requestId}/vendor`, {
				method: "DELETE",
			}),
		onSuccess: (_, requestId) => {
			queryClient.invalidateQueries({ queryKey: ["admin_request_detail", requestId] });
			queryClient.invalidateQueries({ queryKey: ["admin_requests"] });
			queryClient.invalidateQueries({ queryKey: ["admin_dashboard"] });
		},
	});
}

export function useUpdateVendorCommission() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({
			requestId,
			commissionPercentage,
		}: {
			requestId: string;
			commissionPercentage: number;
		}) =>
			apiFetch(`/api/admin/requests/${requestId}/vendor/commission`, {
				method: "PUT",
				body: JSON.stringify({
					commission_percentage: commissionPercentage,
				}),
			}),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ["admin_request_detail", variables.requestId] });
			queryClient.invalidateQueries({ queryKey: ["admin_requests"] });
		},
	});
}

export function useAdminPayroll(month?: number, year?: number) {
	return useQuery({
		queryKey: ["admin_payroll", month, year],
		queryFn: () => {
			const params = new URLSearchParams();
			if (month) params.append("month", String(month));
			if (year) params.append("year", String(year));
			return apiFetch(`/api/admin/payroll?${params.toString()}`);
		},
	});
}

export function useUpsertPayroll() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (body: Record<string, unknown>) =>
			apiFetch("/api/admin/payroll", {
				method: "POST",
				body: JSON.stringify(body),
			}),
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: ["admin_payroll"] }),
	});
}

export function useMarkPayrollPaid() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (body: { month: number; year: number }) =>
			apiFetch("/api/admin/payroll/process", {
				method: "POST",
				body: JSON.stringify(body),
			}),
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: ["admin_payroll"] }),
	});
}

export function useMarkPayrollPaidIndividual() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (id: string) =>
			apiFetch(`/api/admin/payroll/${id}/paid`, {
				method: "PATCH",
			}),
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: ["admin_payroll"] }),
	});
}

export function useUpdatePayroll() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({
			id,
			body,
		}: {
			id: string;
			body: Record<string, unknown>;
		}) =>
			apiFetch(`/api/admin/payroll/${id}`, {
				method: "PATCH",
				body: JSON.stringify(body),
			}),
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: ["admin_payroll"] }),
	});
}

// ─── Finance ──────────────────────────────────────────────────────────────────

export function useAdminFinanceOverview(from?: string, to?: string) {
	return useQuery({
		queryKey: ["admin_finance_overview", from, to],
		queryFn: () => {
			const params = new URLSearchParams();
			if (from) params.append("from", from);
			if (to) params.append("to", to);
			const query = params.toString();
			return apiFetch(`/api/admin/finance/overview${query ? `?${query}` : ""}`);
		},
	});
}

export function useAdminFinanceIncome(page = 1, from?: string, to?: string) {
	return useQuery({
		queryKey: ["admin_finance_income", page, from, to],
		queryFn: () => {
			const params = new URLSearchParams({
				page: String(page),
				pageSize: "20",
			});
			if (from) params.append("from", from);
			if (to) params.append("to", to);
			return apiFetch(`/api/admin/finance/income?${params.toString()}`);
		},
	});
}

export function useAdminFinanceIncomeTotal(from?: string, to?: string) {
	return useQuery({
		queryKey: ["admin_finance_income_total", from, to],
		queryFn: () => {
			const params = new URLSearchParams();
			if (from) params.append("from", from);
			if (to) params.append("to", to);
			return apiFetch<{ total: string }>(`/api/admin/finance/income/total?${params.toString()}`);
		},
	});
}

export function useCreateIncome() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (body: Record<string, unknown>) =>
			apiFetch("/api/admin/finance/income", {
				method: "POST",
				body: JSON.stringify(body),
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["admin_finance_income"] });
			queryClient.invalidateQueries({ queryKey: ["admin_finance_overview"] });
		},
	});
}

export function useUpdateIncome() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ id, ...body }: { id: string } & Record<string, unknown>) =>
			apiFetch(`/api/admin/finance/income/${id}`, {
				method: "PATCH",
				body: JSON.stringify(body),
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["admin_finance_income"] });
			queryClient.invalidateQueries({ queryKey: ["admin_finance_overview"] });
		},
	});
}

export function useDeleteIncome() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (id: string) =>
			apiFetch(`/api/admin/finance/income/${id}`, { method: "DELETE" }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["admin_finance_income"] });
			queryClient.invalidateQueries({ queryKey: ["admin_finance_overview"] });
		},
	});
}

export function useAdminFinanceExpenses(page = 1, from?: string, to?: string) {
	return useQuery({
		queryKey: ["admin_finance_expenses", page, from, to],
		queryFn: () => {
			const params = new URLSearchParams({
				page: String(page),
				pageSize: "20",
			});
			if (from) params.append("from", from);
			if (to) params.append("to", to);
			return apiFetch(`/api/admin/finance/expenses?${params.toString()}`);
		},
	});
}

export function useAdminFinanceExpenseTotal(from?: string, to?: string) {
	return useQuery({
		queryKey: ["admin_finance_expense_total", from, to],
		queryFn: () => {
			const params = new URLSearchParams();
			if (from) params.append("from", from);
			if (to) params.append("to", to);
			return apiFetch<{ total: string }>(`/api/admin/finance/expenses/total?${params.toString()}`);
		},
	});
}

export function useCreateExpense() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (body: Record<string, unknown>) =>
			apiFetch("/api/admin/finance/expenses", {
				method: "POST",
				body: JSON.stringify(body),
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["admin_finance_expenses"] });
			queryClient.invalidateQueries({ queryKey: ["admin_finance_expense_total"] });
			queryClient.invalidateQueries({ queryKey: ["admin_finance_overview"] });
			queryClient.invalidateQueries({ queryKey: ["admin_system_account"] });
			queryClient.invalidateQueries({ queryKey: ["admin_account_transactions"] });
			queryClient.invalidateQueries({ queryKey: ["admin_dashboard"] });
		},
	});
}

export function useUpdateExpense() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ id, ...body }: { id: string } & Record<string, unknown>) =>
			apiFetch(`/api/admin/finance/expenses/${id}`, {
				method: "PATCH",
				body: JSON.stringify(body),
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["admin_finance_expenses"] });
			queryClient.invalidateQueries({ queryKey: ["admin_finance_expense_total"] });
			queryClient.invalidateQueries({ queryKey: ["admin_finance_overview"] });
			queryClient.invalidateQueries({ queryKey: ["admin_system_account"] });
			queryClient.invalidateQueries({ queryKey: ["admin_account_transactions"] });
			queryClient.invalidateQueries({ queryKey: ["admin_dashboard"] });
		},
	});
}

export function useDeleteExpense() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (id: string) =>
			apiFetch(`/api/admin/finance/expenses/${id}`, { method: "DELETE" }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["admin_finance_expenses"] });
			queryClient.invalidateQueries({ queryKey: ["admin_finance_expense_total"] });
			queryClient.invalidateQueries({ queryKey: ["admin_finance_overview"] });
			queryClient.invalidateQueries({ queryKey: ["admin_system_account"] });
			queryClient.invalidateQueries({ queryKey: ["admin_account_transactions"] });
			queryClient.invalidateQueries({ queryKey: ["admin_dashboard"] });
		},
	});
}

// ─── Inventory ────────────────────────────────────────────────────────────────

export function useAdminInventory() {
	return useQuery({
		queryKey: ["admin_inventory"],
		queryFn: () => apiFetch("/api/admin/inventory"),
	});
}

export function useCreateInventoryItem() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (body: Record<string, unknown>) =>
			apiFetch("/api/admin/inventory", {
				method: "POST",
				body: JSON.stringify(body),
			}),
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: ["admin_inventory"] }),
	});
}

export function useUpdateInventoryItem() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ id, ...body }: { id: string } & Record<string, unknown>) =>
			apiFetch(`/api/admin/inventory/${id}`, {
				method: "PATCH",
				body: JSON.stringify(body),
			}),
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: ["admin_inventory"] }),
	});
}

export function useDeleteInventoryItem() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (id: string) =>
			apiFetch(`/api/admin/inventory/${id}`, { method: "DELETE" }),
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: ["admin_inventory"] }),
	});
}

// ─── Advances ─────────────────────────────────────────────────────────────────

export function useWorkerAdvances(workerId: string | null) {
	return useQuery<WorkerAdvance[]>({
		queryKey: ["admin_worker_advances", workerId],
		queryFn: () => apiFetch(`/api/admin/workers/${workerId}/advances`),
		enabled: !!workerId,
	});
}

export function useCreateAdvance() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({
			workerId,
			...body
		}: {
			workerId: string;
			amount: string;
			reason?: string;
			dateGiven: string;
			totalInstallments: number;
		}) =>
			apiFetch(`/api/admin/workers/${workerId}/advances`, {
				method: "POST",
				body: JSON.stringify(body),
			}),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({
				queryKey: ["admin_worker_advances", variables.workerId],
			});
			queryClient.invalidateQueries({ queryKey: ["admin_advances"] });
		},
	});
}

export function useAllAdvances(page = 1) {
	return useQuery<Paginated<WorkerAdvance>>({
		queryKey: ["admin_advances", page],
		queryFn: () => {
			const params = new URLSearchParams({
				page: String(page),
				pageSize: "20",
			});
			return apiFetch(`/api/admin/advances?${params.toString()}`);
		},
	});
}

export function usePauseAdvance() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (id: string) =>
			apiFetch(`/api/admin/advances/${id}/pause`, { method: "PATCH" }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["admin_advances"] });
			queryClient.invalidateQueries({ queryKey: ["admin_worker_advances"] });
		},
	});
}

export function useResumeAdvance() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (id: string) =>
			apiFetch(`/api/admin/advances/${id}/resume`, { method: "PATCH" }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["admin_advances"] });
			queryClient.invalidateQueries({ queryKey: ["admin_worker_advances"] });
		},
	});
}

// ─── System Account ───────────────────────────────────────────────────────────

export function useSystemAccount() {
	return useQuery<SystemAccount>({
		queryKey: ["admin_system_account"],
		queryFn: () => apiFetch("/api/admin/finance/account"),
	});
}

export function useDepositToAccount() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (body: { amount: string; description?: string }) =>
			apiFetch("/api/admin/finance/account/deposit", {
				method: "POST",
				body: JSON.stringify(body),
			}),
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: ["admin_system_account"] }),
	});
}

export function useClearData() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: () =>
			apiFetch("/api/admin/data/clear", { method: "POST" }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["admin_invoices"] });
			queryClient.invalidateQueries({ queryKey: ["admin_requests"] });
			queryClient.invalidateQueries({ queryKey: ["admin_clients"] });
			queryClient.invalidateQueries({ queryKey: ["admin_system_account"] });
			queryClient.invalidateQueries({ queryKey: ["admin_finance_income"] });
			queryClient.invalidateQueries({ queryKey: ["admin_finance_expenses"] });
			queryClient.invalidateQueries({ queryKey: ["admin_finance_overview"] });
			queryClient.invalidateQueries({ queryKey: ["admin_payroll"] });
			queryClient.invalidateQueries({ queryKey: ["admin_inventory"] });
			queryClient.invalidateQueries({ queryKey: ["admin_workers"] });
			queryClient.invalidateQueries({ queryKey: ["admin_dashboard"] });
		},
	});
}

export function useAccountTransactions(page = 1) {
	return useQuery<Paginated<AccountTransaction>>({
		queryKey: ["admin_account_transactions", page],
		queryFn: () => {
			const params = new URLSearchParams({
				page: String(page),
				pageSize: "20",
			});
			return apiFetch(`/api/admin/finance/transactions?${params.toString()}`);
		},
	});
}

// ─── Payroll ──────────────────────────────────────────────────────────────────

export function useCalculatePayroll(month?: number, year?: number) {
	return useQuery({
		queryKey: ["admin_payroll_calculate", month, year],
		queryFn: () => {
			const params = new URLSearchParams();
			if (month) params.append("month", String(month));
			if (year) params.append("year", String(year));
			return apiFetch(`/api/admin/payroll/calculate?${params.toString()}`);
		},
		enabled: !!month && !!year,
	});
}

export function useSalarySlip(payrollId: string | null) {
	return useQuery<SalarySlipResponse>({
		queryKey: ["admin_salary_slip", payrollId],
		queryFn: () => apiFetch(`/api/admin/payroll/${payrollId}/slip`),
		enabled: !!payrollId,
	});
}
