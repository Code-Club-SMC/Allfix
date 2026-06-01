import { useNavigate } from "react-router-dom";
import * as Icons from "lucide-react";
import { useServices } from "@/hooks/useServices";
import { useState, useMemo } from "react";
import { buildServiceSlugMap, cn } from "@/lib/utils";

// Map service keys → Lucide icon names
const ICON_MAP: Record<string, keyof typeof Icons> = {
  electrician: "Zap",
  plumber: "Droplets",
  welder: "Flame",
  carpenter: "Hammer",
  sweeper: "Wind",
  painter: "Paintbrush",
  "rock-wall": "Layers",
  "texture-graphy": "Palette",
  "tile-works": "Grid3x3",
  "ceiling-works": "Square",
  appliances: "Settings2",
  "sofa-carpet": "Sparkles",
};

// Warm accent colors per card for visual variety
const CARD_ACCENTS: Record<string, string> = {
  electrician: "text-amber-600 bg-amber-50",
  plumber: "text-blue-600 bg-blue-50",
  welder: "text-orange-600 bg-orange-50",
  carpenter: "text-yellow-700 bg-yellow-50",
  sweeper: "text-teal-600 bg-teal-50",
  painter: "text-violet-600 bg-violet-50",
  "rock-wall": "text-stone-600 bg-stone-100",
  "texture-graphy": "text-pink-600 bg-pink-50",
  "tile-works": "text-cyan-600 bg-cyan-50",
  "ceiling-works": "text-indigo-600 bg-indigo-50",
  appliances: "text-emerald-600 bg-emerald-50",
  "sofa-carpet": "text-rose-600 bg-rose-50",
};

interface ServiceItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  parent_id?: string | null;
  is_subcategory?: boolean;
}

