import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

export const EmptyState = ({
  icon: Icon, title, description, action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) => (
  <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-surface px-6 py-16 text-center">
    <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-subtle text-primary">
      <Icon className="h-7 w-7" strokeWidth={1.75} />
    </div>
    <h3 className="mt-4 text-[1rem] font-semibold tracking-[-0.02em] text-foreground">{title}</h3>
    {description && <p className="mt-2 max-w-sm text-[14px] leading-6 text-muted-foreground">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);
