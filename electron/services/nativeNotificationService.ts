import { app, nativeImage, Notification } from "electron";
import { createHash } from "crypto";
import { promises as fs } from "fs";
import * as path from "path";
import type { DownloadItem, ScheduledDownload, VideoMetadata } from "../../src/types/download";
import type { AppSettings } from "../../src/types/settings";
import type { DownloadStateChangePayload } from "../ipc/channels";

export class NativeNotificationService {
  private settings: AppSettings;
  private sentKeys = new Set<string>();
  private pendingKeys = new Set<string>();
  private thumbnailPaths = new Map<string, string>();
  private thumbnailImages = new Map<string, Electron.NativeImage>();

  constructor(settings: AppSettings) {
    this.settings = settings;
  }

  updateSettings(settings: AppSettings): void {
    this.settings = settings;
  }

  handleDownloadStateChange(payload: DownloadStateChangePayload, item: DownloadItem): void {
    if (payload.status === "retrying") {
      this.sentKeys.delete(`completed:${payload.id}`);
      this.sentKeys.delete(`failed:${payload.id}`);
      return;
    }

    if (payload.status === "completed") {
      if (!this.settings.enableNotifications || !this.settings.notificationWhenCompleted) {
        console.log(`[Notification] Completion notification disabled: ${payload.id}`);
        return;
      }

      this.sendDownloadOnce(`completed:${payload.id}`, {
        title: item.title || "Remon Download",
        body: this.settings.language === "ar"
          ? "تم تحميل الفيديو بنجاح"
          : "Download completed successfully"
      }, this.resolveNotificationThumbnail(item));
      return;
    }

    if (payload.status === "failed") {
      if (!this.settings.enableNotifications || !this.settings.notificationWhenFailed) {
        console.log(`[Notification] Failure notification disabled: ${payload.id}`);
        return;
      }

      this.sendDownloadOnce(`failed:${payload.id}`, {
        title: item.title || "Remon Download",
        body: this.getFailureNotificationMessage(payload.errorCode, payload.errorMessage)
      }, this.resolveNotificationThumbnail(item));
    }
  }

  private getFailureNotificationMessage(
    errorCode?: DownloadStateChangePayload["errorCode"],
    errorMessage?: string
  ): string {
    if (this.settings.language !== "ar") {
      if (errorMessage?.match(/exit code\s+.+$/i)) {
        return "Download failed during processing";
      }
      return errorMessage || "Download failed";
    }

    if (errorCode === "network_error") {
      return "فشل تحميل الفيديو بسبب خطأ في الشبكة";
    }
    if (errorCode === "video_unavailable") {
      return "الفيديو غير متاح أو تمت إزالته";
    }
    if (errorCode === "video_private") {
      return "الفيديو خاص أو يتطلب صلاحية للوصول إليه";
    }
    if (errorCode === "ffmpeg_error") {
      return "فشل تجهيز الفيديو بواسطة FFmpeg";
    }
    if (errorCode === "ytdlp_not_found") {
      return "تعذر العثور على yt-dlp";
    }

    const normalizedMessage = errorMessage?.toLowerCase() ?? "";
    if (normalizedMessage.includes("network") || normalizedMessage.includes("connection")) {
      return "فشل تحميل الفيديو بسبب خطأ في الشبكة";
    }
    if (normalizedMessage.includes("private") || normalizedMessage.includes("members-only")) {
      return "الفيديو خاص أو يتطلب صلاحية للوصول إليه";
    }
    if (normalizedMessage.includes("unavailable") || normalizedMessage.includes("not available")) {
      return "الفيديو غير متاح أو تمت إزالته";
    }
    if (normalizedMessage.includes("ffmpeg") || normalizedMessage.includes("postprocessor")) {
      return "فشل تجهيز الفيديو بواسطة FFmpeg";
    }
    if (normalizedMessage.includes("permission") || normalizedMessage.includes("access denied")) {
      return "لا توجد صلاحية كافية لحفظ الفيديو";
    }
    if (normalizedMessage.includes("disk full") || normalizedMessage.includes("no space")) {
      return "لا توجد مساحة كافية لحفظ الفيديو";
    }

    const exitCodeMatch = errorMessage?.match(/exit code\s+(.+)$/i);
    if (exitCodeMatch?.[1]) {
      return "تعذر تحميل الفيديو بسبب خطأ أثناء المعالجة";
    }

    return "فشل تحميل الفيديو";
  }

  notifyScheduledDownload(schedule: ScheduledDownload, metadata?: VideoMetadata): void {
    if (!this.settings.enableNotifications) {
      console.log(`[Notification] Scheduled notification disabled: ${schedule.id}`);
      return;
    }

    this.sendDownloadOnce(`scheduled:${schedule.id}:${schedule.triggerCount}`, {
      title: metadata?.title || (this.settings.language === "ar" ? "تحميل مجدول" : "Scheduled Download"),
      body: this.settings.language === "ar"
        ? "تمت إضافة التحميل المجدول إلى قائمة التنزيلات"
        : "Scheduled download queued"
    }, this.resolveVideoThumbnail(metadata?.thumbnail, metadata?.sourceUrl ?? schedule.sourceUrl));
  }

  private resolveNotificationThumbnail(item: Pick<DownloadItem, "id" | "title" | "thumbnail" | "sourceUrl">): string | undefined {
    if (item.thumbnail && /^https?:\/\//i.test(item.thumbnail)) {
      return item.thumbnail;
    }

    const sourceUrl = item.sourceUrl;
    if (!sourceUrl) {
      return undefined;
    }

    const source = sourceUrl.toLowerCase();
    const playlistLike = /playlist|list=|index=|&list=|\?list=/i.test(source) || /playlist/i.test(item.id || "") || /playlist/i.test(item.title || "");
    if (!playlistLike) {
      return undefined;
    }

    try {
      const videoId = new URL(sourceUrl).searchParams.get("v");
      return videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : undefined;
    } catch {
      return undefined;
    }
  }

