import { cn } from "@/lib/utils";

export const initials = (name: string) =>
  name.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");

export const Avatar = ({ name, size = 32, className }: { name: string; size?: number; className?: string }) => (
  <span
    className={cn(
      "inline-flex items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground",
      className,
    )}
    style={{ width: size, height: size, fontSize: size * 0.38 }}
  >
    {initials(name)}
  </span>
);
