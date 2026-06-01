import { cn } from "@/lib/utils";

type Opt<T extends string> = { value: T; label: string };

export function SegmentedControl<T extends string>({
  value, onChange, options, className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: Opt<T>[];
  className?: string;
}) {
  return (
    <div className={cn("inline-flex items-center rounded-lg border border-border bg-surface p-1", className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn(
              "h-10 rounded-md px-4 text-[13px] font-medium transition-all cb-focus",
              active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-subtle hover:text-foreground",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
