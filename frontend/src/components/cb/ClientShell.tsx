import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { MessageCircle, Phone, Shield, MapPin, ShoppingCart } from "lucide-react";
import { useCartStore, computeItemCount } from "@/state/cart";

export const ClientShell = ({ children }: { children: ReactNode }) => {
	const items = useCartStore((state) => state.items);
	const toggleCart = useCartStore((state) => state.toggleCart);
	const itemCount = computeItemCount(items);

	return (
		<div className="flex min-h-dvh flex-col bg-background text-foreground">
			{/* ─ Navbar ── */}
			<header className="sticky top-0 z-30 border-b border-border/60 bg-surface/80 backdrop-blur-xl">
				<div className="mx-auto flex h-[68px] max-w-[1280px] items-center justify-between px-5 md:px-8">
					{/* Brand */}
				<Link to="/" className="flex items-center gap-2.5 group">
					<img src="/allfix-logo.jpeg" alt="Allfix" className="h-[38px] w-[38px] rounded-[10px] object-cover shadow-sm transition-transform group-hover:scale-[1.04]" />
					<div className="flex flex-col">
						<span className="font-display text-[17px] leading-none text-foreground">
							Allfix
						</span>
						<span className="text-[11px] font-normal tracking-[0.02em] text-muted-foreground mt-0.5">
							Home Services
						</span>
					</div>
				</Link>

					{/* Nav Links */}
					<nav className="hidden items-center gap-6 md:flex">
						<Link to="/" className="text-sm font-medium text-foreground hover:text-primary">
							Home
						</Link>
						<Link to="/contact" className="text-sm font-medium text-muted-foreground hover:text-foreground">
							Contact
						</Link>
					</nav>

					{/* Contact pills & Cart */}
					<div className="flex items-center gap-2">
						<a
							href="tel:+923115333222"
							aria-label="Call us"
							className="group hidden sm:flex items-center gap-2 rounded-full border border-border/50 bg-surface/60 px-3.5 py-2 text-[12px] text-muted-foreground transition-all hover:border-primary/30 hover:bg-surface hover:text-foreground"
						>
							<Phone className="h-3.5 w-3.5 transition-transform group-hover:scale-110" strokeWidth={1.75} />
							<span className="font-medium">+92 311 5333222</span>
						</a>
						<a
							href="https://wa.me/923115333222"
							target="_blank"
							rel="noopener noreferrer"
							aria-label="Chat on WhatsApp"
							className="group hidden sm:flex items-center gap-2 rounded-full border border-border/50 bg-[#25D366]/10 px-3.5 py-2 text-[12px] text-muted-foreground transition-all hover:border-[#25D366]/40 hover:bg-[#25D366]/15 hover:text-foreground"
						>
							<MessageCircle className="h-3.5 w-3.5 text-[#25D366] transition-transform group-hover:scale-110" strokeWidth={1.75} />
							<span className="font-medium">WhatsApp</span>
						</a>
						<button
							onClick={toggleCart}
							className="relative rounded-full p-2 text-muted-foreground transition-colors hover:bg-subtle hover:text-foreground"
							aria-label="View cart"
						>
							<ShoppingCart className="h-5 w-5" />
							{itemCount > 0 && (
								<span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
									{itemCount}
								</span>
							)}
						</button>
					</div>
				</div>
			</header>

			{/* ── Page content ── */}
			<main className="flex-1">
				{children}
			</main>

			{/* ── Footer ── */}
			<footer className="border-t border-border/60 bg-surface/40">
				<div className="mx-auto max-w-[1280px] px-5 md:px-8">
					<div className="grid grid-cols-1 gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
						{/* Brand column */}
						<div className="space-y-4">
							<div className="flex items-center gap-2.5">
								<img src="/allfix-logo.jpeg" alt="Allfix" className="h-7 w-7 rounded-md object-cover" />
								<span className="font-display text-[15px] text-foreground">Allfix</span>
							</div>
							<p className="text-[12px] leading-relaxed text-muted-foreground max-w-[220px]">
								Skilled, vetted craftsmen for your home.
								Book in under a minute.
							</p>
						</div>

						{/* Services */}
						<div className="space-y-3">
							<div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Services</div>
							<div className="flex flex-col gap-2">
								{["Electrician", "Plumber", "Carpenter", "Painter", "Cleaning"].map((s) => (
									<span key={s} className="text-[12px] text-muted-foreground/80 hover:text-foreground transition-colors cursor-default">{s}</span>
								))}
							</div>
						</div>

						{/* Coverage */}
						<div className="space-y-3">
							<div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Coverage</div>
							<div className="flex flex-col gap-2">
								{[
									{ icon: MapPin, text: "Islamabad" },
									{ icon: MapPin, text: "F-6 through F-11" },
									{ icon: MapPin, text: "G-6 through G-15" },
									{ icon: MapPin, text: "E-7 through E-11" },
								].map(({ icon: Icon, text }) => (
									<div key={text} className="flex items-center gap-1.5 text-[12px] text-muted-foreground/80">
										<Icon className="h-3 w-3 text-primary/60" strokeWidth={1.5} />
										{text}
									</div>
								))}
							</div>
						</div>

						{/* Trust */}
						<div className="space-y-3">
							<div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Trust & Safety</div>
							<div className="flex flex-col gap-2">
								{[
									{ icon: Shield, text: "Vetted workers" },
									{ icon: Shield, text: "Insured services" },
									{ icon: Shield, text: "Secure payments" },
								].map(({ icon: Icon, text }) => (
									<div key={text} className="flex items-center gap-1.5 text-[12px] text-muted-foreground/80">
										<Icon className="h-3 w-3 text-primary/60" strokeWidth={1.5} />
										{text}
									</div>
								))}
							</div>
						</div>
					</div>

					{/* Bottom bar */}
					<div className="flex flex-col items-center justify-between gap-3 border-t border-border/40 py-5 sm:flex-row">
						<span className="text-[11px] text-muted-foreground/70">© 2025 Allfix — Islamabad</span>
						<span className="text-[11px] text-muted-foreground/70">All rights reserved</span>
					</div>
				</div>
			</footer>
		</div>
	);
};
