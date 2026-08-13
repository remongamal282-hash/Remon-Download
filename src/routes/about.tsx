import { createFileRoute } from "@tanstack/react-router";
import { Mail, Phone, Youtube, ListVideo, CalendarClock, ListOrdered } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { useI18n, type TKey } from "@/lib/i18n";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "حول التطبيق — Remon Download" },
      {
        name: "description",
        content:
          "نبذة عن Remon Download ووظائفه الأساسية، مع بيانات التواصل: remongamal282@gmail.com و01067006714.",
      },
      { property: "og:title", content: "حول التطبيق — Remon Download" },
      {
        property: "og:description",
        content: "تعرّف على وظائف Remon Download وتواصل مع المطور مباشرة.",
      },
    ],
  }),
  component: AboutPage,
});

const features = [
  { key: "about.f1", icon: Youtube },
  { key: "about.f2", icon: ListVideo },
  { key: "about.f3", icon: CalendarClock },
  { key: "about.f4", icon: ListOrdered },
] as const;

function AboutPage() {
  const { t } = useI18n();

  return (
    <AppShell>
      <PageHeader title={t("about.title")} subtitle={t("about.subtitle")} />

      <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-base font-semibold">{t("about.contact")}</h2>
          <ul className="mt-4 space-y-3">
            <li>
              <a
                href="mailto:remongamal282@gmail.com"
                className="flex items-center gap-3 rounded-lg bg-surface-2 p-3 transition-colors hover:bg-accent"
              >
                <span className="grid size-9 place-items-center rounded-lg gradient-primary text-primary-foreground">
                  <Mail className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs text-muted-foreground">{t("about.email")}</span>
                  <span className="block truncate text-sm font-medium" dir="ltr">
                    remongamal282@gmail.com
                  </span>
                </span>
              </a>
            </li>
            <li>
              <a
                href="tel:+201067006714"
                className="flex items-center gap-3 rounded-lg bg-surface-2 p-3 transition-colors hover:bg-accent"
              >
                <span className="grid size-9 place-items-center rounded-lg gradient-primary text-primary-foreground">
                  <Phone className="size-4" />
                </span>
                <span>
                  <span className="block text-xs text-muted-foreground">{t("about.phone")}</span>
                  <span className="block text-sm font-medium tabular-nums" dir="ltr">
                    01067006714
                  </span>
                </span>
              </a>
            </li>
          </ul>
          <p className="mt-4 text-xs text-muted-foreground">
            {t("about.version")} 1.4.0 · yt-dlp 2026.07.21 · FFmpeg 7.1
          </p>
        </section>

        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-base font-semibold">{t("about.what")}</h2>
          <ul className="mt-4 space-y-3">
            {features.map((f) => (
              <li key={f.key} className="flex items-start gap-3 rounded-lg bg-surface-2 p-3">
                <f.icon className="mt-0.5 size-4 shrink-0 text-primary" />
                <p className="text-sm leading-relaxed">{t(f.key as TKey)}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </AppShell>
  );
}
