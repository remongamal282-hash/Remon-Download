import type { DownloadStatus } from "@/lib/mock-data";
import { useI18n, type TKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const tone: Record<DownloadStatus, string> = {
  queued: "bg-muted text-muted-foreground",
  analyzing: "bg-accent text-accent-foreground",
  downloading: "bg-primary/15 text-primary",
  paused: "bg-warning/20 text-warning",
  merging: "bg-accent text-accent-foreground",
  converting: "bg-accent text-accent-foreground",
  completed: "bg-success/15 text-success",
  failed: "bg-destructive/15 text-destructive",
  canceled: "bg-muted text-muted-foreground",
  retrying: "bg-warning/20 text-warning",
};

export function StatusBadge({ status }: { status: DownloadStatus }) {
  const { t } = useI18n();
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        tone[status],
      )}
    >
      {t(`status.${status}` as TKey)}
    </span>
  );
}
