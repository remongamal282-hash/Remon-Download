import { Play } from "lucide-react";
import { cn } from "@/lib/utils";

export function Thumb({
  hue,
  duration,
  className,
}: {
  hue: number;
  duration?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-lg border border-border/60",
        className ?? "h-16 w-28",
      )}
      style={{
        backgroundImage: `linear-gradient(135deg, oklch(0.45 0.13 ${hue}), oklch(0.7 0.16 ${hue + 35}))`,
      }}
      aria-hidden
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <Play className="size-5 fill-current text-background/80" />
      </div>
      {duration ? (
        <span className="absolute bottom-1 end-1 rounded bg-background/80 px-1 text-[10px] font-medium tabular-nums text-foreground">
          {duration}
        </span>
      ) : null}
    </div>
  );
}