const Catalog = () => {
  const { data: services, isLoading, isError } = useServices();
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const navigate = useNavigate();

  const selectedIds = Object.entries(selected).filter(([,v]) => v).map(([k]) => k);
  const { slugById } = buildServiceSlugMap(services ?? []);
  const selectedSlugs = selectedIds
    .map((id) => slugById[id])
    .filter((slug): slug is string => !!slug);
  const canProceed = selectedSlugs.length > 0;

  const toggleService = (id: string) => {
    setSelected((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleProceed = () => {
    if (!canProceed) return;
    const slugParam = selectedSlugs.map(encodeURIComponent).join(",");
    navigate(`/book?services=${slugParam}`);
  };

  // Group services by parent category
  const groupedServices = useMemo(() => {
    const all = (services || []) as ServiceItem[];
    const categories = all.filter((s) => !s.is_subcategory);
    const subcategories = all.filter((s) => s.is_subcategory);

    const groups: { category: ServiceItem; subs: ServiceItem[] }[] = [];

    categories.forEach((cat) => {
      const subs = subcategories.filter((s) => s.parent_id === cat.id);
      groups.push({ category: cat, subs });
    });

    // Also include orphaned subcategories (no matching parent) at top level
    const orphanedSubs = subcategories.filter((s) => {
      return !categories.some((c) => c.id === s.parent_id);
    });
    if (orphanedSubs.length > 0) {
      groups.push({
        category: { id: "orphaned", name: "Other Services", description: "", icon: "wrench" },
        subs: orphanedSubs,
      });
    }

    return groups;
  }, [services]);

  const visibleGroups = useMemo(() => {
    if (activeCategory === "all") return groupedServices;
    return groupedServices.filter((g) => g.category.id === activeCategory);
  }, [groupedServices, activeCategory]);

  const renderServiceCard = (s: ServiceItem, isSub = false) => {
    const lookupKey = s.name.toLowerCase().replace(/['& ]+/g, '-').replace(/-s-/g, 's-');
    const iconKey = s.icon ?? lookupKey;
    const Icon = (Icons[ICON_MAP[iconKey] || "Wrench"] as Icons.LucideIcon) || Icons.Wrench;
    const accent = CARD_ACCENTS[iconKey] || "text-current bg-subtle";
    return (
      <div key={s.id} className={cn("relative", isSub && "col-span-1")}>
        <label
          className="absolute right-3 top-3 z-10 inline-flex items-center"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={!!selected[s.id]}
            onChange={() => toggleService(s.id)}
            onClick={(e) => e.stopPropagation()}
            className="h-4 w-4"
          />
        </label>
        <div
          role="button"
          tabIndex={0}
          onClick={() => toggleService(s.id)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") toggleService(s.id);
          }}
          className={cn(
            "group relative flex flex-col rounded-xl border p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md",
            selected[s.id]
              ? "border-primary bg-subtle"
              : "border-border bg-surface",
            isSub && "p-4",
          )}
        >
          <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${accent}`}>
            <Icon className="h-5 w-5" strokeWidth={1.75} />
          </div>
          <div className="mt-4 flex-1">
            <div className="text-[14px] font-semibold text-foreground">
              {s.name}
            </div>
            <div className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{s.description}</div>
          </div>
          <div className="mt-4 flex items-center gap-1 text-[12px] font-semibold text-primary transition-all group-hover:gap-2">
            {selected[s.id] ? "Selected" : "Select"}
            <Icons.ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[hsl(26,38%,26%)] to-[hsl(26,38%,22%)] px-4 py-16 text-center md:py-24">
        <div className="pointer-events-none absolute -top-32 left-1/2 h-[480px] w-[480px] -translate-x-1/2 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-24 left-1/2 h-[320px] w-[320px] -translate-x-1/2 rounded-full bg-white/5" />
        <div className="relative mx-auto max-w-[720px]">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[12px] font-medium text-white/80 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Serving Karachi · Same-day Availability
          </span>
          <h1 className="mt-5 text-3xl font-bold leading-tight tracking-tight text-white md:text-5xl">
            Reliable Home Services,<br />
            <span className="text-[hsl(36,90%,70%)]">On Your Schedule</span>
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-white/70">
            Book skilled, vetted craftsmen for any job — from electrical repairs to deep cleaning.<br className="hidden md:block" />
            No hassle. Just select a service, fill in the details, and we'll handle the rest.
          </p>
        </div>
      </section>

      {/* ── Service Grid ── */}
      <section className="mx-auto max-w-[1280px] px-4 pb-16 pt-12 md:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-[20px] font-semibold text-foreground">Choose a Service</h2>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Select the type of work you need done.
            </p>
          </div>
          <span className="text-[12px] font-medium text-muted-foreground">
            {services?.length || 0} services available
          </span>
        </div>

        {/* Category tabs */}
        {!isLoading && !isError && groupedServices.length > 0 && (
          <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setActiveCategory("all")}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors",
                activeCategory === "all"
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-surface text-muted-foreground hover:bg-subtle",
              )}
            >
              All
            </button>
            {groupedServices
              .filter((group) => group.category.id !== "orphaned")
              .map((group) => (
                <button
                  key={group.category.id}
                  onClick={() => setActiveCategory(group.category.id)}
                  className={cn(
                    "shrink-0 rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors",
                    activeCategory === group.category.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-surface text-muted-foreground hover:bg-subtle",
                  )}
                >
                  {group.category.name}
                </button>
              ))}
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-40 animate-pulse rounded-xl bg-subtle" />
            ))}
          </div>
        ) : isError ? (
          <div className="rounded-xl border border-danger/20 bg-danger/5 p-6 text-center text-[14px] text-danger">
            Failed to load services. Please try again later.
          </div>
        ) : (
          <div className="space-y-10">
            {visibleGroups.map((group) => (
              <div key={group.category.id}>
                {/* Category header — always shown as non-selectable header */}
                <div className="mb-4 flex items-center gap-3">
                  <h3 className="text-[16px] font-semibold text-foreground">{group.category.name}</h3>
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-[11px] text-muted-foreground">
                    {group.subs.length > 0 ? `${group.subs.length} service${group.subs.length > 1 ? "s" : ""}` : "Category"}
                  </span>
                </div>
                {/* Sub-services grid — only sub-services are selectable */}
                {group.subs.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {group.subs.map((sub) => renderServiceCard(sub, true))}
                  </div>
                ) : (
                  /* Category with no sub-services — category itself is selectable */
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {renderServiceCard(group.category)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Sticky cart */}
      <div className="fixed bottom-4 left-1/2 z-50 w-full max-w-[1280px] -translate-x-1/2 px-4">
        <div className="mx-auto flex items-center justify-between gap-4 rounded-lg border border-border bg-surface p-3">
          <div className="flex items-center gap-3">
            <div className="text-[13px] font-semibold">
              {selectedIds.length} service{selectedIds.length > 1 ? "s" : ""} selected
            </div>
            <div className="text-[12px] text-muted-foreground">
              {canProceed
                ? "You can add more or proceed to booking"
                : "Select at least one service to proceed"}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              className={cn(
                "rounded-md border border-border bg-surface px-3 py-2 text-[13px]",
                selectedIds.length === 0 && "cursor-not-allowed opacity-50",
              )}
              onClick={() => setSelected({})}
              disabled={selectedIds.length === 0}
            >
              Clear
            </button>
            <button
              className={cn(
                "rounded-md px-4 py-2 text-[13px] font-semibold",
                canProceed
                  ? "bg-primary text-primary-foreground"
                  : "cursor-not-allowed bg-subtle text-muted-foreground",
              )}
              onClick={handleProceed}
              disabled={!canProceed}
            >
              Proceed to booking
            </button>
          </div>
        </div>
      </div>

      {/* ── How it works ── */}
      <section className="border-t border-border bg-surface px-4 py-14 md:px-8">
        <div className="mx-auto max-w-[1280px]">
          <h2 className="mb-10 text-center text-[20px] font-semibold text-foreground">
            How It Works
          </h2>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            {[
              { icon: Icons.LayoutGrid, step: "1", title: "Pick a Service", desc: "Choose from professional categories" },
              { icon: Icons.ClipboardList, step: "2", title: "Fill in Details", desc: "Describe the job, preferred date & your address" },
              { icon: Icons.CheckCircle2, step: "3", title: "We Handle the Rest", desc: "A vetted worker is assigned and notified" },
            ].map(({ icon: Icon, step, title, desc }) => (
              <div key={step} className="flex flex-col items-center text-center">
                <div className="relative flex h-14 w-14 items-center justify-center rounded-full border-2 border-primary/20 bg-subtle">
                  <Icon className="h-6 w-6 text-primary" strokeWidth={1.5} />
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {step}
                  </span>
                </div>
                <div className="mt-4 text-[14px] font-semibold text-foreground">{title}</div>
                <div className="mt-1 text-[13px] text-muted-foreground">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Catalog;
