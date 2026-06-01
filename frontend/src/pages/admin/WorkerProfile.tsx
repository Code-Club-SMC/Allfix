import { useParams } from "react-router-dom";
import { useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/cb/Form";
import { PageHeader } from "@/components/cb/PageHeader";
import { Card } from "@/components/cb/Tabs";
import { apiFetch } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import {
	DateRangePicker,
	fmtDateForAPI,
	getCurrentMonthRange,
} from "@/components/ui/date-picker";
import type { DateRange } from "react-day-picker";

const fmt = (n: number | string) =>
	n ? `PKR ${Number(n).toLocaleString()}` : "PKR 0";

const WorkerProfile = () => {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const [tab, setTab] = useState<"overview" | "commissions" | "salary" | "jobs">("overview");
	const [commissionRange, setCommissionRange] = useState<DateRange | undefined>(getCurrentMonthRange());

	const { data, isLoading } = useQuery({
		queryKey: ["worker_profile", id, tab, commissionRange?.from, commissionRange?.to],
		queryFn: () => {
			const params = new URLSearchParams();
			if (tab === "commissions") {
				const from = fmtDateForAPI(commissionRange?.from);
				const to = fmtDateForAPI(commissionRange?.to);
				if (from) params.append("from", from);
				if (to) params.append("to", to);
			}
			const qs = params.toString();
			return apiFetch(`/api/admin/workers/${id}/profile${qs ? `?${qs}` : ""}`);
		},
		enabled: !!id,
	});

	const profile = data?.profile;
	const requests = data?.requests || [];
	const commissions = data?.commissions || [];

	// Backend may not return these yet (old binary running), so compute from array as fallback
	const computedCommissionTotal = commissions.reduce(
		(sum: number, c: any) => sum + (Number(c.amount) || 0),
		0,
	);
	const commissionTotal = data?.commissionTotal ?? computedCommissionTotal;
	const commissionCount = data?.commissionCount ?? commissions.length;

	if (isLoading) {
		return (
			<div className="flex h-96 items-center justify-center">
				<Loader2 className="h-8 w-8 animate-spin text-primary" />
			</div>
		);
	}

	if (!profile) {
		return (
			<div className="mx-auto max-w-[1400px]">
				<Button variant="outline" onClick={() => navigate("/admin/hr")}>
					<ArrowLeft className="mr-2 h-4 w-4" />
					Back to HR
				</Button>
				<div className="mt-8 text-center text-muted-foreground">
					Worker not found.
				</div>
			</div>
		);
	}

	return (
		<div className="mx-auto max-w-[1400px] space-y-4">
			<Button variant="outline" onClick={() => navigate("/admin/hr")}>
				<ArrowLeft className="mr-2 h-4 w-4" />
				Back to HR
			</Button>

			<PageHeader
				title={profile.name}
				subtitle={`${profile.phone} · ${profile.compensation_type === "commission" ? "Commission-based" : "Fixed Salary"}`}
			/>

			{/* Overview Cards */}
			<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
				<Card className="p-4">
					<div className="text-[12px] text-muted-foreground">Total Commissions</div>
					<div className="text-xl font-semibold">{fmt(profile.total_commissions)}</div>
					<div className="text-[11px] text-muted-foreground">{profile.commission_count} payments</div>
				</Card>
				<Card className="p-4">
					<div className="text-[12px] text-muted-foreground">Total Salary Paid</div>
					<div className="text-xl font-semibold">{fmt(profile.total_salary_paid)}</div>
					<div className="text-[11px] text-muted-foreground">{profile.salary_count} payments</div>
				</Card>
				<Card className="p-4">
					<div className="text-[12px] text-muted-foreground">Jobs Completed</div>
					<div className="text-xl font-semibold">{profile.jobs_completed}</div>
				</Card>
				<Card className="p-4">
					<div className="text-[12px] text-muted-foreground">Status</div>
					<div className="text-xl font-semibold capitalize">{profile.status}</div>
				</Card>
			</div>

			{/* Tabs */}
			<div className="flex gap-1 border-b border-border">
				{(["overview", "commissions", "salary", "jobs"] as const).map((t) => (
					<button
						key={t}
						onClick={() => setTab(t)}
						className={`px-3 py-2 text-[12px] font-medium capitalize transition-colors ${
							tab === t
								? "border-b-2 border-primary text-primary"
								: "text-muted-foreground hover:text-foreground"
						}`}
					>
						{t}
					</button>
				))}
			</div>

			{/* Tab Content */}
			{tab === "overview" && (
				<div className="space-y-4">
					<Card className="p-4">
						<h3 className="mb-3 text-[13px] font-medium">Worker Details</h3>
						<div className="grid grid-cols-2 gap-4 text-[12px]">
							<div>
								<span className="text-muted-foreground">CNIC:</span>
								<span className="ml-2">{profile.cnic || "—"}</span>
							</div>
							<div>
								<span className="text-muted-foreground">Trades:</span>
								<span className="ml-2">{(profile.trades || []).join(", ") || "—"}</span>
							</div>
							<div>
								<span className="text-muted-foreground">Monthly Salary:</span>
								<span className="ml-2">{fmt(profile.monthly_salary)}</span>
							</div>
							<div>
								<span className="text-muted-foreground">Notes:</span>
								<span className="ml-2">{profile.notes || "—"}</span>
							</div>
						</div>
					</Card>
				</div>
			)}

			{tab === "commissions" && (
				<div className="space-y-3">
					<div className="flex flex-wrap items-center justify-between gap-3">
						<DateRangePicker
							value={commissionRange}
							onChange={setCommissionRange}
							placeholder="Select date range"
						/>
						<div className="text-right">
							<div className="text-[11px] text-muted-foreground">Total commissions (period)</div>
							<div className="text-lg font-semibold">{fmt(commissionTotal ?? 0)}</div>
							{commissionCount > 0 && (
								<div className="text-[11px] text-muted-foreground">{commissionCount} payments</div>
							)}
						</div>
					</div>
					<Card>
						<table className="w-full">
							<thead>
								<tr className="border-b border-border text-left">
									<th className="cb-label px-3 py-2">Invoice #</th>
									<th className="cb-label px-3 py-2">Amount</th>
									<th className="cb-label px-3 py-2">Date</th>
								</tr>
							</thead>
							<tbody>
								{commissions.map((c: any) => (
									<tr key={c.id} className="border-b border-border/60 text-[12.5px]">
										<td className="px-3 py-2">{c.invoice_number}</td>
										<td className="px-3 py-2 font-medium">{fmt(c.amount)}</td>
										<td className="px-3 py-2 text-muted-foreground">
											{new Date(c.paid_at).toLocaleDateString()}
										</td>
									</tr>
								))}
								{commissions.length === 0 && (
									<tr>
										<td colSpan={3} className="py-8 text-center text-muted-foreground">
											No commissions in this period.
										</td>
									</tr>
								)}
							</tbody>
						</table>
					</Card>
				</div>
			)}

			{tab === "jobs" && (
				<Card>
					<table className="w-full">
						<thead>
							<tr className="border-b border-border text-left">
								<th className="cb-label px-3 py-2">Request #</th>
								<th className="cb-label px-3 py-2">Service</th>
								<th className="cb-label px-3 py-2">Client</th>
								<th className="cb-label px-3 py-2">Status</th>
								<th className="cb-label px-3 py-2">Date</th>
							</tr>
						</thead>
						<tbody>
							{requests.map((req: any) => (
								<tr key={req.id} className="border-b border-border/60 text-[12.5px]">
									<td className="px-3 py-2 font-medium">{req.request_number}</td>
									<td className="px-3 py-2">{req.service_name}</td>
									<td className="px-3 py-2">{req.full_name}</td>
									<td className="px-3 py-2">
										<span className="capitalize">{req.status}</span>
									</td>
									<td className="px-3 py-2 text-muted-foreground">
										{new Date(req.preferred_date).toLocaleDateString()}
									</td>
								</tr>
							))}
							{requests.length === 0 && (
								<tr>
									<td colSpan={5} className="py-8 text-center text-muted-foreground">
										No jobs assigned yet.
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</Card>
			)}

			{tab === "salary" && (
				<Card className="p-8 text-center text-muted-foreground">
					Salary history will be integrated with payroll data.
				</Card>
			)}
		</div>
	);
};

export default WorkerProfile;