  private resolveVideoThumbnail(thumbnailUrl?: string, sourceUrl?: string): string | undefined {
    if (thumbnailUrl && /^https?:\/\//i.test(thumbnailUrl)) {
      return thumbnailUrl;
    }

    if (!sourceUrl) {
      return undefined;
    }

    const source = sourceUrl.toLowerCase();
    const playlistLike = /playlist|list=|index=|&list=|\?list=/i.test(source);
    if (!playlistLike) {
      return undefined;
    }

    try {
      const videoId = new URL(sourceUrl).searchParams.get("v");
      return videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : undefined;
    } catch {
      return undefined;
    }
  }

  private sendOnce(key: string, options: { title: string; body: string }): void {
    if (this.sentKeys.has(key) || this.pendingKeys.has(key)) {
      console.log(`[Notification] Duplicate suppressed: ${key}`);
      return;
    }

    try {
      if (!Notification.isSupported()) {
        console.warn(`[Notification] Windows notifications are not supported: ${key}`);
        return;
      }

      const notification = new Notification(options);
      notification.show();
      this.sentKeys.add(key);
      console.log(`[Notification] Shown: ${key}`);
    } catch (error) {
      console.error(`[Notification] Failed to show notification (${key}):`, error);
    }
  }

  private sendDownloadOnce(
    key: string,
    options: { title: string; body: string },
    thumbnailUrl?: string
  ): void {
    if (!thumbnailUrl || !/^https?:\/\//i.test(thumbnailUrl)) {
      this.sendOnce(key, options);
      return;
    }

    if (this.sentKeys.has(key) || this.pendingKeys.has(key)) {
      console.log(`[Notification] Duplicate suppressed: ${key}`);
      return;
    }

    this.pendingKeys.add(key);
    void this.resolveThumbnailPath(thumbnailUrl)
      .then((icon) => {
        this.pendingKeys.delete(key);
        this.showNotification(key, { ...options, icon });
      })
      .catch((error) => {
        this.pendingKeys.delete(key);
        console.warn(`[Notification] Thumbnail unavailable for ${key}:`, error);
        this.sendOnce(key, options);
      });
  }

  private showNotification(
    key: string,
    options: { title: string; body: string; icon?: string }
  ): void {
    if (this.sentKeys.has(key)) {
      return;
    }

    try {
      if (!Notification.isSupported()) {
        console.warn(`[Notification] Windows notifications are not supported: ${key}`);
        return;
      }

      const icon = options.icon
        ? (this.thumbnailImages.get(options.icon) ?? nativeImage.createFromPath(options.icon))
        : undefined;
      const notificationOptions = icon ? { ...options, icon } : options;
      const notification = new Notification(notificationOptions);
      if (icon?.isEmpty()) {
        console.warn(`[Notification] Thumbnail image is empty: ${options.icon}`);
      }
      notification.show();
      this.sentKeys.add(key);
      console.log(`[Notification] Shown: ${key}${options.icon ? " with thumbnail" : ""}`);
    } catch (error) {
      console.error(`[Notification] Failed to show notification (${key}):`, error);
    }
  }

  private async resolveThumbnailPath(thumbnailUrl: string): Promise<string> {
    const cachedPath = this.thumbnailPaths.get(thumbnailUrl);
    if (cachedPath) {
      return cachedPath;
    }

    const thumbnailCandidates = this.getThumbnailCandidates(thumbnailUrl);
    const thumbnailDirectory = path.join(app.getPath("temp"), "remon-download-thumbnails");

    let lastError: unknown;
    for (const candidate of thumbnailCandidates) {
      try {
        const response = await fetch(candidate);
        if (!response.ok) {
          throw new Error(`Thumbnail request failed with status ${response.status}`);
        }

        const imageData = Buffer.from(await response.arrayBuffer());
        if (imageData.length === 0) {
          throw new Error("Thumbnail response was empty");
        }

        const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
        const extension = contentType.includes("png") ? ".png" : contentType.includes("webp") ? ".webp" : ".jpg";
        const thumbnailPath = path.join(
          thumbnailDirectory,
          `${createHash("sha256").update(candidate).digest("hex")}${extension}`
        );

        await fs.mkdir(thumbnailDirectory, { recursive: true });
        await fs.writeFile(thumbnailPath, imageData);
        if (typeof nativeImage.createFromBuffer === "function") {
          const image = nativeImage.createFromBuffer(imageData);
          if (image.isEmpty()) {
            throw new Error("Thumbnail image could not be decoded");
          }
          this.thumbnailImages.set(thumbnailPath, image);
        }
        this.thumbnailPaths.set(thumbnailUrl, thumbnailPath);
        return thumbnailPath;
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError instanceof Error ? lastError : new Error("Thumbnail unavailable");
  }

  private getThumbnailCandidates(thumbnailUrl: string): string[] {
    const candidates = [thumbnailUrl];
    const videoIdMatch = thumbnailUrl.match(/\/vi\/([^/]+)/i);
    if (videoIdMatch?.[1]) {
      const videoId = videoIdMatch[1];
      candidates.push(
        `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
        `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        `https://i.ytimg.com/vi/${videoId}/default.jpg`
      );
    }
    return [...new Set(candidates)];
  }
}
