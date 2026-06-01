import { cn } from "@/lib/utils";

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];

export const DayChips = ({
  value, onChange, size = "sm",
}: {
  value: boolean[];
  onChange?: (v: boolean[]) => void;
  size?: "sm" | "md";
}) => {
  const dim = size === "md" ? "h-9 w-9 text-[12px]" : "h-8 w-8 text-[11px]";
  return (
    <div className="inline-flex flex-wrap items-center gap-2">
      {DAYS.map((d, i) => {
        const active = value[i];
        return (
          <button
            key={i}
            type="button"
            onClick={() => onChange?.(value.map((v, idx) => (idx === i ? !v : v)))}
            className={cn(
              "inline-flex items-center justify-center rounded-full border font-medium transition-all cb-focus",
              dim,
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-surface text-muted-foreground hover:text-foreground",
              !onChange && "pointer-events-none",
            )}
          >
            {d}
          </button>
        );
      })}
    </div>
  );
};
