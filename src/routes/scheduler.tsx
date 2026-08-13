import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CalendarClock, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n, type TKey } from "@/lib/i18n";
import { initialSchedules, qualities, type Schedule } from "@/lib/mock-data";

export const Route = createFileRoute("/scheduler")({
  head: () => ({
    meta: [
      { title: "جدولة التحميلات — Remon Download" },
      {
        name: "description",
        content:
          "جدولة تحميلات يوتيوب لتاريخ ووقت مستقبلي مع تكرار مرة واحدة أو يومي أو أسبوعي.",
      },
      { property: "og:title", content: "جدولة التحميلات — Remon Download" },
      {
        property: "og:description",
        content: "اضبط مواعيد التحميل وسيتولى المؤقت الخلفي تنفيذها تلقائياً.",
      },
    ],
  }),
  component: SchedulerPage,
});

function SchedulerPage() {
  const { t } = useI18n();
  const [items, setItems] = useState<Schedule[]>(initialSchedules);
  const [url, setUrl] = useState("");
  const [when, setWhen] = useState("");
  const [repeat, setRepeat] = useState<Schedule["repeat"]>("once");
  const [quality, setQuality] = useState("1080p");

  const add = () => {
    setItems((l) => [
      ...l,
      {
        id: crypto.randomUUID(),
        title: url || "youtube.com/watch?v=…",
        when: when || "2026-08-20 12:00",
        repeat,
        quality,
      },
    ]);
    setUrl("");
    toast.success(t("toast.added"));
  };

  return (
    <AppShell>
      <PageHeader title={t("sched.title")} subtitle={t("sched.subtitle")} />

      <div className="grid gap-6 xl:grid-cols-[1fr_1.3fr]">
        <section className="rounded-xl border border-border bg-card p-5">
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">{t("dl.placeholder")}</Label>
              <Input value={url} onChange={(e) => setUrl(e.target.value)} dir="ltr" />
            </div>
            <div>
              <Label className="mb-2 block">{t("sched.when")}</Label>
              <Input
                type="datetime-local"
                value={when}
                onChange={(e) => setWhen(e.target.value)}
              />
            </div>
            <div>
              <Label className="mb-2 block">{t("sched.repeat")}</Label>
              <Select value={repeat} onValueChange={(v) => setRepeat(v as Schedule["repeat"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["once", "daily", "weekly"] as const).map((r) => (
                    <SelectItem key={r} value={r}>
                      {t(`sched.${r}` as TKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-2 block">{t("common.quality")}</Label>
              <Select value={quality} onValueChange={setQuality}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {qualities.map((q) => (
                    <SelectItem key={q} value={q}>
                      {q === "audio"
                        ? t("common.audioOnly")
                        : q === "best"
                          ? t("common.best")
                          : q}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={add}>
              <Plus className="size-4" />
              {t("sched.add")}
            </Button>
            <p className="text-xs text-muted-foreground">{t("sched.checkNote")}</p>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">{t("sched.pending")}</h2>
          <ul className="space-y-3">
            {items.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-4"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
                  <CalendarClock className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{s.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground tabular-nums" dir="ltr">
                    {s.when} · {s.quality}
                  </p>
                </div>
                <Badge variant="secondary">{t(`sched.${s.repeat}` as TKey)}</Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={t("action.remove")}
                  onClick={() => setItems((l) => l.filter((i) => i.id !== s.id))}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </AppShell>
  );
}
