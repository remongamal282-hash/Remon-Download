import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Pause, Play, X, RotateCcw, Trash2, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Thumb } from "@/components/thumb";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { useI18n } from "@/lib/i18n";
import { initialQueue, type QueueItem } from "@/lib/mock-data";

export const Route = createFileRoute("/queue")({
  head: () => ({
    meta: [
      { title: "قائمة الانتظار — Remon Download" },
      {
        name: "description",
        content:
          "مدير قائمة الانتظار: إيقاف واستكمال وإلغاء وإعادة ترتيب التحميلات مع تقدم حي وسرعة ووقت متبقٍ.",
      },
      { property: "og:title", content: "قائمة الانتظار — Remon Download" },
      {
        property: "og:description",
        content: "تحكم كامل في التحميلات المتزامنة وترتيب قائمة الانتظار.",
      },
    ],
  }),
  component: QueuePage,
});

function QueuePage() {
  const { t } = useI18n();
  const [items, setItems] = useState<QueueItem[]>(initialQueue);
  const [concurrent, setConcurrent] = useState([3]);
  const [dragId, setDragId] = useState<string | null>(null);

  const update = (id: string, patch: Partial<QueueItem>) =>
    setItems((list) => list.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const reorder = (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    setItems((list) => {
      const from = list.findIndex((i) => i.id === dragId);
      const to = list.findIndex((i) => i.id === targetId);
      if (from < 0 || to < 0) return list;
      const next = [...list];
      const moved = next.splice(from, 1)[0];
      if (!moved) return list;
      next.splice(to, 0, moved);
      return next;
    });
  };

  return (
    <AppShell>
      <PageHeader title={t("queue.title")} subtitle={t("queue.subtitle")} />

      <div className="mb-5 rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-sm font-medium">
            {t("queue.concurrent")}: <span className="tabular-nums">{concurrent[0]}</span>
          </span>
          <Slider
            value={concurrent}
            onValueChange={setConcurrent}
            min={1}
            max={10}
            step={1}
            className="max-w-xs flex-1"
          />
          <span className="text-xs text-muted-foreground">{t("queue.reorder")}</span>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="rounded-xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
          {t("queue.empty")}
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={item.id}
              draggable
              onDragStart={() => setDragId(item.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => reorder(item.id)}
              className="rounded-xl border border-border bg-card p-4"
            >
              <div className="flex items-start gap-4">
                <GripVertical className="mt-6 size-4 shrink-0 cursor-grab text-muted-foreground" />
                <Thumb hue={item.hue} duration={item.duration} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="min-w-0 flex-1 truncate text-sm font-semibold">{item.title}</p>
                    <StatusBadge status={item.status} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.channel} · {item.quality} · {item.format}
                  </p>
                  <Progress value={item.progress} className="mt-3 h-2" />
                  <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground tabular-nums">
                    <span>{item.progress}%</span>
                    <span>
                      {item.sizeDone} / {item.sizeTotal}
                    </span>
                    <span>
                      {t("common.speed")}: {item.speed}
                    </span>
                    <span>
                      {t("common.eta")}: {item.eta}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap justify-end gap-2">
                {item.status === "paused" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => update(item.id, { status: "downloading", speed: "3.1 MB/s", eta: "01:20" })}
                  >
                    <Play className="size-3.5" />
                    {t("action.resume")}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={["completed", "failed", "canceled"].includes(item.status)}
                    onClick={() => update(item.id, { status: "paused", speed: "—", eta: "—" })}
                  >
                    <Pause className="size-3.5" />
                    {t("action.pause")}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => update(item.id, { status: "retrying", progress: 0 })}
                >
                  <RotateCcw className="size-3.5" />
                  {t("action.retry")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => update(item.id, { status: "canceled", speed: "—", eta: "—" })}
                >
                  <X className="size-3.5" />
                  {t("action.cancel")}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setItems((list) => list.filter((i) => i.id !== item.id));
                    toast(t("toast.cleared"));
                  }}
                >
                  <Trash2 className="size-3.5" />
                  {t("action.remove")}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
