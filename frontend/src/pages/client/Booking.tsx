import { ArrowLeft, Check, ChevronLeft, Loader2 } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams, useLocation } from "react-router-dom";
import {
	Button,
	Field,
	TextArea,
	TextInput,
} from "@/components/cb/Form";
import { PageHeader } from "@/components/cb/PageHeader";
import { Card } from "@/components/cb/Tabs";
import { useCreateRequest } from "@/hooks/useRequests";
import { useServices } from "@/hooks/useServices";
import { buildServiceSlugMap, cn } from "@/lib/utils";
import { RequestUrgency, ServiceRequest } from "@/types/api";

const STEPS = ["Service Details", "Your Info", "Review & Submit"];

const Stepper = ({ step }: { step: number }) => (
	<div className="mb-8 flex items-center justify-center gap-2">
		{STEPS.map((label, i) => {
			const done = i < step;
			const active = i === step;
			return (
				<div key={i} className="flex items-center gap-2">
					<div className="flex flex-col items-center gap-1">
						<div
							className={cn(
								"flex h-7 w-7 items-center justify-center border-2 text-[11px] font-normal transition-all",
								done
									? "border-success bg-success text-primary-foreground"
									: active
										? "border-primary bg-primary text-primary-foreground"
										: "border-border bg-surface text-muted-foreground",
							)}
						>
							{done ? <Check className="h-3.5 w-3.5" /> : i + 1}
						</div>
						<div
							className={cn(
								"whitespace-nowrap text-[11px] font-medium",
								active ? "text-foreground" : "text-muted-foreground",
							)}
						>
							{label}
						</div>
					</div>
					{i < STEPS.length - 1 && (
						<div
							className={cn(
								"mb-5 h-px w-10 transition-colors",
								done ? "bg-success" : "bg-border",
							)}
						/>
					)}
				</div>
			);
		})}
	</div>
);

type FormState = {
	notes: string;
	date: string;
	time: string;
	urgency: RequestUrgency;
	fullName: string;
	phone: string;
	email: string;
	address: string;
	city: string;
	area: string;
};

const today = new Date().toISOString().split("T")[0];

