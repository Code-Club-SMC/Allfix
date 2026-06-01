import { ReactNode } from "react";

export const PageHeader = ({
  title, subtitle, actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) => (
  <div className="mb-4 flex flex-col gap-3 rounded-lg border border-border bg-surface px-4 py-3 md:flex-row md:items-end md:justify-between">
    <div className="max-w-3xl space-y-1.5">
      <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Allfix</div>
      <h1 className="font-heading text-[1.4rem] font-semibold tracking-[-0.02em] text-foreground md:text-[1.65rem]">{title}</h1>
      {subtitle && <p className="max-w-2xl text-[12px] text-muted-foreground md:text-[13px]">{subtitle}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2 md:justify-end">{actions}</div>}
  </div>
);
