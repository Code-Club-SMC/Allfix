import * as Icons from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useServices } from "@/hooks/useServices";
import { buildServiceSlugMap, cn } from "@/lib/utils";

// ── Icon resolution ──────────────────────────────────────────────────────────
// DB stores lowercase lucide names (zap, droplets, hammer…).
// Some are aliases (grid→Grid3x3, settings→Settings2, square→Square).
const NAME_TO_ICON: Record<string, keyof typeof Icons> = {
  electrician: "Zap",
  plumber: "Droplets",
  welder: "Flame",
  carpenter: "Hammer",
  sweeper: "Wind",
  painter: "Paintbrush",
  "rock wall": "Layers",
  "texture & graphy": "Palette",
  "tile works": "Grid3X3",
  "ceiling works": "Square",
  "appliances repair": "Settings2",
  "sofa & carpet cleaning": "Sparkles",
};

const ACCENT_BY_NAME: Record<string, { bg: string; fg: string; ring: string }> =
{
  electrician: {
    bg: "bg-amber-50",
    fg: "text-amber-700",
    ring: "ring-amber-200/60",
  },
  plumber: { bg: "bg-sky-50", fg: "text-sky-700", ring: "ring-sky-200/60" },
  welder: {
    bg: "bg-orange-50",
    fg: "text-orange-700",
    ring: "ring-orange-200/60",
  },
  carpenter: {
    bg: "bg-yellow-50",
    fg: "text-yellow-800",
    ring: "ring-yellow-200/60",
  },
  sweeper: {
    bg: "bg-teal-50",
    fg: "text-teal-700",
    ring: "ring-teal-200/60",
  },
  painter: {
    bg: "bg-violet-50",
    fg: "text-violet-700",
    ring: "ring-violet-200/60",
  },
  "rock wall": {
    bg: "bg-stone-100",
    fg: "text-stone-700",
    ring: "ring-stone-200/60",
  },
  "texture & graphy": {
    bg: "bg-pink-50",
    fg: "text-pink-700",
    ring: "ring-pink-200/60",
  },
  "tile works": {
    bg: "bg-cyan-50",
    fg: "text-cyan-700",
    ring: "ring-cyan-200/60",
  },
  "ceiling works": {
    bg: "bg-indigo-50",
    fg: "text-indigo-700",
    ring: "ring-indigo-200/60",
  },
  "appliances repair": {
    bg: "bg-emerald-50",
    fg: "text-emerald-700",
    ring: "ring-emerald-200/60",
  },
  "sofa & carpet cleaning": {
    bg: "bg-rose-50",
    fg: "text-rose-700",
    ring: "ring-rose-200/60",
  },
};

const FALLBACK_ACCENT = {
  bg: "bg-subtle",
  fg: "text-muted-foreground",
  ring: "ring-border/40",
};

function getIcon(name: string): Icons.LucideIcon {
  const key = name.toLowerCase().trim();
  const iconName = NAME_TO_ICON[key];
  if (iconName && Icons[iconName]) return Icons[iconName] as Icons.LucideIcon;
  // Fallback: try capitalizing the raw icon field
  return Icons.Wrench;
}

function getAccent(name: string) {
  return ACCENT_BY_NAME[name.toLowerCase().trim()] ?? FALLBACK_ACCENT;
}

// ── Component ────────────────────────────────────────────────────────────────

interface ServiceItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  parent_id?: string | null;
  is_subcategory?: boolean;
}

