import { useParams } from "react-router-dom";
import { useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/cb/Form";
import { PageHeader } from "@/components/cb/PageHeader";
import { Card } from "@/components/cb/Tabs";
import { apiFetch } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

const fmt = (n: number | string) =>
	n ? `PKR ${Number(n).toLocaleString()}` : "PKR 0";

const VendorProfile = () => {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const [tab, setTab] = useState<"overview" | "invoices" | "jobs">("overview");

	const { data, isLoading } = useQuery({
		queryKey: ["vendor_profile", id],
		queryFn: () => apiFetch(`/api/admin/vendors/${id}/profile`),
		enabled: !!id,
	});

	const profile = data?.profile;
	const requests = data?.requests || [];
	const invoices = data?.invoices || [];

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
				<Button variant="outline" onClick={() => navigate("/admin/vendors")}>
					<ArrowLeft className="mr-2 h-4 w-4" />
					Back to Vendors
				</Button>
				<div className="mt-8 text-center text-muted-foreground">
					Vendor not found.
				</div>
			</div>
		);
	}

	return (
		<div className="mx-auto max-w-[1400px] space-y-4">
			<Button variant="outline" onClick={() => navigate("/admin/vendors")}>
				<ArrowLeft className="mr-2 h-4 w-4" />
				Back to Vendors
			</Button>

			<PageHeader
				title={profile.name}
				subtitle={`${profile.contact_phone || "No phone"} · ${profile.services_offered?.join(", ") || "No services"}`}
			/>

			{/* Overview Cards */}
			<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
				<Card className="p-4">
					<div className="text-[12px] text-muted-foreground">Total Commissions</div>
					<div className="text-xl font-semibold">{fmt(profile.total_commissions)}</div>
					<div className="text-[11px] text-muted-foreground">{profile.commission_count} payments</div>
				</Card>
				<Card className="p-4">
					<div className="text-[12px] text-muted-foreground">Jobs Assigned</div>
					<div className="text-xl font-semibold">{profile.jobs_count}</div>
				</Card>
				<Card className="p-4">
					<div className="text-[12px] text-muted-foreground">Contact</div>
					<div className="text-xl font-semibold">{profile.contact_name || "—"}</div>
				</Card>
				<Card className="p-4">
					<div className="text-[12px] text-muted-foreground">Status</div>
					<div className="text-xl font-semibold capitalize">{profile.status}</div>
				</Card>
			</div>

			{/* Tabs */}
			<div className="flex gap-1 border-b border-border">
				{(["overview", "invoices", "jobs"] as const).map((t) => (
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
						<h3 className="mb-3 text-[13px] font-medium">Vendor Details</h3>
						<div className="grid grid-cols-2 gap-4 text-[12px]">
							<div>
								<span className="text-muted-foreground">Email:</span>
								<span className="ml-2">{profile.contact_email || "—"}</span>
							</div>
							<div>
								<span className="text-muted-foreground">Services:</span>
								<span className="ml-2">{(profile.services_offered || []).join(", ") || "—"}</span>
							</div>
							<div className="col-span-2">
								<span className="text-muted-foreground">Notes:</span>
								<span className="ml-2">{profile.notes || "—"}</span>
							</div>
						</div>
					</Card>
				</div>
			)}

			{tab === "invoices" && (
				<Card>
					<table className="w-full">
						<thead>
							<tr className="border-b border-border text-left">
								<th className="cb-label px-3 py-2">Invoice #</th>
								<th className="cb-label px-3 py-2">Total</th>
								<th className="cb-label px-3 py-2">Commission</th>
								<th className="cb-label px-3 py-2">Status</th>
								<th className="cb-label px-3 py-2">Date</th>
							</tr>
						</thead>
						<tbody>
							{invoices.map((inv: any) => (
								<tr key={inv.id} className="border-b border-border/60 text-[12.5px]">
									<td className="px-3 py-2 font-medium">{inv.invoice_number}</td>
									<td className="px-3 py-2">{fmt(inv.total)}</td>
									<td className="px-3 py-2 font-medium">{fmt(inv.vendor_commission)}</td>
									<td className="px-3 py-2">
										<span className="capitalize">{inv.status}</span>
									</td>
									<td className="px-3 py-2 text-muted-foreground">
										{new Date(inv.created_at).toLocaleDateString()}
									</td>
								</tr>
							))}
							{invoices.length === 0 && (
								<tr>
									<td colSpan={5} className="py-8 text-center text-muted-foreground">
										No invoices yet.
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</Card>
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
		</div>
	);
};

export default VendorProfile;
