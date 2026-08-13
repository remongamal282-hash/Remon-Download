import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ClipboardPaste, Zap, Search } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Thumb } from "@/components/thumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/lib/i18n";
import {
  analyzedVideo,
  audioFormats,
  qualities,
  speedLimits,
  videoFormats,
} from "@/lib/mock-data";

export const Route = createFileRoute("/download")({
  head: () => ({
    meta: [
      { title: "تحميل جديد — Remon Download" },
      {
        name: "description",
        content:
          "الصق رابط يوتيوب لتحليله واختيار الجودة والصيغة والترجمات قبل بدء التحميل.",
      },
      { property: "og:title", content: "تحميل جديد — Remon Download" },
      {
        property: "og:description",
        content: "تحليل روابط يوتيوب واختيار الجودة والصيغة والترجمات.",
      },
    ],
  }),
  component: DownloadPage,
});

function DownloadPage() {
  const { t } = useI18n();
  const [url, setUrl] = useState("");
  const [analyzed, setAnalyzed] = useState(false);
  const [cacheHit, setCacheHit] = useState(false);
  const [quality, setQuality] = useState("1080p");
  const [template, setTemplate] = useState(
    "%(uploader)s - %(title)s [%(resolution)s].%(ext)s",
  );

  const isAudio = quality === "audio";
  const type = url.includes("list=")
    ? t("dl.type.playlist")
    : url.includes("/shorts/")
      ? t("dl.type.shorts")
      : url.includes("/@")
        ? t("dl.type.channel")
        : t("dl.type.video");

  const preview = template
    .replace("%(uploader)s", analyzedVideo.channel)
    .replace("%(title)s", analyzedVideo.title)
    .replace("%(resolution)s", isAudio ? "audio" : quality)
    .replace("%(upload_date)s", analyzedVideo.uploaded.replaceAll("-", ""))
    .replace("%(id)s", "kQx7pT2aB1c")
    .replace("%(playlist_index)s", "01")
    .replace("%(playlist_title)s", "Playlist")
    .replace("%(ext)s", isAudio ? "mp3" : "mp4")
    .replace(/[\\/:*?"<>|]/g, "_")
    .slice(0, 255);

  const analyze = (fromCache: boolean) => {
    if (!url.trim()) {
      setUrl("https://www.youtube.com/watch?v=kQx7pT2aB1c");
    }
    setCacheHit(fromCache);
    setAnalyzed(true);
  };

  return (
    <AppShell>
      <PageHeader title={t("dl.title")} subtitle={t("dl.subtitle")} />

      <div
        onDrop={(e) => {
          e.preventDefault();
          setUrl(e.dataTransfer.getData("text") || url);
        }}
        onDragOver={(e) => e.preventDefault()}
        className="rounded-xl border border-dashed border-border bg-card p-5"
      >
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={t("dl.placeholder")}
            className="h-11 flex-1 text-sm"
            dir="ltr"
          />
          <Button className="h-11" onClick={() => analyze(false)}>
            <Search className="size-4" />
            {t("action.analyze")}
          </Button>
          <Button
            variant="outline"
            className="h-11"
            onClick={() => {
              setUrl("https://www.youtube.com/watch?v=kQx7pT2aB1c");
              analyze(true);
            }}
          >
            <ClipboardPaste className="size-4" />
            {t("action.paste")}
          </Button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span>{t("dl.dropHint")}</span>
          {url ? (
            <Badge variant="secondary">
              {t("dl.detected")}: {type}
            </Badge>
          ) : null}
          <Button variant="ghost" size="sm" onClick={() => analyze(false)}>
            {t("action.forceRefresh")}
          </Button>
        </div>
      </div>

      {analyzed ? (
        <div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
          <section className="rounded-xl border border-border bg-card p-5">
            {cacheHit ? (
              <p className="mb-4 inline-flex items-center gap-2 rounded-lg bg-success/12 px-3 py-1.5 text-xs font-medium text-success">
                <Zap className="size-3.5" />
                {t("dl.cacheHit")}
              </p>
            ) : null}
            <div className="flex flex-col gap-4 sm:flex-row">
              <Thumb hue={24} duration={analyzedVideo.duration} className="h-32 w-full sm:w-56" />
              <div className="min-w-0">
                <h2 className="text-lg font-semibold leading-snug">{analyzedVideo.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {analyzedVideo.channel} · {analyzedVideo.views} {t("common.views")}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {analyzedVideo.qualities.map((q) => (
                    <Badge
                      key={q}
                      variant={q === quality ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => setQuality(q)}
                    >
                      {q}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <h3 className="mt-6 text-sm font-semibold">{t("dl.info")}</h3>
            <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              {[
                ["dl.fps", analyzedVideo.fps],
                ["dl.codec", analyzedVideo.codec],
                ["dl.bitrate", analyzedVideo.bitrate],
                ["dl.audioBitrate", analyzedVideo.audioBitrate],
                ["dl.container", analyzedVideo.container],
                ["dl.uploaded", analyzedVideo.uploaded],
              ].map(([key, value]) => (
                <div key={key} className="rounded-lg bg-surface-2 p-3">
                  <dt className="text-xs text-muted-foreground">
                    {t(key as "dl.fps")}
                  </dt>
                  <dd className="mt-1 font-medium">{value}</dd>
                </div>
              ))}
              <div className="rounded-lg bg-surface-2 p-3">
                <dt className="text-xs text-muted-foreground">{t("common.size")}</dt>
                <dd className="mt-1 font-medium">{analyzedVideo.size}</dd>
              </div>
              <div className="rounded-lg bg-surface-2 p-3">
                <dt className="text-xs text-muted-foreground">{t("dl.available")}</dt>
                <dd className="mt-1 font-medium">{analyzedVideo.resolution}</dd>
              </div>
            </dl>

            <h3 className="mt-6 text-sm font-semibold">{t("dl.subs")}</h3>
            <div className="mt-3 space-y-2">
              {analyzedVideo.subtitles.map((s) => (
                <label
                  key={s.lang}
                  className="flex items-center gap-3 rounded-lg bg-surface-2 px-3 py-2 text-sm"
                >
                  <Checkbox />
                  <span className="flex-1">{s.lang}</span>
                  <Badge variant="outline">
                    {s.auto ? t("dl.subsAuto") : t("dl.subsManual")}
                  </Badge>
                  <Select defaultValue="SRT">
                    <SelectTrigger className="h-8 w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["SRT", "VTT", "ASS"].map((f) => (
                        <SelectItem key={f} value={f}>
                          {f}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
              ))}
              <label className="flex items-center justify-between rounded-lg bg-surface-2 px-3 py-2 text-sm">
                <span>{t("dl.subsEmbed")}</span>
                <Switch />
              </label>
            </div>
          </section>

          <section className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="space-y-4">
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
                <div>
                  <Label className="mb-2 block">
                    {isAudio ? t("common.audioFormat") : t("common.videoFormat")}
                  </Label>
                  <Select value={isAudio ? "MP3" : "MP4"}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(isAudio ? audioFormats : videoFormats).map((f) => (
                        <SelectItem key={f} value={f}>
                          {f}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-2 block">{t("common.speedLimit")}</Label>
                  <Select defaultValue="5 MB/s">
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
                </div>
                <label className="flex items-center justify-between rounded-lg bg-surface-2 px-3 py-2 text-sm">
                  <span>{t("dl.thumbEmbed")}</span>
                  <Switch defaultChecked />
                </label>
                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => toast.success(t("toast.added"))}
                >
                  {t("action.addQueue")}
                </Button>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <Label className="mb-2 block">{t("dl.naming")}</Label>
              <Input
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                dir="ltr"
                className="font-mono text-xs"
              />
              <p className="mt-3 text-xs text-muted-foreground">{t("dl.preview")}</p>
              <p className="mt-1 break-all rounded-lg bg-surface-2 p-3 font-mono text-xs" dir="ltr">
                {preview}
              </p>
            </div>
          </section>
        </div>
      ) : null}
    </AppShell>
  );
}