const Catalog = () => {
  const {
    data: services,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useServices();
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const navigate = useNavigate();

  const selectedIds = Object.entries(selected)
    .filter(([, v]) => v)
    .map(([k]) => k);
  const { slugById } = buildServiceSlugMap(services ?? []);
  const selectedSlugs = selectedIds
    .map((id) => slugById[id])
    .filter((slug): slug is string => !!slug);
  const canProceed = selectedSlugs.length > 0;

  const toggleService = (id: string) =>
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));

  const handleProceed = () => {
    if (!canProceed) return;
    navigate(
      `/book?services=${selectedSlugs.map(encodeURIComponent).join(",")}`,
    );
  };

  const groupedServices = useMemo(() => {
    const all = (services || []) as ServiceItem[];
    const categories = all.filter((s) => !s.is_subcategory);
    const subcategories = all.filter((s) => s.is_subcategory);
    const groups: { category: ServiceItem; subs: ServiceItem[] }[] = [];
    categories.forEach((cat) => {
      const subs = subcategories.filter((s) => s.parent_id === cat.id);
      groups.push({ category: cat, subs });
    });
    const orphanedSubs = subcategories.filter(
      (s) => !categories.some((c) => c.id === s.parent_id),
    );
    if (orphanedSubs.length > 0) {
      groups.push({
        category: {
          id: "orphaned",
          name: "Other Services",
          description: "",
          icon: "wrench",
        },
        subs: orphanedSubs,
      });
    }
    return groups;
  }, [services]);

  const visibleGroups = useMemo(() => {
    if (activeCategory === "all") return groupedServices;
    return groupedServices.filter((g) => g.category.id === activeCategory);
  }, [groupedServices, activeCategory]);

  // ── Service card ───────────────────────────────────────────────────────────
  const renderCard = (s: ServiceItem) => {
    const Icon = getIcon(s.name);
    const accent = getAccent(s.name);
    const isSel = !!selected[s.id];

    return (
      <div key={s.id} className="relative group/card">
        <div
          role="button"
          tabIndex={0}
          onClick={() => toggleService(s.id)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") toggleService(s.id);
          }}
          className={cn(
            "relative flex items-center gap-5 overflow-hidden rounded-xl border bg-surface transition-all duration-300 cursor-pointer select-none",
            "hover:-translate-y-[3px]",
            isSel
              ? "border-primary/50 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.1)]"
              : "border-border/50 shadow-[0_1px_4px_-1px_rgba(0,0,0,0.03)] hover:border-border/80 hover:shadow-[0_8px_24px_-6px_rgba(0,0,0,0.07)]",
          )}
        >
          {/* Left accent stripe */}
          <div
            className={cn(
              "absolute left-0 top-0 bottom-0 w-[3px] transition-all duration-300",
              accent.fg.replace("text-", "bg-"),
              isSel ? "opacity-100" : "opacity-0 group-hover/card:opacity-60",
            )}
          />

          {/* Icon badge — larger, more saturated */}
          <div
            className={cn(
              "flex h-[56px] w-[56px] shrink-0 items-center justify-center rounded-[14px] ring-1 transition-all duration-300 ml-4",
              "group-hover/card:scale-[1.08]",
              accent.bg,
              accent.fg,
              accent.ring,
              isSel && "scale-[1.08]",
            )}
          >
            <Icon className="h-[26px] w-[26px]" strokeWidth={1.4} />
          </div>

          {/* Text content */}
          <div className="min-w-0 flex-1 py-5 pr-5">
            <div className="flex items-center justify-between">
              <span className="text-[15px] font-semibold text-foreground leading-tight tracking-[-0.01em]">
                {s.name}
              </span>
              {/* Inline checkbox indicator */}
              <div
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-[5px] border-[1.5px] transition-all duration-200",
                  isSel
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border/70 bg-surface",
                )}
              >
                {isSel && <Icons.Check className="h-3 w-3" strokeWidth={3} />}
              </div>
            </div>
            <p className="mt-1.5 text-[12.5px] leading-[1.55] text-muted-foreground line-clamp-2">
              {s.description}
            </p>
          </div>
        </div>
      </div>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* ═══ Hero ═══ */}
      <section className="relative overflow-hidden bg-[hsl(24,35%,11%)] px-5 py-20 md:py-28 md:px-8">
        {/* Cross-hatch texture */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23fff' fill-opacity='1' fill-rule='evenodd'%3E%3Cpath d='M0 20L20 0h1v1L1 21v-1zM20 40L40 20h1v1L21 41v-1z'/%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        {/* Warm radial glow */}
        <div className="pointer-events-none absolute -top-32 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,hsl(26,38%,28%,0.3)_0%,transparent_65%)]" />
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

        <div className="relative mx-auto max-w-[640px] text-center">
          {/* Status pill */}
          <div className="inline-flex items-center gap-2.5 rounded-full border border-white/[0.06] bg-white/[0.03] px-4 py-1.5 backdrop-blur-sm">
            <span className="relative flex h-[7px] w-[7px]">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-[7px] w-[7px] rounded-full bg-emerald-400" />
            </span>
            <span className="text-[12px] font-medium text-white/50">
              Serving Islamabad · Same-day availability
            </span>
          </div>

          <h1 className="mt-8 font-display text-[clamp(36px,6vw,56px)] leading-[1.08] text-white">
            Home services,
            <br />
            <span className="text-[hsl(36,55%,62%)]">done right.</span>
          </h1>

          <p className="mx-auto mt-5 max-w-[400px] text-[14px] leading-[1.65] text-white/40">
            Book vetted craftsmen for any job. Select a service, fill the
            details, and we handle the rest.
          </p>

          <a
            href="#services"
            className="mt-8 inline-flex h-10 items-center gap-2 rounded-lg bg-white/[0.06] px-5 text-[13px] font-medium text-white/70 transition-all hover:bg-white/[0.1] hover:text-white"
          >
            Browse services
            <Icons.ArrowDown className="h-3.5 w-3.5" strokeWidth={2} />
          </a>
        </div>
      </section>

      {/* ═══ Service grid ═══ */}
      <section
        id="services"
        className="mx-auto max-w-[1120px] px-5 pb-20 pt-14 md:px-8"
      >
        <div className="mb-8">
          <h2 className="font-display text-[28px] tracking-[-0.02em] text-foreground">
            Choose a service
          </h2>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Select one or more — you can add more before booking.
          </p>
        </div>

        {/* Category tabs */}
        {!isLoading && !isError && groupedServices.length > 1 && (
          <div className="mb-8 flex flex-wrap gap-1.5">
            {[
              { id: "all", name: "All" },
              ...groupedServices
                .filter((g) => g.category.id !== "orphaned")
                .map((g) => g.category),
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  "relative rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-all",
                  activeCategory === cat.id
                    ? "border-primary/30 bg-primary/[0.08] text-foreground"
                    : "border-transparent text-muted-foreground hover:bg-subtle/60 hover:text-foreground",
                )}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-xl bg-subtle/50"
              />
            ))}
          </div>
        ) : isError ? (
          <div className="rounded-xl border border-danger/20 bg-danger/[0.03] p-8 text-center text-[14px] text-danger flex flex-col items-center justify-center gap-4">
            <span>Failed to load services. Please try again.</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="border-danger/30 text-danger hover:bg-danger/[0.05] hover:text-danger flex items-center gap-2"
            >
              {isFetching ? (
                <>
                  <Spinner className="h-4 w-4 animate-spin" />
                  Retrying...
                </>
              ) : (
                <>
                  <Icons.RotateCw className="h-3.5 w-3.5" />
                  Try Again
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-12">
            {visibleGroups.map((group) => (
              <div key={group.category.id}>
                {/* Category header */}
                <div className="mb-4 flex items-center gap-3">
                  {(() => {
                    const CatIcon = getIcon(group.category.name);
                    return (
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-subtle ring-1 ring-border/30">
                        <CatIcon
                          className="h-3.5 w-3.5 text-muted-foreground"
                          strokeWidth={1.75}
                        />
                      </div>
                    );
                  })()}
                  <h3 className="text-[14px] font-semibold text-foreground">
                    {group.category.name}
                  </h3>
                  <div className="h-px flex-1 bg-border/30" />
                  <span className="text-[11px] font-medium text-muted-foreground/50">
                    {group.subs.length > 0
                      ? `${group.subs.length} service${group.subs.length > 1 ? "s" : ""}`
                      : null}
                  </span>
                </div>
                {/* Cards */}
                <div className="stagger-cards grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {(group.subs.length > 0 ? group.subs : [group.category]).map(
                    (s) => renderCard(s),
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ═══ How it works ═══ */}
      <section className="border-t border-border/40 bg-[hsl(30,33%,95%)]">
        <div className="mx-auto max-w-[1120px] px-5 py-16 md:px-8">
          <h2 className="mb-12 text-center font-display text-[26px] tracking-[-0.02em] text-foreground">
            How it works
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {[
              {
                icon: Icons.LayoutGrid,
                n: "01",
                t: "Pick a service",
                d: "Browse our catalogue of vetted trades. Select one or more.",
              },
              {
                icon: Icons.ClipboardList,
                n: "02",
                t: "Describe the job",
                d: "What needs to be done — date, time, and your address.",
              },
              {
                icon: Icons.CheckCircle2,
                n: "03",
                t: "We take it from here",
                d: "A coordinator assigns the right worker and confirms your booking.",
              },
            ].map(({ icon: Icon, n, t, d }) => (
              <div
                key={n}
                className="relative rounded-xl border border-border/30 bg-surface/80 px-6 py-7"
              >
                <span className="font-display text-[44px] leading-none text-primary/[0.07]">
                  {n}
                </span>
                <div className="mt-4 flex h-9 w-9 items-center justify-center rounded-lg bg-subtle ring-1 ring-border/20">
                  <Icon
                    className="h-[18px] w-[18px] text-primary"
                    strokeWidth={1.5}
                  />
                </div>
                <div className="mt-3 text-[14px] font-semibold text-foreground">
                  {t}
                </div>
                <div className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
                  {d}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ Trust strip ═══ */}
      <section className="border-t border-border/40 bg-surface/40">
        <div className="mx-auto flex max-w-[1120px] flex-wrap items-center justify-center gap-x-8 gap-y-3 px-5 py-6 md:px-8">
          {[
            "Vetted Workers",
            "Same-day Booking",
            "Islamabad-wide",
            "2-hour Confirmation",
          ].map((label) => (
            <div key={label} className="flex items-center gap-2.5">
              <div className="h-1.5 w-1.5 rounded-full bg-primary/25" />
              <span className="text-[12px] font-medium text-muted-foreground">
                {label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ Sticky cart ═══ */}
      <div className="fixed bottom-5 left-1/2 z-50 w-full max-w-[540px] -translate-x-1/2 px-4">
        <div
          className={cn(
            "mx-auto flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-surface/95 px-4 py-3 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.08)] backdrop-blur-xl transition-all duration-300",
            selectedIds.length === 0 &&
            "translate-y-3 opacity-0 pointer-events-none",
          )}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
              {selectedIds.length}
            </div>
            <span className="text-[13px] font-medium text-foreground">
              service{selectedIds.length > 1 ? "s" : ""} selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="rounded-lg px-3 py-2 text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => setSelected({})}
              disabled={selectedIds.length === 0}
            >
              Clear
            </button>
            <button
              className={cn(
                "rounded-lg px-5 py-2 text-[12px] font-semibold transition-all",
                canProceed
                  ? "bg-primary text-primary-foreground hover:bg-primary-light"
                  : "cursor-not-allowed bg-subtle text-muted-foreground",
              )}
              onClick={handleProceed}
              disabled={!canProceed}
            >
              Proceed to booking →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Catalog;
