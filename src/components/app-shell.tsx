import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Download,
  ListOrdered,
  ListVideo,
  History,
  Star,
  CalendarClock,
  Settings,
  Info,
  Languages,
  Moon,
  Sun,
  Clipboard,
  X,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useI18n, type TKey } from "@/lib/i18n";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", key: "nav.dashboard", icon: LayoutDashboard },
  { to: "/download", key: "nav.download", icon: Download },
  { to: "/queue", key: "nav.queue", icon: ListOrdered },
  { to: "/playlist", key: "nav.playlist", icon: ListVideo },
  { to: "/history", key: "nav.history", icon: History },
  { to: "/favorites", key: "nav.favorites", icon: Star },
  { to: "/scheduler", key: "nav.scheduler", icon: CalendarClock },
  { to: "/settings", key: "nav.settings", icon: Settings },
  { to: "/about", key: "nav.about", icon: Info },
] as const;

function ClipboardPrompt() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (window.sessionStorage.getItem("remon.clipDismissed")) return;
    const id = window.setTimeout(() => setOpen(true), 4000);
    return () => window.clearTimeout(id);
  }, []);

  if (!open) return null;

  const close = (remember?: boolean) => {
    if (remember) window.sessionStorage.setItem("remon.clipDismissed", "1");
    setOpen(false);
  };

  return (
    <div className="fixed bottom-5 end-5 z-50 w-[19rem] rounded-xl border border-border bg-popover p-4 shadow-[var(--shadow-elegant)]">
      <div className="flex items-start gap-3">
        <Clipboard className="mt-0.5 size-4 text-primary" />
        <div className="flex-1">
          <p className="text-sm font-semibold">{t("toast.clip")}</p>
          <p className="mt-1 text-xs text-muted-foreground">youtube.com/watch?v=dQw4w9…</p>
          <p className="mt-2 text-sm">{t("clip.question")}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={() => {
                toast.success(t("toast.added"));
                close();
              }}
            >
              {t("clip.yes")}
            </Button>
            <Button size="sm" variant="outline" onClick={() => close()}>
              {t("clip.no")}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => close(true)}>
              {t("clip.never")}
            </Button>
          </div>
        </div>
        <button onClick={() => close()} aria-label="close" className="text-muted-foreground">
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { t, toggleLang } = useI18n();
  const { isDark, setMode } = useTheme();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-[110rem]">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-e border-sidebar-border bg-sidebar p-4 lg:flex">
          <Link to="/" className="mb-6 flex items-center gap-3 px-2">
            <span className="grid size-10 place-items-center rounded-xl gradient-primary text-primary-foreground">
              <Download className="size-5" />
            </span>
            <span>
              <span className="block text-sm font-bold leading-tight">{t("app.name")}</span>
              <span className="block text-[11px] text-muted-foreground">{t("app.tagline")}</span>
            </span>
          </Link>
          <nav className="flex flex-1 flex-col gap-1">
            {nav.map((item) => {
              const active = pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50",
                  )}
                >
                  <item.icon className="size-4" />
                  {t(item.key as TKey)}
                </Link>
              );
            })}
          </nav>
          <p className="mt-4 rounded-lg bg-surface-2 p-3 text-[11px] leading-relaxed text-muted-foreground">
            {t("demo.notice")}
          </p>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border bg-background/85 px-4 py-3 backdrop-blur sm:px-8">
            <div className="flex items-center gap-2 lg:hidden">
              <span className="grid size-8 place-items-center rounded-lg gradient-primary text-primary-foreground">
                <Download className="size-4" />
              </span>
              <span className="text-sm font-bold">{t("app.name")}</span>
            </div>
            <div className="hidden text-xs text-muted-foreground lg:block">
              yt-dlp 2026.07.21 · FFmpeg 7.1 · {t("common.enabled")}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={toggleLang}>
                <Languages className="size-4" />
                {t("action.lang")}
              </Button>
              <Button
                variant="outline"
                size="icon"
                aria-label={t("action.theme")}
                onClick={() => setMode(isDark ? "light" : "dark")}
              >
                {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
              </Button>
            </div>
          </header>

          <nav className="flex gap-1 overflow-x-auto border-b border-border px-4 py-2 lg:hidden">
            {nav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium",
                  pathname === item.to
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground",
                )}
              >
                {t(item.key as TKey)}
              </Link>
            ))}
          </nav>

          <main className="px-4 py-6 sm:px-8 sm:py-8">{children}</main>
        </div>
      </div>
      <ClipboardPrompt />
    </div>
  );
}
