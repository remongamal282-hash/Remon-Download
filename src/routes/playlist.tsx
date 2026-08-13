import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Thumb } from "@/components/thumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useI18n } from "@/lib/i18n";
import { playlistInfo, playlistVideos } from "@/lib/mock-data";

export const Route = createFileRoute("/playlist")({
  head: () => ({
    meta: [
      { title: "قوائم التشغيل — Remon Download" },
      {
        name: "description",
        content:
          "تحليل قوائم تشغيل يوتيوب الكاملة وتحديد الفيديوهات المطلوبة وتخطي غير المتاح منها تلقائياً.",
      },
      { property: "og:title", content: "قوائم التشغيل — Remon Download" },
      {
        property: "og:description",
        content: "حمّل قائمة التشغيل كاملة أو اختر فيديوهات محددة فقط.",
      },
    ],
  }),
  component: PlaylistPage,
});

function PlaylistPage() {
  const { t } = useI18n();
  const available = playlistVideos.filter((v) => v.available);
  const [selected, setSelected] = useState<string[]>(available.map((v) => v.id));

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <AppShell>
      <PageHeader title={t("pl.title")} subtitle={t("pl.subtitle")} />

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Thumb hue={280} className="h-24 w-40" />
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold">{playlistInfo.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {playlistInfo.channel} · {playlistInfo.count} {t("common.videos")} ·{" "}
              {selected.length} {t("pl.selected")}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => setSelected(available.map((v) => v.id))}>
            {t("action.selectAll")}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setSelected([])}>
            {t("action.deselectAll")}
          </Button>
          <Button size="sm" onClick={() => toast.success(t("toast.added"))}>
            {t("action.downloadSelected")} ({selected.length})
          </Button>
          <Button size="sm" variant="secondary" onClick={() => toast.success(t("toast.added"))}>
            {t("action.downloadAll")}
          </Button>
        </div>
      </div>

      <ul className="mt-5 space-y-2">
        {playlistVideos.map((v) => (
          <li
            key={v.id}
            className="flex items-center gap-4 rounded-xl border border-border bg-card p-3"
          >
            <Checkbox
              checked={selected.includes(v.id)}
              disabled={!v.available}
              onCheckedChange={() => toggle(v.id)}
            />
            <span className="w-6 text-xs tabular-nums text-muted-foreground">{v.index}</span>
            <Thumb hue={v.hue} duration={v.available ? v.duration : ""} className="h-14 w-24" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{v.title}</p>
              {!v.available ? (
                <p className="mt-0.5 text-xs text-destructive">{t("pl.skipReason")}</p>
              ) : null}
            </div>
            {!v.available ? <Badge variant="outline">{t("pl.unavailable")}</Badge> : null}
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
