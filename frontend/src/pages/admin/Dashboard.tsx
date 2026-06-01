import { Loader2 } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Avatar } from "@/components/cb/Avatar";
import { Button } from "@/components/cb/Form";
import { KpiCard } from "@/components/cb/KpiCard";
import { PageHeader } from "@/components/cb/PageHeader";
import { StatusBadge } from "@/components/cb/StatusBadge";
import { Card } from "@/components/cb/Tabs";
import {
	DateRangePicker,
	fmtDateForAPI,
	getCurrentMonthRange,
} from "@/components/ui/date-picker";
import { useAdminDashboard, useAdminWorkers } from "@/hooks/useAdmin";
import { RequestStatus } from "@/types/api";

const Bar = ({
	label,
	value,
	max,
}: {
	label: string;
	value: number;
	max: number;
}) => (
	<div className="grid grid-cols-[120px_1fr_40px] items-center gap-3 py-1.5">
		<span className="truncate text-[13px] text-foreground">{label}</span>
		<div className="h-2 bg-subtle">
			<div
				className="h-2 bg-primary"
				style={{ width: `${max > 0 ? (value / max) * 100 : 0}%` }}
			/>
		</div>
		<span className="text-right text-[12px] text-muted-foreground">
			{value}
		</span>
	</div>
);

const dotColor = (c: "info" | "success" | "warning" | "danger") =>
	c === "success"
		? "bg-success"
		: c === "warning"
			? "bg-warning"
			: c === "danger"
				? "bg-danger"
				: "bg-info";

