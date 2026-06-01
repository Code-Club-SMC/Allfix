import { cn } from "@/lib/utils";

export const KpiCard = ({
  label, value, delta, deltaTone = "neutral", className, valueClassName,
}: {
  label: string;
  value: string | number;
  delta?: string;
  deltaTone?: "up" | "down" | "neutral";
  className?: string;
  valueClassName?: string;
}) => {
  const tone =
    deltaTone === "up" ? "text-success" :
    deltaTone === "down" ? "text-danger" :
    "text-muted-foreground";
  return (
    <div className={cn("rounded-lg border border-border bg-surface p-4", className)}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</div>
      <div className={cn("mt-2 text-[1.7rem] font-semibold leading-none tracking-[-0.02em] text-foreground", valueClassName)}>{value}</div>
      {delta && <div className={cn("mt-2 text-[12px]", tone)}>{delta}</div>}
    </div>
  );
};
