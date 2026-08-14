import type { AppSettings } from "../types/settings";

export const QUALITY_OPTIONS = ["2160p", "1440p", "1080p", "720p", "480p"] as const;
export const VIDEO_FORMAT_OPTIONS = ["mp4", "webm", "mkv"] as const;
export const AUDIO_FORMAT_OPTIONS = ["m4a", "mp3", "opus"] as const;

export const DEFAULT_SETTINGS: AppSettings = {
  downloadFolder: "~/Downloads",
  startWithWindows: false,
  minimizeToTray: false,
  appearance: "system",
  language: "en",
  concurrentDownloads: 3,
  speedLimit: "unlimited",
  defaultQuality: "1080p",
  defaultVideoFormat: "mp4",
  defaultAudioFormat: "m4a",
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
