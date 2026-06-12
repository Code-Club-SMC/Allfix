import { MapPin, Phone, Mail, Clock } from "lucide-react";

export default function Contact() {
	return (
		<div className="min-h-screen bg-surface">
			{/* Hero */}
			<section className="bg-gradient-to-b from-primary/5 to-surface px-6 py-16 text-center md:py-20 md:px-8">
				<div className="mx-auto max-w-3xl">
					<div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary">
						GET IN TOUCH
					</div>
					<h1 className="mt-6 text-4xl font-bold tracking-tight text-foreground md:text-5xl">
						Contact <span className="text-primary">Us</span>
					</h1>
					<p className="mt-4 text-base text-muted-foreground md:text-lg">
						Have questions? We'd love to hear from you. Visit our workshop or reach out directly.
					</p>
				</div>
			</section>

			{/* Contact Info Cards */}
			<section className="mx-auto max-w-[1200px] px-6 py-12 md:px-8">
				<div className="grid grid-cols-1 gap-6 md:grid-cols-3">
					<div className="rounded-xl border border-border/50 bg-surface p-6">
						<div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
							<Phone className="h-6 w-6 text-primary" />
						</div>
						<h3 className="mt-4 text-lg font-semibold text-foreground">Phone</h3>
						<p className="mt-2 text-sm text-muted-foreground">
							Call us for immediate assistance
						</p>
						<a
							href="tel:+923115333222"
							className="mt-3 inline-flex text-sm font-medium text-primary hover:underline"
						>
							+92 311 5333222
						</a>
					</div>

					<div className="rounded-xl border border-border/50 bg-surface p-6">
						<div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
							<Mail className="h-6 w-6 text-primary" />
						</div>
						<h3 className="mt-4 text-lg font-semibold text-foreground">Email</h3>
						<p className="mt-2 text-sm text-muted-foreground">
							Send us an email anytime
						</p>
						<a
							href="mailto:info@allfix.com.pk"
							className="mt-3 inline-flex text-sm font-medium text-primary hover:underline"
						>
							info@allfix.com.pk
						</a>
					</div>

					<div className="rounded-xl border border-border/50 bg-surface p-6">
						<div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
							<Clock className="h-6 w-6 text-primary" />
						</div>
						<h3 className="mt-4 text-lg font-semibold text-foreground">Working Hours</h3>
						<p className="mt-2 text-sm text-muted-foreground">
							Monday - Sunday
						</p>
						<span className="mt-3 inline-flex text-sm font-medium text-primary">
							24/7 Available
						</span>
					</div>
				</div>
			</section>

			{/* Address & Map */}
			<section className="mx-auto max-w-[1200px] px-6 pb-16 md:px-8">
				<div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
					{/* Address Info */}
					<div className="rounded-xl border border-border/50 bg-surface p-8">
						<h2 className="text-2xl font-bold text-foreground">Workshop Location</h2>
						<p className="mt-3 text-sm leading-relaxed text-muted-foreground">
							Visit our workshop for in-person consultations and service inquiries.
							Our team is ready to assist you with all your home maintenance needs.
						</p>

						<div className="mt-6 space-y-4">
							<div className="flex items-start gap-3">
								<MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
								<div>
									<div className="text-sm font-medium text-foreground">Address</div>
									<div className="mt-1 text-sm text-muted-foreground">
										Bahria Town, Islamabad
									</div>
								</div>
							</div>

							<div className="flex items-start gap-3">
								<Phone className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
								<div>
									<div className="text-sm font-medium text-foreground">Phone</div>
									<div className="mt-1 text-sm text-muted-foreground">
										+92 311 5333222
									</div>
								</div>
							</div>

							<div className="flex items-start gap-3">
								<Clock className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
								<div>
									<div className="text-sm font-medium text-foreground">Hours</div>
									<div className="mt-1 text-sm text-muted-foreground">
										Open 24/7 for emergency services
									</div>
								</div>
							</div>
						</div>
					</div>

					{/* Google Maps Embed */}
					<div className="overflow-hidden rounded-xl border border-border/50 bg-surface">
						<iframe
							src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3320.0!2d73.1238523!3d33.5497948!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x38df95f600e3d8d7%3A0x4c1d99f8d232185e!2sAllFix+maintenance+services!5e0!3m2!1sen!2spk!4v1234567890"
							width="100%"
							height="100%"
							style={{ border: 0, minHeight: "400px" }}
							allowFullScreen
							loading="lazy"
							referrerPolicy="no-referrer-when-downgrade"
							title="AllFix Workshop Location - Peshawar"
						/>
					</div>
				</div>
			</section>
		</div>
	);
}
