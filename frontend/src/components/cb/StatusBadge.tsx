import { cn } from "@/lib/utils";

// Maps both lowercase (from backend) and title-case variants to badge styles
const map: Record<string, string> = {
  // Request statuses
  pending:     "bg-amber-100 text-amber-700",
  assigned:    "bg-blue-100 text-blue-700",
  in_progress: "bg-violet-100 text-violet-700",
  completed:   "bg-emerald-100 text-emerald-700",
  invoiced:    "bg-teal-100 text-teal-700",

  // Invoice statuses
  draft: "bg-slate-100 text-slate-600",
  sent:  "bg-blue-100 text-blue-700",
  paid:  "bg-emerald-100 text-emerald-700",

  // Worker statuses
  active:   "bg-emerald-100 text-emerald-700",
  inactive: "bg-slate-100 text-slate-500",
  on_leave: "bg-amber-100 text-amber-700",

  // Urgency
  urgent:   "bg-red-100 text-red-700",
  standard: "bg-slate-100 text-slate-600",
};

// Human-readable labels for snake_case values
const labels: Record<string, string> = {
  in_progress: "In Progress",
  on_leave:    "On Leave",
};

export const StatusBadge = ({
  status,
  className,
}: {
  status: string;
  className?: string;
}) => {
  const key = (status || "").toLowerCase();
  const style = map[key] ?? "bg-slate-100 text-slate-600";
  const label = labels[key] ?? status;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium leading-4 capitalize",
        style,
        className,
      )}
    >
      {label}
    </span>
  );
};
