import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { FolderOpen, RotateCcw, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n, type Lang } from "@/lib/i18n";
import { useTheme, type ThemeMode } from "@/components/theme-provider";
import { audioFormats, qualities, speedLimits, videoFormats } from "@/lib/mock-data";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "الإعدادات — Remon Download" },
      {
        name: "description",
        content:
          "اضبط مجلد التحميل والثيم واللغة والتحميلات المتزامنة وحد السرعة ومسارات yt-dlp وFFmpeg.",
      },
      { property: "og:title", content: "الإعدادات — Remon Download" },
      {
        property: "og:description",
        content: "تحكم كامل في سلوك التطبيق والجودة والصيغة الافتراضية والذاكرة المؤقتة.",
      },
    ],
  }),
  component: SettingsPage,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-base font-semibold">{title}</h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Label className="text-sm">{label}</Label>
      <div className="min-w-[12rem]">{children}</div>
    </div>
  );
}

function SettingsPage() {
  const { t, lang, setLang } = useI18n();
  const { mode, setMode } = useTheme();
  const [concurrent, setConcurrent] = useState([3]);
  const [ttl, setTtl] = useState([10]);
  const [thumbCache, setThumbCache] = useState([500]);
  const [folder, setFolder] = useState("C:\\Users\\Remon\\Videos\\Remon Download");

  return (
    <AppShell>
      <PageHeader
        title={t("set.title")}
        subtitle={t("set.subtitle")}
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => toast(t("toast.cleared"))}>
              <RotateCcw className="size-4" />
              {t("action.reset")}
            </Button>
            <Button onClick={() => toast.success(t("toast.saved"))}>
              <Save className="size-4" />
              {t("action.save")}
            </Button>
          </div>
        }
      />

      <div className="grid gap-5 xl:grid-cols-2">
        <Section title={t("set.general")}>
          <div>
            <Label className="mb-2 block text-sm">{t("set.folder")}</Label>
            <div className="flex gap-2">
              <Input value={folder} onChange={(e) => setFolder(e.target.value)} dir="ltr" />
              <Button variant="outline">
                <FolderOpen className="size-4" />
                {t("set.browse")}
              </Button>
            </div>
          </div>
          <Row label={t("set.theme")}>
            <Select value={mode} onValueChange={(v) => setMode(v as ThemeMode)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">{t("set.theme.light")}</SelectItem>
                <SelectItem value="dark">{t("set.theme.dark")}</SelectItem>
                <SelectItem value="auto">{t("set.theme.auto")}</SelectItem>
              </SelectContent>
            </Select>
          </Row>
          <Row label={t("set.language")}>
            <Select value={lang} onValueChange={(v) => setLang(v as Lang)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ar">العربية</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </Row>
        </Section>

        <Section title={t("set.downloads")}>
          <div>
            <Label className="mb-2 block text-sm">
              {t("queue.concurrent")}: <span className="tabular-nums">{concurrent[0]}</span>
            </Label>
            <Slider value={concurrent} onValueChange={setConcurrent} min={1} max={10} step={1} />
          </div>
          <Row label={t("common.speedLimit")}>
            <Select defaultValue="unlimited">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {speedLimits.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s === "unlimited" ? t("common.unlimited") : s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Row>
          <Row label={t("set.defaultQuality")}>
            <Select defaultValue="1080p">
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
          </Row>
          <Row label={t("set.defaultFormat")}>
            <Select defaultValue="MP4">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[...videoFormats, ...audioFormats].map((f) => (
                  <SelectItem key={f} value={f}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Row>
          <Row label={t("set.proxy")}>
            <Input placeholder="http://127.0.0.1:8080" dir="ltr" />
          </Row>
        </Section>

        <Section title={t("set.tools")}>
          <div>
            <Label className="mb-2 block text-sm">{t("set.ytdlp")}</Label>
            <Input defaultValue="C:\\Tools\\yt-dlp.exe" dir="ltr" />
            <Badge variant="secondary" className="mt-2">
              {t("set.autoDetected")}
            </Badge>
          </div>
          <div>
            <Label className="mb-2 block text-sm">{t("set.ffmpeg")}</Label>
            <Input defaultValue="C:\\Tools\\ffmpeg\\bin\\ffmpeg.exe" dir="ltr" />
            <Badge variant="secondary" className="mt-2">
              {t("set.autoDetected")}
            </Badge>
          </div>
        </Section>

        <Section title={t("set.behavior")}>
          <Row label={t("set.autoUpdate")}>
            <div className="flex justify-end">
              <Switch defaultChecked />
            </div>
          </Row>
          <Row label={t("set.clipboard")}>
            <div className="flex justify-end">
              <Switch defaultChecked />
            </div>
          </Row>
          <Row label={t("set.notifications")}>
            <div className="flex justify-end">
              <Switch defaultChecked />
            </div>
          </Row>
          <Row label={t("set.startup")}>
            <div className="flex justify-end">
              <Switch />
            </div>
          </Row>
        </Section>

        <Section title={t("set.cache")}>
          <div>
            <Label className="mb-2 block text-sm">
              {t("set.metaTtl")}: <span className="tabular-nums">{ttl[0]}</span>
            </Label>
            <Slider value={ttl} onValueChange={setTtl} min={5} max={60} step={5} />
          </div>
          <div>
            <Label className="mb-2 block text-sm">
              {t("set.thumbCache")}: <span className="tabular-nums">{thumbCache[0]}</span>
            </Label>
            <Slider
              value={thumbCache}
              onValueChange={setThumbCache}
              min={100}
              max={2000}
              step={100}
            />
          </div>
          <Button variant="outline" onClick={() => toast(t("toast.cleared"))}>
            <Trash2 className="size-4" />
            {t("set.clearCache")}
          </Button>
        </Section>
      </div>
    </AppShell>
  );
}