const Dashboard = () => {
	const [dateRange, setDateRange] = useState(getCurrentMonthRange());

	const { data: dashboard, isLoading, isError } = useAdminDashboard(
		fmtDateForAPI(dateRange.from),
		fmtDateForAPI(dateRange.to),
	);
	const { data: workers } = useAdminWorkers();

	if (isLoading) {
		return (
			<div className="mx-auto flex max-w-[1400px] h-[50vh] items-center justify-center p-24 text-muted-foreground">
				<Loader2 className="h-6 w-6 animate-spin text-primary" />
			</div>
		);
	}

	if (isError || !dashboard) {
		return (
			<div className="mx-auto max-w-[1400px] p-10 text-center text-danger">
				Failed to load dashboard data.
			</div>
		);
	}

	const { kpis, recentRequests, serviceDistribution } = dashboard;

	const dist = serviceDistribution || [];
	const max = Math.max(...dist.map((d: any) => d.request_count), 1);
	const recent = recentRequests || [];

	const activeWorkers =
		workers?.filter((w: any) => w.status === "active") || [];
	const onDuty = activeWorkers.slice(0, 5);

	return (
		<div className="mx-auto max-w-[1400px]">
			<PageHeader
				title="Dashboard"
				subtitle="Overview of operations across all services."
				actions={
					<DateRangePicker
						value={dateRange}
						onChange={(range) => setDateRange(range || {})}
					/>
				}
			/>

			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<div>
					<KpiCard
						label="Requests Today"
						value={kpis?.requestsToday?.toString() || "0"}
						delta=""
					/>
				</div>
				<div>
					<KpiCard
						label="Active Jobs"
						value={kpis?.activeRequests?.toString() || "0"}
						delta=""
					/>
				</div>
				<div>
					<KpiCard
						label="Revenue This Month"
						value={`PKR ${(kpis?.revenueThisMonth || 0).toLocaleString()}`}
						delta=""
					/>
				</div>
				<div>
					<KpiCard
						label="Workers Available"
						value={`${kpis?.activeWorkers || 0}`}
						delta=""
					/>
				</div>
			</div>

			<div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-5">
				<Card className="overflow-hidden lg:col-span-3" id="recent-requests">
					<div className="flex items-center justify-between border-b border-border px-5 py-3">
						<h2 className="cb-section">Recent Requests</h2>
						<Link to="/admin/requests">
							<Button variant="ghost" size="sm">
								View all
							</Button>
						</Link>
					</div>
					<table className="w-full">
						<thead>
							<tr className="border-b border-border text-left">
								<th className="cb-label px-5 py-2.5">ID</th>
								<th className="cb-label px-5 py-2.5">Service</th>
								<th className="cb-label px-5 py-2.5">Client</th>
								<th className="cb-label px-5 py-2.5">Date</th>
								<th className="cb-label px-5 py-2.5">Status</th>
								<th className="cb-label px-5 py-2.5">Action</th>
							</tr>
						</thead>
						<tbody>
							{recent.map((r: any) => (
								<tr
									key={r.id}
									className="border-b border-border/60 text-[13px] transition-colors last:border-0 hover:bg-subtle"
								>
									<td className="px-5 py-2.5 font-medium">
										{r.request_number}
									</td>
									<td className="px-5 py-2.5">
										{(() => {
											const summary = (r.service_summary || r.service_name || "—") as string;
											const parts = summary.split(", ");
											const primary = parts[0] || summary;
											const extra = parts.length - 1;
											return (
												<div className="flex items-center gap-1.5" title={summary}>
													<span>{primary}</span>
													{extra > 0 && (
														<span className="inline-flex shrink-0 items-center rounded-full border border-border bg-subtle px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
															+{extra}
														</span>
													)}
												</div>
											);
										})()}
									</td>
									<td className="px-5 py-2.5">
										{r.full_name || r.client_name}
									</td>
									<td className="px-5 py-2.5 text-muted-foreground">
										{new Date(r.created_at).toLocaleDateString()}
									</td>
									<td className="px-5 py-2.5">
										<StatusBadge status={r.status as RequestStatus} />
									</td>
									<td className="px-5 py-2.5 text-right">
										<Link to="/admin/requests">
											<Button size="sm" variant="ghost">
												View
											</Button>
										</Link>
									</td>
								</tr>
							))}
							{recent.length === 0 && (
								<tr>
									<td
										colSpan={6}
										className="px-5 py-8 text-center text-muted-foreground text-[13px]"
									>
										No recent requests found.
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</Card>

				<Card className="lg:col-span-2" id="service-distribution">
					<div className="border-b border-border px-5 py-3">
						<h2 className="cb-section">Service Distribution</h2>
						<p className="mt-0.5 text-[12px] text-muted-foreground">
							Top services this month
						</p>
					</div>
					<div className="px-5 py-4">
						{dist.map((d: any) => (
							<Bar
								key={d.service_name}
								label={d.service_name}
								value={d.request_count}
								max={max}
							/>
						))}
						{dist.length === 0 && (
							<div className="py-8 text-center text-muted-foreground text-[12px]">
								No data available yet.
							</div>
						)}
						<div className="mt-2 border-t border-border pt-2 text-[11px] text-text-tertiary">
							By request count
						</div>
					</div>
				</Card>
			</div>

			<div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
				<Card id="activity-feed">
					<div className="border-b border-border px-5 py-3">
						<h2 className="cb-section">Activity</h2>
					</div>
					<ol className="px-5 py-4">
						{recent.slice(0, 5).map((r: any, i: number) => {
							const isUrgent = r.urgency === "urgent";
							const typeLabel = isUrgent ? "warning" : "info";
							return (
								<li
									key={i}
									className="relative grid grid-cols-[14px_1fr_auto] items-start gap-3 pb-4 last:pb-0"
								>
									<span
										className={`mt-1.5 h-1.5 w-1.5 ${dotColor(typeLabel)}`}
									/>
									<span className="text-[13px] text-muted-foreground">
										Request{" "}
										<strong className="font-medium text-foreground">
											{r.request_number}
										</strong>{" "}
										created by {r.full_name || r.client_name}
									</span>
									<span className="text-[11px] text-text-tertiary">
										{new Date(r.created_at).toLocaleDateString()}
									</span>
									{i < Math.min(recent.length, 5) - 1 && (
										<span className="absolute left-[6px] top-3 h-full w-px bg-border" />
									)}
								</li>
							);
						})}
						{recent.length === 0 && (
							<li className="py-4 text-[13px] text-muted-foreground">
								No recent activity
							</li>
						)}
					</ol>
				</Card>

				<Card>
					<div className="border-b border-border px-5 py-3">
						<h2 className="cb-section">Workers on duty</h2>
					</div>
					<ul className="divide-y divide-border">
						{onDuty.map((w: any) => (
							<li key={w.id} className="flex items-center gap-3 px-5 py-3">
								<Avatar name={w.name} size={32} />
								<div className="min-w-0 flex-1">
									<div className="text-[13px] font-medium">{w.name}</div>
									<div className="text-[12px] text-muted-foreground">
										{w.trades?.[0] || "General"}
									</div>
								</div>
								<span className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground">
									<span className="h-1.5 w-1.5 bg-success" /> Active
								</span>
							</li>
						))}
						{onDuty.length === 0 && (
							<li className="py-8 px-5 text-center text-[13px] text-muted-foreground">
								No workers available.
							</li>
						)}
					</ul>
				</Card>
			</div>
		</div>
	);
};

export default Dashboard;
