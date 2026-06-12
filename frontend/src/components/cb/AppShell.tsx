import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Bell, ChevronRight, LogOut, X } from "lucide-react";

import { Avatar } from "@/components/cb/Avatar";
import { ReactNode, useState, useRef, useEffect } from "react";
import { useSession, useLogout } from "@/hooks/useAuth";
import { useAdminRequests } from "@/hooks/useAdmin";

const adminNav = [
  { section: "Overview", items: [
    { to: "/admin", label: "Dashboard", icon: "Home" },
    { to: "/admin/requests", label: "Requests", icon: "LayoutGrid" },
    { to: "/admin/invoices", label: "Invoices", icon: "FileText" },
  ]},
  { section: "Departments", items: [
    { to: "/admin/hr", label: "HR", icon: "Users" },
    { to: "/admin/finance", label: "Finance", icon: "DollarSign" },
    { to: "/admin/inventory", label: "Inventory", icon: "Package" },
    { to: "/admin/vendors", label: "Vendors", icon: "Truck" },
  ]},
  { section: "System", items: [
    { to: "/admin/settings", label: "Settings", icon: "Settings" },
  ]},
];

import * as Icons from "lucide-react";

const Sidebar = () => {
  const groups = adminNav;
  return (
    <aside className="hidden w-[260px] shrink-0 border-r border-border bg-surface md:flex md:flex-col">
      <div className="flex h-14 items-center border-b border-border px-5">
        <div className="flex items-center gap-2.5">
          <img src="/allfix-logo.jpeg" alt="Allfix" className="h-7 w-7 rounded-[4px] object-cover" />
          <span className="text-[15px] font-semibold tracking-tight">Allfix</span>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {groups.map((g, gi) => (
          <div key={gi} className={gi > 0 ? "mt-6" : ""}>
            <div className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              {g.section}
            </div>
            <div className="flex flex-col gap-1">
              {g.items.map((it) => {
                const Icon = (Icons as any)[it.icon] as Icons.LucideIcon;
                return (
                  <NavLink
                    key={it.to}
                    to={it.to}
                    end={it.to === "/admin" || it.to === "/client" || it.to === "/worker"}
                    className={({ isActive }) =>
                      `relative flex h-10 items-center gap-3 rounded-md px-3 text-[13px] font-medium transition-colors ${
                        isActive
                          ? "bg-subtle text-foreground before:absolute before:left-0 before:top-2 before:h-6 before:w-[3px] before:rounded-r-sm before:bg-primary"
                          : "text-muted-foreground hover:bg-subtle hover:text-foreground"
                      }`
                    }
                  >
                    {Icon && <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />}
                    <span>{it.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="border-t border-border px-5 py-3 text-[11px] text-muted-foreground">
        v1.0 · Islamabad office
      </div>
    </aside>
  );
};

const useBreadcrumb = () => {
  const { pathname } = useLocation();
  const parts = pathname.split("/").filter(Boolean);
  return parts.length === 0 ? ["Admin", "Dashboard"] : parts.map((p) => p.replace(/-/g, " "));
};

export const AppShell = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();
  const crumbs = useBreadcrumb();
  const { data: session } = useSession();
  const { mutate: logout } = useLogout();
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // Fetch pending requests for notifications
  const { data: pendingData } = useAdminRequests("pending", "all", "", 1);
  const pendingRequests: any[] = (pendingData as any)?.data?.slice(0, 5) || [];
  const pendingCount = (pendingData as any)?.total || 0;

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = () => {
    logout(undefined, {
      onSuccess: () => navigate("/admin/login", { replace: true }),
      onError: () => navigate("/admin/login", { replace: true }),
    });
  };

  return (
    <div className="flex min-h-dvh w-full bg-background text-foreground">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-surface px-4 md:px-5">
          <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
            {crumbs.map((c, i) => (
              <span key={i} className="flex items-center gap-1.5 capitalize">
                {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-text-tertiary" />}
                <span className={i === crumbs.length - 1 ? "text-foreground font-medium" : ""}>{c}</span>
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2.5">
            {/* Notification bell */}
            <div ref={notifRef} className="relative">
              <button
                onClick={() => setNotifOpen((o) => !o)}
                className="relative flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-subtle hover:text-foreground cb-focus"
                title="Notifications"
              >
                <Bell className="h-4 w-4" strokeWidth={1.75} />
                {pendingCount > 0 && (
                  <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[9px] font-bold text-primary-foreground">
                    {pendingCount > 9 ? "9+" : pendingCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 top-10 z-[70] w-[348px] overflow-hidden rounded-lg border border-border bg-surface">
                  <div className="flex items-center justify-between border-b border-border px-3.5 py-2.5">
                    <span className="text-[13px] font-semibold tracking-[-0.01em]">Pending Requests</span>
                    <button onClick={() => setNotifOpen(false)} className="text-muted-foreground hover:text-foreground">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="max-h-[320px] overflow-y-auto">
                    {pendingRequests.length === 0 ? (
                      <div className="px-4 py-5 text-center text-[12px] text-muted-foreground">
                        No pending requests
                      </div>
                    ) : (
                      pendingRequests.map((r: any) => (
                        <button
                          key={r.id}
                          onClick={() => { navigate("/admin/requests"); setNotifOpen(false); }}
                          className="flex w-full items-start gap-3 border-b border-border/60 px-3.5 py-2.5 text-left last:border-0 hover:bg-subtle"
                        >
                          <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-warning" />
                          <div className="min-w-0">
                            <div className="text-[12px] font-medium text-foreground truncate">
                              {r.request_number} · {r.service_name}
                            </div>
                            <div className="text-[11px] text-muted-foreground truncate">
                              {r.client_name} · {r.area}
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                  {pendingCount > 5 && (
                    <div className="border-t border-border px-4 py-3">
                      <button
                        onClick={() => { navigate("/admin/requests"); setNotifOpen(false); }}
                        className="text-[12px] font-medium text-primary hover:underline"
                      >
                        View all {pendingCount} pending requests →
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <Avatar name={session?.user?.name || "Admin"} size={28} />
            <span className="hidden text-[12px] text-muted-foreground md:block">
              {session?.user?.name || "Admin"}
            </span>
            <button
              onClick={handleLogout}
              title="Sign out"
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-subtle hover:text-foreground cb-focus"
            >
              <LogOut className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto px-4 py-4 md:px-5 md:py-5">
          {children}
        </main>
      </div>
    </div>
  );
};
