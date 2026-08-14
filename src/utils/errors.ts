import type { AppErrorCode, ErrorModel } from "../types/errors";

const errorMessages: Record<AppErrorCode, string> = {
  unsupported_url: "errors.unsupportedUrl",
  network_error: "errors.networkError",
  video_unavailable: "errors.videoUnavailable",
  disk_full: "errors.diskFull",
  permission_denied: "errors.permissionDenied",
  ytdlp_error: "errors.ytdlpError",
  ffmpeg_error: "errors.ffmpegError",
  unknown: "errors.unknown"
};

export function mapMockError(code: AppErrorCode): ErrorModel {
  return {
    code,
    message: errorMessages[code],
    recoverable: true
  };
}

export function mapUnknownError(error: unknown): ErrorModel {
  if (error instanceof Error) {
    return {
      code: "unknown",
      message: error.message,
      recoverable: true
    };
  }

  return {
    code: "unknown",
    message: "Unknown error",
    recoverable: true
  };
}
