import { ArrowLeft, Check, ChevronLeft, Loader2, Clock, MapPin, User } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams, useLocation } from "react-router-dom";
import {
	Button,
	Field,
	TextArea,
	TextInput,
} from "@/components/cb/Form";
import { useCreateRequest } from "@/hooks/useRequests";
import { useServices } from "@/hooks/useServices";
import { buildServiceSlugMap, cn } from "@/lib/utils";
import { RequestUrgency, ServiceRequest } from "@/types/api";

const STEPS = [
  { label: "Service Details", icon: Clock },
  { label: "Your Info", icon: User },
  { label: "Review", icon: Check },
];

const Stepper = ({ step }: { step: number }) => (
  <div className="mb-10 flex items-center justify-center">
    {STEPS.map(({ label, icon: Icon }, i) => {
      const done = i < step;
      const active = i === step;
      return (
        <div key={i} className="flex items-center">
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full border-[1.5px] transition-all",
              done
                ? "border-success bg-success text-primary-foreground"
                : active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border/70 bg-surface text-muted-foreground/50",
            )}>
              {done ? (
                <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
              ) : (
                <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
              )}
            </div>
            <span className={cn(
              "hidden text-[13px] font-medium sm:block",
              active ? "text-foreground" : done ? "text-foreground/70" : "text-muted-foreground/60",
            )}>
              {label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className="mx-4 h-px w-12 sm:w-20">
              <div className={cn(
                "h-full rounded-full transition-colors",
                done ? "bg-success/60" : "bg-border/50",
              )} />
            </div>
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

		const missing: string[] = [];
		if (!form.fullName.trim()) missing.push("Full name");
		if (!form.phone.trim()) missing.push("Phone");
		if (!form.city.trim()) missing.push("City");
		if (!form.area.trim()) missing.push("Area");
		if (!form.address.trim()) missing.push("Full address");
		if (missing.length > 0) {
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
				<Loader2 className="h-5 w-5 animate-spin text-primary" />
				<span className="ml-2 text-[13px]">Loading services...</span>
			</div>
		);
	}

	if (successData) {
		return (
			<div className="mx-auto max-w-[520px] px-5 py-20">
				<div className="rounded-2xl border border-border/60 bg-surface p-10 text-center shadow-[0_2px_20px_-4px_rgba(0,0,0,0.04)]">
					<div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--badge-completed-bg)]">
						<Check className="h-7 w-7 text-success" strokeWidth={1.75} />
					</div>
					<h1 className="mt-6 font-display text-[26px] leading-tight tracking-[-0.02em] text-foreground">
						Request submitted
					</h1>
					<p className="mt-1 font-mono text-[12px] font-medium tracking-wide text-muted-foreground">
						{successData.request_number}
					</p>
					<p className="mx-auto mt-4 max-w-[320px] text-[13px] leading-relaxed text-muted-foreground">
						We'll assign a verified worker and contact you within 2 hours via
						phone or WhatsApp.
					</p>
					<div className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[var(--badge-assigned-bg)] px-3.5 py-2 text-[12px] font-medium text-[var(--badge-assigned-fg)]">
						<span>{selectedNames.length > 0 ? selectedNames.join(", ") : "Service"}</span>
						<span className="text-[var(--badge-assigned-fg)]/40">·</span>
						<span className="flex items-center gap-1">
							<MapPin className="h-3 w-3" />
							{form.area || form.city}
						</span>
					</div>
					<div className="mt-10">
						<Link to="/">
							<Button className="h-10 px-6">Return to services</Button>
						</Link>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="mx-auto max-w-[720px] px-5 py-10 md:py-14">
			{(invalidSlugs.length > 0 || selectedSlugs.length === 0) && (
				<div className="mb-6 rounded-xl border border-danger/20 bg-danger/[0.03] p-5 text-[13px] text-danger">
					<div className="font-semibold">We couldn't find those services.</div>
					{invalidSlugs.length > 0 ? (
						<div className="mt-1.5 text-[12px] text-danger/80">
							Invalid: {invalidSlugs.join(", ")}
						</div>
					) : (
						<div className="mt-1.5 text-[12px] text-danger/80">No services selected.</div>
					)}
					<Link to="/" className="mt-3 inline-flex text-[12px] font-semibold text-danger underline underline-offset-2">
						Back to services
					</Link>
				</div>
			)}

			<Link
				to="/"
				className="mb-8 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
			>
				<ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
				All Services
			</Link>

			{/* Header */}
			<div className="mb-8">
				<h1 className="font-display text-[28px] leading-tight tracking-[-0.02em] text-foreground">
					{selectedNames.length > 0
						? `Book — ${selectedNames.join(", ")}`
						: "Book a Service"}
				</h1>
				<p className="mt-1.5 text-[13px] text-muted-foreground">
					Complete the steps below to submit your request.
				</p>
			</div>

			{/* Stepper */}
			<Stepper step={step} />

			{/* Form card */}
			<div className="rounded-2xl border border-border/60 bg-surface p-6 shadow-[0_1px_8px_-2px_rgba(0,0,0,0.04)] md:p-8">
				{step === 0 && (
					<div className="space-y-6">
						{/* Services display */}
						<div>
							<div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">
								Selected Services
							</div>
							<div className="flex flex-wrap gap-2">
								{selectedServices.length > 0 ? selectedServices.map((s) => (
									<span key={s.id} className="inline-flex items-center rounded-lg border border-primary/20 bg-primary/[0.04] px-3 py-1.5 text-[12px] font-semibold text-primary">
										{s.name}
									</span>
								)) : (
									<span className="text-[13px] text-muted-foreground">No services selected</span>
								)}
							</div>
						</div>

						{/* Description */}
						<Field label="Description / Instructions (optional)">
							<TextArea
								rows={4}
								value={form.notes}
								onChange={(e) => patch("notes", e.target.value)}
								placeholder="Describe the problem or what needs to be done…"
							/>
						</Field>

						{/* Date & Time row */}
						<div className="grid grid-cols-2 gap-4">
							<Field label="Preferred Date">
								<TextInput
									id="booking-date"
									type="date"
									value={form.date}
									min={today}
									onChange={(e) => patch("date", e.target.value)}
								/>
							</Field>
							<Field label="Preferred Time">
								<TextInput
									id="booking-time"
									type="time"
									value={form.time}
									onChange={(e) => patch("time", e.target.value)}
								/>
							</Field>
						</div>

						{/* Urgency */}
						<div>
							<div className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">
								Urgency
							</div>
							<div className="flex gap-2.5">
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
												"h-10 rounded-lg border px-5 capitalize text-[13px] font-medium transition-all",
												active && isUrgent
													? "border-warning/40 text-warning bg-[var(--badge-pending-bg)]"
													: active
														? "border-primary/40 text-primary bg-primary/[0.04]"
														: "border-border/60 text-muted-foreground hover:border-border hover:bg-subtle/50",
											)}
										>
											{u}
										</button>
									);
								})}
							</div>
						</div>
					</div>
				)}

				{step === 1 && (
					<div className="space-y-6">
						{/* Contact section */}
						<div>
							<div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">
								Contact Information
							</div>
							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
							<div className="mt-4">
								<Field label="Email Address (optional)">
									<TextInput
										id="contact-email"
										type="email"
										value={form.email}
										onChange={(e) => patch("email", e.target.value)}
										placeholder="you@example.com"
									/>
								</Field>
							</div>
						</div>

						{/* Divider */}
						<div className="border-t border-border/40" />

						{/* Location section */}
						<div>
							<div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">
								Service Location
							</div>
							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
								<Field label="City *">
									<TextInput
										id="contact-city"
										value={form.city}
										onChange={(e) => patch("city", e.target.value)}
										placeholder="e.g. Islamabad"
									/>
								</Field>
								<Field label="Area / Sector *">
									<TextInput
										id="contact-area"
										value={form.area}
										onChange={(e) => patch("area", e.target.value)}
										placeholder="e.g. F-7, E-11, G-10…"
									/>
								</Field>
							</div>
							<div className="mt-4">
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
						</div>
					</div>
				)}

				{step === 2 && (
					<div className="space-y-0">
						<ReviewSection title="Service Details">
							<ReviewRow label="Service" value={selectedNames.length > 0 ? selectedNames.join(", ") : "—"} />
							<ReviewRow label="Description" value={form.notes || "—"} />
							<ReviewRow label="Date" value={form.date} />
							<ReviewRow label="Time" value={form.time} />
							<ReviewRow label="Urgency" value={<span className="capitalize">{form.urgency}</span>} />
						</ReviewSection>
						<ReviewSection title="Contact & Location" isLast>
							<ReviewRow label="Name" value={form.fullName || "—"} />
							<ReviewRow label="Phone" value={form.phone || "—"} />
							<ReviewRow label="Email" value={form.email || "—"} />
							<ReviewRow label="City" value={form.city || "—"} />
							<ReviewRow label="Area" value={form.area || "—"} />
							<ReviewRow label="Address" value={form.address || "—"} />
						</ReviewSection>

						{submitError && (
							<div className="mt-4 rounded-lg border border-danger/20 bg-danger/[0.03] p-4 text-[13px] text-danger">
								Submission failed: {submitError.message}
							</div>
						)}

						<div className="mt-6 rounded-lg border border-border/40 bg-subtle/30 px-4 py-3 text-[12px] leading-relaxed text-muted-foreground">
							An Allfix coordinator will call you within 2 hours to confirm
							the booking and share the assigned worker's details.
						</div>
					</div>
				)}

				{/* Navigation buttons */}
				<div className="mt-8 flex items-center justify-between border-t border-border/40 pt-6">
					<Button
						variant="outline"
						onClick={() => step === 0 ? navigate("/") : setStep(step - 1)}
						disabled={isPending}
						className="h-10 gap-2"
					>
						<ArrowLeft className="h-4 w-4" />
						{step === 0 ? "Back" : "Back"}
					</Button>

					{step < 2 ? (
						<Button id="booking-continue" onClick={() => setStep(step + 1)} className="h-10 px-6">
							Continue
						</Button>
					) : (
						<Button
							id="booking-submit"
							className="h-10 min-w-[160px] gap-2"
							disabled={isPending || !canSubmit}
							onClick={handleSubmit}
						>
							{isPending ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								<Check className="h-4 w-4" strokeWidth={2} />
							)}
							{isPending ? "Submitting..." : "Submit Request"}
						</Button>
					)}
				</div>
			</div>
		</div>
	);
};

const ReviewSection = ({
	title,
	children,
	isLast,
}: {
	title: string;
	children: React.ReactNode;
	isLast?: boolean;
}) => (
	<div className={cn("py-5", !isLast && "border-b border-border/30")}>
		<div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">
			{title}
		</div>
		<div className="space-y-2">{children}</div>
	</div>
);

const ReviewRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
	<div className="grid grid-cols-[120px_1fr] gap-3 text-[13px]">
		<span className="text-muted-foreground">{label}</span>
		<span className="font-medium text-foreground">{value}</span>
	</div>
);

export default Booking;
