import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const Tabs = ({
  value, onChange, options, className,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}) => (
  <div className={cn("flex items-center gap-1 rounded-md border border-border bg-surface p-1", className)}>
    {options.map((o) => {
      const active = o.value === value;
      return (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "relative h-8 rounded-sm px-3 text-[12px] font-medium transition-colors cb-focus",
            active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-subtle hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      );
    })}
  </div>
);

export const Card = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn("rounded-lg border border-border bg-surface", className)}>{children}</div>
);
