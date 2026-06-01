import { cn } from "@/lib/utils";
import { forwardRef } from "react";
import type { ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "outline" | "ghost" | "danger"; size?: "sm" | "md" }
>(({ variant = "primary", size = "md", className, ...props }, ref) => {
  const base = "inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors cb-focus disabled:pointer-events-none disabled:opacity-50";
  const sizes = size === "sm" ? "h-8 px-3 text-[12px]" : "h-9 px-3.5 text-[13px]";
  const variants = {
    primary: "bg-primary text-primary-foreground hover:bg-primary-light",
    outline: "border border-border bg-surface text-foreground hover:bg-subtle",
    ghost: "text-foreground hover:bg-subtle",
    danger: "bg-danger text-primary-foreground hover:bg-danger/90",
  }[variant];
  return <button ref={ref} className={cn(base, sizes, variants, className)} {...props} />;
});
Button.displayName = "Button";

export const Field = ({ label, hint, children, className }: { label?: string; hint?: string; children: React.ReactNode; className?: string }) => (
  <div className={cn("flex flex-col gap-1", className)}>
    {label && <span className="text-[12px] font-medium text-foreground">{label}</span>}
    {children}
    {hint && <span className="text-[11px] text-[hsl(var(--text-tertiary))]">{hint}</span>}
  </div>
);

const inputBase = "h-9 w-full rounded-md border border-border bg-surface px-3 text-[13px] text-foreground placeholder:text-[hsl(var(--text-tertiary))] transition-colors cb-focus focus:border-primary";

export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => <input ref={ref} className={cn(inputBase, className)} {...props} />
);
TextInput.displayName = "TextInput";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select ref={ref} className={cn(inputBase, "appearance-none pr-8", className)} {...props}>
      {children}
    </select>
  )
);
Select.displayName = "Select";

export const TextArea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} className={cn(inputBase, "h-auto py-2", className)} {...props} />
  )
);
TextArea.displayName = "TextArea";
