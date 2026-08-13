import { createFileRoute, Link } from "@tanstack/react-router";
import { Download, ListOrdered, History as HistoryIcon, HardDriveDownload, Activity, Clock } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Thumb } from "@/components/thumb";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useI18n } from "@/lib/i18n";
import { initialQueue, historyItems } from "@/lib/mock-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Remon Download — لوحة تحكم تحميل يوتيوب" },
      {
        name: "description",
        content:
          "لوحة تحكم Remon Download: إحصائيات التحميل اليومية، التحميلات النشطة، وقائمة الانتظار في مكان واحد.",
      },
      { property: "og:title", content: "Remon Download — لوحة التحكم" },
      {
        property: "og:description",
        content: "تابع تحميلات يوتيوب النشطة وقائمة الانتظار والنشاط الحديث.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { t } = useI18n();

  const stats = [
    { label: t("dash.today"), value: "14", icon: HardDriveDownload },
    { label: t("dash.active"), value: "3", icon: Activity },
    { label: t("dash.queued"), value: String(initialQueue.length), icon: Clock },
    { label: t("dash.sizeToday"), value: "8.4 GB", icon: Download },
  ];

  return (
    <AppShell>
      <PageHeader title={t("dash.title")} subtitle={t("dash.subtitle")} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-border bg-card p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{s.label}</span>
              <s.icon className="size-4 text-primary" />
            </div>
            <p className="mt-3 text-3xl font-bold tabular-nums">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-lg font-semibold">{t("dash.recent")}</h2>
          <ul className="mt-4 divide-y divide-border">
            {[...initialQueue.slice(0, 3), ...historyItems.slice(0, 4)].map((item) => (
              <li key={item.id} className="flex items-center gap-4 py-3">
                <Thumb hue={item.hue} className="h-12 w-20" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {item.channel} · {item.quality} · {item.format}
                  </p>
                  {"progress" in item && item.status === "downloading" ? (
                    <Progress value={item.progress} className="mt-2 h-1.5" />
                  ) : null}
                </div>
                <StatusBadge status={item.status} />
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-lg font-semibold">{t("dash.quick")}</h2>
          <div className="mt-4 flex flex-col gap-3">
            <Button asChild size="lg">
              <Link to="/download">
                <Download className="size-4" />
                {t("nav.download")}
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/queue">
                <ListOrdered className="size-4" />
                {t("nav.queue")}
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/history">
                <HistoryIcon className="size-4" />
                {t("nav.history")}
              </Link>
            </Button>
          </div>
          <div className="mt-6 rounded-lg bg-surface-2 p-4">
            <p className="text-xs font-semibold text-muted-foreground">
              Queued → Analyzing → Downloading → Paused/Merging → Converting → Completed
            </p>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
