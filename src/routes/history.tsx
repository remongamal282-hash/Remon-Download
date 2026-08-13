import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { FolderOpen, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Thumb } from "@/components/thumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";
import { historyItems } from "@/lib/mock-data";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "سجل التحميلات — Remon Download" },
      {
        name: "description",
        content:
          "سجل دائم لكل التحميلات المكتملة والفاشلة والملغاة مع بحث وإعادة تحميل بنفس الإعدادات.",
      },
      { property: "og:title", content: "سجل التحميلات — Remon Download" },
      {
        property: "og:description",
        content: "ابحث في سجل تحميلاتك وأعد تحميل أي فيديو بنفس الجودة والصيغة.",
      },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [items, setItems] = useState(historyItems);

  const filtered = items.filter((i) =>
    `${i.title} ${i.channel} ${i.date}`.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <AppShell>
      <PageHeader
        title={t("hist.title")}
        subtitle={t("hist.subtitle")}
        action={
          <Button
            variant="outline"
            onClick={() => {
              setItems([]);
              toast(t("toast.cleared"));
            }}
          >
            <Trash2 className="size-4" />
            {t("action.clearAll")}
          </Button>
        }
      />

      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("common.search")}
        className="mb-5 max-w-sm"
      />

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
          {t("hist.empty")}
        </p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-4"
            >
              <Thumb hue={item.hue} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{item.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.channel} · {item.quality} · {item.format} · {item.size} · {item.date}
                </p>
              </div>
              <StatusBadge status={item.status} />
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => toast.success(t("toast.added"))}>
                  <RotateCcw className="size-3.5" />
                  {t("action.redownload")}
                </Button>
                <Button size="sm" variant="ghost">
                  <FolderOpen className="size-3.5" />
                  {t("action.openFolder")}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setItems((l) => l.filter((i) => i.id !== item.id))}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
