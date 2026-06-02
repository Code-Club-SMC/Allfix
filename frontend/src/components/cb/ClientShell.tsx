import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Phone, Shield, MapPin } from "lucide-react";

export const ClientShell = ({ children }: { children: ReactNode }) => (
  <div className="flex min-h-dvh flex-col bg-background text-foreground">
    {/* ── Navbar ── */}
    <header className="sticky top-0 z-30 border-b border-border/60 bg-surface/80 backdrop-blur-xl">
      <div className="mx-auto flex h-[68px] max-w-[1280px] items-center justify-between px-5 md:px-8">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="flex h-[38px] w-[38px] items-center justify-center rounded-[10px] bg-primary shadow-sm transition-transform group-hover:scale-[1.04]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-primary-foreground">
              <path d="M14.7 6.3a1 1 0 0 0 0-1.4l-1-1a1 1 0 0 0-1.4 0l-9 9a1 1 0 0 0 0 1.4l1 1a1 1 0 0 0 1.4 0l9-9Z" fill="currentColor" opacity="0.9"/>
              <path d="M18.4 11.7a1 1 0 0 0 0-1.4l-1-1a1 1 0 0 0-1.4 0l-5 5a1 1 0 0 0 0 1.4l1 1a1 1 0 0 0 1.4 0l5-5Z" fill="currentColor" opacity="0.7"/>
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="font-display text-[17px] leading-none text-foreground">
              Allfix
            </span>
            <span className="text-[11px] font-normal tracking-[0.02em] text-muted-foreground mt-0.5">
              Home Services
            </span>
          </div>
        </Link>

        {/* Contact pill */}
        <a
          href="tel:+92300000000"
          className="group flex items-center gap-2 rounded-full border border-border/50 bg-surface/60 px-3.5 py-2 text-[12px] text-muted-foreground transition-all hover:border-primary/30 hover:bg-surface hover:text-foreground"
        >
          <Phone className="h-3.5 w-3.5 transition-transform group-hover:scale-110" strokeWidth={1.75} />
          <span className="hidden sm:inline font-medium">+92 300 000 0000</span>
        </a>
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
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-primary-foreground">
                  <path d="M14.7 6.3a1 1 0 0 0 0-1.4l-1-1a1 1 0 0 0-1.4 0l-9 9a1 1 0 0 0 0 1.4l1 1a1 1 0 0 0 1.4 0l9-9Z" fill="currentColor"/>
                </svg>
              </div>
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
