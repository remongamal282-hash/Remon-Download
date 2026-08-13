import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Download, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Thumb } from "@/components/thumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { favoriteItems } from "@/lib/mock-data";

export const Route = createFileRoute("/favorites")({
  head: () => ({
    meta: [
      { title: "المفضلة — Remon Download" },
      {
        name: "description",
        content: "فيديوهات محفوظة في المفضلة للتحميل السريع، مع تحديد غير المتاح منها تلقائياً.",
      },
      { property: "og:title", content: "المفضلة — Remon Download" },
      {
        property: "og:description",
        content: "احفظ الفيديوهات المهمة وحمّلها بضغطة واحدة لاحقاً.",
      },
    ],
  }),
  component: FavoritesPage,
});

function FavoritesPage() {
  const { t } = useI18n();
  const [items, setItems] = useState(favoriteItems);

  return (
    <AppShell>
      <PageHeader
        title={t("fav.title")}
        subtitle={t("fav.subtitle")}
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <article key={item.id} className="rounded-xl border border-border bg-card p-4">
            <Thumb hue={item.hue} className="h-32 w-full" />
            <h2 className="mt-3 line-clamp-2 text-sm font-semibold">{item.title}</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {item.channel} · {t("fav.added")} {item.added}
            </p>
            {!item.available ? (
              <Badge variant="outline" className="mt-2 text-destructive">
                {t("pl.unavailable")}
              </Badge>
            ) : null}
            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                className="flex-1"
                disabled={!item.available}
                onClick={() => toast.success(t("toast.added"))}
              >
                <Download className="size-3.5" />
                {t("action.download")}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                aria-label={t("action.remove")}
                onClick={() => setItems((l) => l.filter((i) => i.id !== item.id))}
              >
                <Star className="size-3.5 fill-current" />
              </Button>
            </div>
          </article>
        ))}
      </div>
    </AppShell>
  );
}