const Booking = () => {
	const { service: serviceSlug } = useParams();
	const navigate = useNavigate();
	const location = useLocation();

	const { data: services, isLoading: isLoadingServices } = useServices();
	// Parse services from query param or single-route param (slugs)
	const search = new URLSearchParams(location.search);
	const servicesParam = search.get("services");
	const rawSlugs = servicesParam
		? servicesParam.split(",")
		: serviceSlug
			? [serviceSlug]
			: [];
	const selectedSlugs = rawSlugs
		.map((slug) => decodeURIComponent(slug).trim())
		.filter(Boolean);
	const { serviceBySlug } = buildServiceSlugMap(services ?? []);
	const selectedServices = selectedSlugs
		.map((slug) => serviceBySlug[slug])
		.filter((service): service is NonNullable<typeof service> => !!service);
	const invalidSlugs = selectedSlugs.filter((slug) => !serviceBySlug[slug]);
	const primaryService = selectedServices[0];
	const selectedNames = selectedServices.map((service) => service.name);
	const canSubmit = selectedServices.length > 0 && invalidSlugs.length === 0;

	const [step, setStep] = useState(0);
	const [successData, setSuccessData] = useState<ServiceRequest | null>(null);
	const [form, setForm] = useState<FormState>({
		notes: "",
		date: today,
		time: "10:00",
		urgency: "standard",
		fullName: "",
		phone: "",
		email: "",
		address: "",
		city: "Islamabad",
		area: "",
	});

	const {
		mutate: createRequest,
		isPending,
		error: submitError,
	} = useCreateRequest();

	const patch = (k: keyof FormState, v: string) =>
		setForm((f) => ({ ...f, [k]: v }));

	const handleSubmit = () => {
		if (!canSubmit) return;

		// Basic required-field validation
		const missing: string[] = [];
		if (!form.fullName.trim()) missing.push("Full name");
		if (!form.phone.trim()) missing.push("Phone");
		if (!form.city.trim()) missing.push("City");
		if (!form.area.trim()) missing.push("Area");
		if (!form.address.trim()) missing.push("Full address");
		if (missing.length > 0) {
			// Simple alert for now — a more integrated inline error display can be added
			alert(`Please fill required fields: ${missing.join(", ")}`);
			return;
		}

		createRequest(
			{
				serviceIds: selectedServices.map((s) => s.id),
				description: form.notes,
				preferredDate: form.date,
				preferredTime: form.time,
				urgency: form.urgency,
				fullName: form.fullName,
				phone: form.phone,
				email: form.email,
				address: form.address,
				city: form.city,
				area: form.area,
			},
			{
				onSuccess: (data) => setSuccessData(data),
			},
		);
	};

	if (isLoadingServices) {
		return (
			<div className="mx-auto flex max-w-[760px] items-center justify-center p-24 text-muted-foreground">
				Loading...
			</div>
		);
	}

	if (successData) {
		return (
			<div className="mx-auto max-w-[560px] px-4 py-16">
				<Card className="px-8 py-12 text-center">
					<div className="mx-auto flex h-14 w-14 items-center justify-center bg-[var(--badge-completed-bg)]">
						<Check className="h-6 w-6 text-success" strokeWidth={1.75} />
					</div>
					<h1 className="mt-6 text-[22px] font-normal tracking-[-0.2px]">
						Request Submitted — {successData.request_number}
					</h1>
					<p className="mt-2 text-[13px] text-muted-foreground">
						We'll assign a verified worker and contact you within 2 hours via
						phone or WhatsApp.
					</p>
					<div className="mt-2 inline-flex items-center gap-1.5 bg-[var(--badge-assigned-bg)] px-3 py-1 text-[12px] font-normal text-[var(--badge-assigned-fg)]">
						{selectedNames.length > 0 ? selectedNames.join(", ") : "Service"} · {form.area || form.city}
					</div>
					<div className="mt-8 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
						<Link to="/">
							<Button>Return to Home</Button>
						</Link>
					</div>
				</Card>
			</div>
		);
	}

	return (
		<div className="mx-auto max-w-[760px] px-4 py-10">
			{(invalidSlugs.length > 0 || selectedSlugs.length === 0) && (
				<div className="mb-5 rounded-lg border border-danger/20 bg-danger/5 p-4 text-[13px] text-danger">
					<div className="font-medium">We couldn't find those services.</div>
					{invalidSlugs.length > 0 ? (
						<div className="mt-1 text-[12px]">
							Invalid slugs: {invalidSlugs.join(", ")}
						</div>
					) : (
						<div className="mt-1 text-[12px]">
							No services selected.
						</div>
					)}
					<Link to="/" className="mt-2 inline-flex text-[12px] font-medium text-danger underline">
						Back to services
					</Link>
				</div>
			)}
			<Link
				to="/"
				className="mb-6 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground"
			>
				<ChevronLeft className="h-4 w-4" />
				All Services
			</Link>

			<PageHeader
				title={
					selectedNames.length > 0
						? `Book — ${selectedNames.join(", ")}`
						: "Book — Select a Service"
				}
				subtitle="Complete the steps below to submit your service request."
			/>

			<Card className="p-6">
				<div>
					<Stepper step={step} />
				</div>

				{step === 0 && (
					<div id="booking-service" className="space-y-4">
						<Field label="Services">
							<div className="flex flex-wrap gap-2">
								{selectedServices.length > 0 ? selectedServices.map((s) => (
									<span key={s.id} className="inline-flex items-center rounded-md bg-subtle px-2.5 py-1 text-[12px] font-medium text-primary">{s.name}</span>
								)) : (
									<span className="text-muted-foreground">No services selected</span>
								)}
							</div>
						</Field>
						<Field label="Description / Instructions (optional)">
							<TextArea
								rows={4}
								value={form.notes}
								onChange={(e) => patch("notes", e.target.value)}
								placeholder="Describe the problem or what needs to be done…"
							/>
						</Field>
						<div className="grid grid-cols-2 gap-3">
							<Field label="Preferred Date *">
								<TextInput
									id="booking-date"
									type="date"
									value={form.date}
									min={today}
									onChange={(e) => patch("date", e.target.value)}
								/>
							</Field>
							<Field label="Preferred Time *">
								<TextInput
									id="booking-time"
									type="time"
									value={form.time}
									onChange={(e) => patch("time", e.target.value)}
								/>
							</Field>
						</div>
						<Field label="Urgency *">
							<div className="flex gap-2">
								{(["standard", "urgent"] as RequestUrgency[]).map((u) => {
									const active = form.urgency === u;
									const isUrgent = u === "urgent";
									return (
										<button
											key={u}
											id={`urgency-${u}`}
											type="button"
											onClick={() => patch("urgency", u)}
											className={cn(
												"h-9 border px-4 capitalize text-[13px] font-medium transition-colors cb-focus",
												active && isUrgent
													? "border-warning text-warning bg-[var(--badge-pending-bg)]"
													: active
														? "border-primary text-primary bg-subtle"
														: "border-border text-muted-foreground hover:bg-subtle",
											)}
										>
											{u}
										</button>
									);
								})}
							</div>
						</Field>
					</div>
				)}

				{step === 1 && (
					<div className="space-y-4">
						<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
							<Field label="Full Name *">
								<TextInput
									id="contact-name"
									value={form.fullName}
									onChange={(e) => patch("fullName", e.target.value)}
									placeholder="e.g. Ali Hassan"
								/>
							</Field>
							<Field label="Phone / WhatsApp *">
								<TextInput
									id="contact-phone"
									value={form.phone}
									onChange={(e) => patch("phone", e.target.value)}
									placeholder="0300-0000000"
								/>
							</Field>
						</div>
						<Field label="Email Address (optional)">
							<TextInput
								id="contact-email"
								type="email"
								value={form.email}
								onChange={(e) => patch("email", e.target.value)}
								placeholder="you@example.com"
							/>
						</Field>
						<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
							<Field label="City *">
								<TextInput
									id="contact-city"
									value={form.city}
									onChange={(e) => patch("city", e.target.value)}
									placeholder="e.g. Islamabad"
								/>
							</Field>
							<Field label="Area / Neighbourhood *">
								<TextInput
									id="contact-area"
									value={form.area}
									onChange={(e) => patch("area", e.target.value)}
									placeholder="e.g. F-7, Bahria Town, Gulberg…"
								/>
							</Field>
						</div>
						<Field label="Full Address *">
							<TextArea
								id="contact-address"
								rows={3}
								value={form.address}
								onChange={(e) => patch("address", e.target.value)}
								placeholder="House/flat number, street, landmark…"
							/>
						</Field>
					</div>
				)}

				{step === 2 && (
					<div className="space-y-4 text-[13px]">
						<Section title="Service Details">
							<Row
								label="Service"
								value={selectedNames.length > 0 ? selectedNames.join(", ") : "—"}
							/>
							<Row label="Description" value={form.notes || "—"} />
							<Row label="Date" value={form.date} />
							<Row label="Time" value={form.time} />
							<Row
								label="Urgency"
								value={
									(<span className="capitalize">{form.urgency}</span>) as any
								}
							/>
						</Section>
						<Section title="Contact & Location">
							<Row label="Name" value={form.fullName || "—"} />
							<Row label="Phone" value={form.phone || "—"} />
							<Row label="Email" value={form.email || "—"} />
							<Row label="City" value={form.city || "—"} />
							<Row label="Area" value={form.area || "—"} />
							<Row label="Address" value={form.address || "—"} />
						</Section>

						{submitError && (
							<div className="border border-danger/20 bg-danger/5 p-3 text-[13px] text-danger">
								Submission failed: {submitError.message}
							</div>
						)}

						<div className="border border-border bg-subtle px-4 py-3 text-[12px] text-muted-foreground">
							A Allfix coordinator will call you within 2 hours to confirm
							the booking and share the assigned worker's details.
						</div>
					</div>
				)}

				<div className="mt-8 flex items-center justify-between">
					{step === 0 ? (
						<Button
							variant="outline"
							onClick={() => navigate("/")}
							disabled={isPending}
						>
							<ArrowLeft className="h-4 w-4" />
							Back
						</Button>
					) : (
						<Button
							variant="outline"
							onClick={() => setStep(step - 1)}
							disabled={isPending}
						>
							<ArrowLeft className="h-4 w-4" />
							Back
						</Button>
					)}

					{step < 2 ? (
						<Button id="booking-continue" onClick={() => setStep(step + 1)}>
							Continue
						</Button>
					) : (
						<Button
							id="booking-submit"
							className="min-w-[140px]"
							disabled={isPending || !canSubmit}
							onClick={handleSubmit}
						>
							{isPending ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								<Check className="h-4 w-4" />
							)}
							{isPending ? "Submitting..." : "Submit Request"}
						</Button>
					)}
				</div>
			</Card>
		</div>
	);
};

const Section = ({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) => (
	<div className="border-y border-border py-3 first:border-t-0">
		<div className="cb-label mb-2">{title}</div>
		<div className="space-y-1.5">{children}</div>
	</div>
);

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
	<div className="grid grid-cols-[140px_1fr] gap-2">
		<span className="text-muted-foreground">{label}</span>
		<span className="font-medium">{value}</span>
	</div>
);

export default Booking;
