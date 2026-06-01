import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Wrench, Phone } from "lucide-react";

export const ClientShell = ({ children }: { children: ReactNode }) => (
  <div className="flex min-h-dvh flex-col bg-background text-foreground">
    {/* Top Navbar */}
    <header className="sticky top-0 z-30 border-b border-border bg-surface">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-4 md:px-8">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <Wrench className="h-4 w-4 text-primary-foreground" strokeWidth={1.75} />
          </div>
          <span className="text-[15px] font-semibold tracking-[-0.03em] text-foreground">
            All<span className="text-primary">fix</span>
          </span>
        </Link>

        {/* Contact */}
        <a
          href="tel:+92300000000"
          className="flex items-center gap-2 rounded-full border border-border/70 bg-surface px-3 py-2 text-[12px] text-muted-foreground hover:text-foreground"
        >
          <Phone className="h-3.5 w-3.5" strokeWidth={1.75} />
          <span className="hidden sm:inline">+92-300-000-0000</span>
        </a>
      </div>
    </header>

    {/* Page content */}
    <main className="flex-1">
      {children}
    </main>

    {/* Footer */}
    <footer className="border-t border-border/80 bg-surface/90">
      <div className="mx-auto flex max-w-[1280px] items-center justify-between px-4 py-4 md:px-8">
        <span className="text-[12px] text-muted-foreground">© 2025 Allfix · Karachi</span>
        <span className="text-[12px] text-muted-foreground">All rights reserved</span>
      </div>
    </footer>
  </div>
);
