export type AppErrorCode =
  | "unsupported_url"
  | "network_error"
  | "video_unavailable"
  | "disk_full"
  | "permission_denied"
  | "ytdlp_error"
  | "ffmpeg_error"
  | "unknown";

export interface ErrorModel {
  code: AppErrorCode;
  message: string;
  recoverable: boolean;
}

export const MOCK_ERROR_CODES: readonly AppErrorCode[] = [
  "network_error",
  "video_unavailable",
  "disk_full",
  "permission_denied",
  "ytdlp_error",
  "ffmpeg_error"
] as const;
