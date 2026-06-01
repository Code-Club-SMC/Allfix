import type { CSSProperties, ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

export const SideDrawer = ({
  open, onClose, title, width = 480, children, footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  width?: number;
  children: ReactNode;
  footer?: ReactNode;
}) => {
  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className={cn(
          "w-[min(92vw,calc(100vw-1rem))] border-border p-0 sm:w-[min(90vw,480px)]",
          "data-[vaul-drawer-direction=right]:max-w-none"
        )}
        style={{ width: `min(90vw, ${width}px)` } as CSSProperties}
      >
        <SheetHeader className="flex-row items-start justify-between gap-4 border-b border-border px-4 py-3 text-left">
          <div className="space-y-0.5">
            <SheetTitle className="font-heading text-[0.98rem] tracking-[-0.01em] text-foreground">
              {title}
            </SheetTitle>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose} className="shrink-0">
            <X className="h-4 w-4" strokeWidth={1.75} />
            <span className="sr-only">Close</span>
          </Button>
        </SheetHeader>
        <div className="max-h-[calc(100dvh-9rem)] flex-1 overflow-y-auto px-4 py-3.5">
          {children}
        </div>
        {footer && (
          <SheetFooter className="border-t border-border bg-subtle/30 px-4 py-3">
            {footer}
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
};

export const CenteredModal = ({
  open, onClose, title, width = 640, children, footer, className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  width?: number;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) => {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "max-h-[min(90dvh,920px)] gap-0 overflow-hidden p-0",
          className
        )}
        style={{ width: `min(100vw - 1rem, ${width}px)` } as CSSProperties}
      >
        <DialogHeader className="flex-row items-start justify-between gap-4 border-b border-border px-4 py-3 text-left">
          <div className="space-y-0.5">
            <DialogTitle className="font-heading text-[0.98rem] tracking-[-0.01em] text-foreground">
              {title}
            </DialogTitle>
            <DialogDescription className="text-[12px] text-muted-foreground" />
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose} className="shrink-0">
            <X className="h-4 w-4" strokeWidth={1.75} />
            <span className="sr-only">Close</span>
          </Button>
        </DialogHeader>
        <div className="max-h-[calc(90dvh-9rem)] flex-1 overflow-y-auto px-4 py-3.5">
          {children}
        </div>
        {footer && <DialogFooter className="border-t border-border bg-subtle/30 px-4 py-3">{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  );
};
