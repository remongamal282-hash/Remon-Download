"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.NativeNotificationService = void 0;
const electron_1 = require("electron");
const crypto_1 = require("crypto");
const fs_1 = require("fs");
const path = __importStar(require("path"));
class NativeNotificationService {
    constructor(settings) {
        this.sentKeys = new Set();
        this.pendingKeys = new Set();
        this.thumbnailPaths = new Map();
        this.settings = settings;
    }
    updateSettings(settings) {
        this.settings = settings;
    }
    handleDownloadStateChange(payload, item) {
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
            }, item.thumbnail);
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
            }, item.thumbnail);
        }
    }
    getFailureNotificationMessage(errorCode, errorMessage) {
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
    notifyScheduledDownload(schedule, metadata) {
        if (!this.settings.enableNotifications) {
            console.log(`[Notification] Scheduled notification disabled: ${schedule.id}`);
            return;
        }
        this.sendDownloadOnce(`scheduled:${schedule.id}:${schedule.triggerCount}`, {
            title: metadata?.title || (this.settings.language === "ar" ? "تحميل مجدول" : "Scheduled Download"),
            body: this.settings.language === "ar"
                ? "تمت إضافة التحميل المجدول إلى قائمة التنزيلات"
                : "Scheduled download queued"
        }, metadata?.thumbnail);
    }
    sendOnce(key, options) {
        if (this.sentKeys.has(key) || this.pendingKeys.has(key)) {
            console.log(`[Notification] Duplicate suppressed: ${key}`);
            return;
        }
        try {
            if (!electron_1.Notification.isSupported()) {
                console.warn(`[Notification] Windows notifications are not supported: ${key}`);
                return;
            }
            const notification = new electron_1.Notification(options);
            notification.show();
            this.sentKeys.add(key);
            console.log(`[Notification] Shown: ${key}`);
        }
        catch (error) {
            console.error(`[Notification] Failed to show notification (${key}):`, error);
        }
    }
    sendDownloadOnce(key, options, thumbnailUrl) {
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
    showNotification(key, options) {
        if (this.sentKeys.has(key)) {
            return;
        }
        try {
            if (!electron_1.Notification.isSupported()) {
                console.warn(`[Notification] Windows notifications are not supported: ${key}`);
                return;
            }
            const icon = options.icon ? electron_1.nativeImage.createFromPath(options.icon) : undefined;
            const notificationOptions = icon ? { ...options, icon } : options;
            const notification = new electron_1.Notification(notificationOptions);
            if (icon?.isEmpty()) {
                console.warn(`[Notification] Thumbnail image is empty: ${options.icon}`);
            }
            notification.show();
            this.sentKeys.add(key);
            console.log(`[Notification] Shown: ${key}${options.icon ? " with thumbnail" : ""}`);
        }
        catch (error) {
            console.error(`[Notification] Failed to show notification (${key}):`, error);
        }
    }
    async resolveThumbnailPath(thumbnailUrl) {
        const cachedPath = this.thumbnailPaths.get(thumbnailUrl);
        if (cachedPath) {
            return cachedPath;
        }
        const response = await fetch(thumbnailUrl, { signal: AbortSignal.timeout(5000) });
        if (!response.ok) {
            throw new Error(`Thumbnail request failed with status ${response.status}`);
        }
        const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
        const extension = contentType.includes("png") ? ".png" : contentType.includes("webp") ? ".webp" : ".jpg";
        const thumbnailDirectory = path.join(electron_1.app.getPath("temp"), "remon-download-thumbnails");
        const thumbnailPath = path.join(thumbnailDirectory, `${(0, crypto_1.createHash)("sha256").update(thumbnailUrl).digest("hex")}${extension}`);
        try {
            await fs_1.promises.access(thumbnailPath);
        }
        catch {
            await fs_1.promises.mkdir(thumbnailDirectory, { recursive: true });
            const imageData = Buffer.from(await response.arrayBuffer());
            await fs_1.promises.writeFile(thumbnailPath, imageData);
        }
        this.thumbnailPaths.set(thumbnailUrl, thumbnailPath);
        return thumbnailPath;
    }
}
exports.NativeNotificationService = NativeNotificationService;
//# sourceMappingURL=nativeNotificationService.js.map