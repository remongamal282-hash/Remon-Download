"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_SETTINGS = exports.AUDIO_FORMAT_OPTIONS = exports.VIDEO_FORMAT_OPTIONS = exports.QUALITY_OPTIONS = void 0;
exports.QUALITY_OPTIONS = ["2160p", "1440p", "1080p", "720p", "480p"];
exports.VIDEO_FORMAT_OPTIONS = ["mp4", "webm", "mkv"];
exports.AUDIO_FORMAT_OPTIONS = ["mp3", "opus"];
exports.DEFAULT_SETTINGS = {
    downloadFolder: "~/Downloads",
    startWithWindows: false,
    minimizeToTray: false,
    appearance: "system",
    language: "en",
    concurrentDownloads: 3,
    speedLimit: "unlimited",
    defaultQuality: "720p",
    defaultVideoFormat: "mp4",
    defaultAudioFormat: "mp3",
    enableNotifications: true,
    notificationWhenCompleted: true,
    notificationWhenFailed: true,
    clipboardMonitoring: false,
    askBeforeDownloading: true,
    fileNameTemplate: "%(uploader)s - %(title)s [%(resolution)s].%(ext)s",
    ytdlpPath: "",
    ffmpegPath: "",
    proxy: ""
};
//# sourceMappingURL=settings.js.map