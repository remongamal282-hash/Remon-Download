/**
 * NativeMetadataService — Main Process metadata boundary.
 *
 * Phase 2: Production-ready URL classification and structured AnalysisResult
 * generation using only Node.js-compatible APIs (no DOM, no window.*, no browser).
 *
 * What this does:
 * - Validates that the URL is a recognized YouTube URL (youtube.com / youtu.be).
 * - Classifies the link type: video | shorts | playlist | playlist-video | channel.
 * - Returns a fully-typed AnalysisResult with all required fields populated.
 *
 * What this does NOT do (Phase 2.x, requires yt-dlp):
 * - Does not invoke yt-dlp or fetch real video metadata from YouTube.
 * - Does not perform any network requests.
 * - Title, duration, views, file size are documented stubs (clearly labelled).
 *   They satisfy the AnalysisResult shape so the Renderer can render correctly
 *   while yt-dlp integration is pending.
 *
 * Relationship to MockMetadataService (src/services/metadataService.ts):
 * - Both implement the same MetadataService interface.
 * - MockMetadataService runs in Web/Vitest mode (Renderer process, uses window.setTimeout).
 * - NativeMetadataService runs in Electron Main Process (Node.js, no browser APIs).
 * - URL classification logic is duplicated intentionally — no shared code between
 *   Renderer src/ and Main electron/ to preserve strict process isolation.
 */

import type { AnalysisResult, ChannelMetadata, LinkType, PlaylistMetadata, VideoMetadata } from "../../src/types/download";

// ─── YouTube URL Validation ─────────────────────────────────────────────────

const YOUTUBE_HOSTNAMES = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be"
]);

/**
 * Returns true if the URL belongs to a known YouTube hostname.
 * Uses the WHATWG URL API (available in Node.js 10+).
 */
export function isYouTubeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return YOUTUBE_HOSTNAMES.has(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
}

// ─── Link Type Classification ───────────────────────────────────────────────

/**
 * Classifies a YouTube URL into one of the 5 recognized link types.
 *
 * Priority order (most specific first):
 *  1. /shorts/  → shorts
 *  2. /channel/ or /@  → channel
 *  3. ?list=...&v=...  → playlist-video (video inside a playlist)
 *  4. ?list=...        → playlist
 *  5. default          → video
 *
 * youtu.be short links are always videos (no playlist/shorts support there).
 */
export function classifyYouTubeUrl(url: string): LinkType {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname.toLowerCase();

    if (pathname.includes("/shorts/")) {
      return "shorts";
    }

    if (pathname.includes("/channel/") || pathname.includes("/@")) {
      return "channel";
    }

    if (parsed.searchParams.has("list") && parsed.searchParams.has("v")) {
      return "playlist-video";
    }

    if (parsed.searchParams.has("list")) {
      return "playlist";
    }
  } catch {
    // fall through to default
  }

  return "video";
}

// ─── AnalysisResult Builders ────────────────────────────────────────────────

/**
 * Extracts the video ID from a YouTube URL (watch?v=ID or youtu.be/ID).
 * Returns "unknown" if not found — used only for thumbnail seed and stub ID.
 */
function extractVideoId(url: string): string {
  try {
    const parsed = new URL(url);

    // youtu.be/VIDEO_ID
    if (parsed.hostname === "youtu.be") {
      const id = parsed.pathname.replace("/", "").split("/")[0];
      return id || "unknown";
    }

    // /shorts/VIDEO_ID
    const shortsMatch = /\/shorts\/([^/?#]+)/.exec(parsed.pathname);
    if (shortsMatch) {
      return shortsMatch[1] ?? "unknown";
    }

    // ?v=VIDEO_ID
    const v = parsed.searchParams.get("v");
    if (v) {
      return v;
    }
  } catch {
    // fall through
  }

  return "unknown";
}

/**
 * Extracts the playlist ID from ?list= parameter.
 */
function extractPlaylistId(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.searchParams.get("list") ?? "unknown-list";
  } catch {
    return "unknown-list";
  }
}

/**
 * Extracts the channel handle or ID from the URL path.
 * Handles: /channel/UCxxxxxx  and  /@HandleName
 */
function extractChannelId(url: string): string {
  try {
    const parsed = new URL(url);
    const match = /\/(channel\/[^/?#]+|@[^/?#]+)/.exec(parsed.pathname);
    return match ? match[1].replace("/", "-") : "unknown-channel";
  } catch {
    return "unknown-channel";
  }
}

/**
 * Builds a VideoMetadata stub for a single video or shorts link.
 *
 * NOTE: title, views, duration, and fileSize are documented stubs.
 * They will be replaced with real yt-dlp data in Phase 2.x.
 */
function buildVideoMetadata(
  url: string,
  linkType: "video" | "shorts" | "playlist-video",
  index = 1
): VideoMetadata {
  const videoId = extractVideoId(url);
  const isShorts = linkType === "shorts";

  return {
    id: `native-${linkType}-${videoId}-${index}`,
    sourceUrl: url,
    linkType,
    // Thumbnail uses the YouTube standard thumbnail URL pattern.
    // In Phase 2.x, yt-dlp will provide the actual thumbnail URL.
    thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    // Stub: real title requires yt-dlp. Value is intentionally descriptive.
    title: isShorts
      ? `[Shorts] YouTube Video — yt-dlp metadata pending`
      : index > 1
        ? `[Playlist Video ${index}] YouTube Video — yt-dlp metadata pending`
        : `[Video] YouTube Video — yt-dlp metadata pending`,
    channelName: "YouTube Channel — yt-dlp metadata pending",
    // Stub: real duration requires yt-dlp.
    duration: isShorts ? "0:59" : "10:00",
    // Stub: real views require yt-dlp.
    views: 0,
    qualityOptions: ["2160p", "1440p", "1080p", "720p", "480p", "360p"],
    videoFormats: ["mp4", "webm", "mkv"],
    audioFormats: ["m4a", "mp3", "opus"],
    resolution: "1080p",
    fps: 30,
    videoCodec: "H.264",
    audioCodec: "AAC",
    videoBitrate: "0 Mbps",
    audioBitrate: "0 Kbps",
    container: "mp4",
    // Stub: real file size requires yt-dlp.
    fileSize: 0,
    uploadDate: new Date().toISOString().split("T")[0] ?? ""
  };
}

/**
 * Builds a PlaylistMetadata stub.
 *
 * NOTE: Playlist title and video list require yt-dlp. In Phase 2.x, yt-dlp
 * will provide the actual video list. For now, we return 1 placeholder video
 * item so the Renderer can render a minimal valid Playlist UI.
 */
function buildPlaylistMetadata(url: string): PlaylistMetadata {
  const playlistId = extractPlaylistId(url);

  return {
    id: `native-playlist-${playlistId}`,
    sourceUrl: url,
    linkType: "playlist",
    // Stub: real playlist title requires yt-dlp.
    title: `[Playlist] YouTube Playlist — yt-dlp metadata pending`,
    thumbnail: `https://i.ytimg.com/vi/unknown/hqdefault.jpg`,
    // Stub: In Phase 2.x, yt-dlp will enumerate the actual playlist videos.
    // We return 1 placeholder so the UI renders correctly in Electron mode.
    videos: [buildVideoMetadata(url, "playlist-video", 1)]
  };
}

/**
 * Builds a ChannelMetadata stub.
 *
 * NOTE: Channel name, video list require yt-dlp. Returns a minimal stub
 * so the Renderer renders a valid Channel UI.
 */
function buildChannelMetadata(url: string): ChannelMetadata {
  const channelId = extractChannelId(url);

  return {
    id: `native-channel-${channelId}`,
    sourceUrl: url,
    linkType: "channel",
    // Stub: real channel name requires yt-dlp.
    name: `[Channel] YouTube Channel — yt-dlp metadata pending`,
    thumbnail: `https://i.ytimg.com/vi/unknown/hqdefault.jpg`,
    // Stub: real video count requires yt-dlp.
    mockVideoCount: 0,
    // Stub: real latest videos require yt-dlp.
    latestVideos: [buildVideoMetadata(url, "video", 1)]
  };
}

// ─── NativeMetadataService ──────────────────────────────────────────────────

export class NativeMetadataService {
  /**
   * Analyzes a YouTube URL and returns a typed AnalysisResult.
   *
   * Validation:
   * - Non-string or empty URL → throws "invalid_url" Error.
   * - Valid URL but not a YouTube domain → throws "unsupported_url" Error.
   *   (Mirrors MockMetadataService's error contract.)
   *
   * Note: All metadata fields except URL, linkType, and videoId are stubs
   * until yt-dlp is integrated in Phase 2.x.
   */
  async analyze(url: string): Promise<AnalysisResult> {
    if (!url || typeof url !== "string") {
      throw new Error("invalid_url");
    }

    const trimmedUrl = url.trim();

    if (!trimmedUrl) {
      throw new Error("invalid_url");
    }

    // Validate it's a parseable URL before checking YouTube
    try {
      new URL(trimmedUrl);
    } catch {
      throw new Error("invalid_url");
    }

    if (!isYouTubeUrl(trimmedUrl)) {
      throw new Error("unsupported_url");
    }

    const linkType = classifyYouTubeUrl(trimmedUrl);

    if (linkType === "playlist") {
      return buildPlaylistMetadata(trimmedUrl);
    }

    if (linkType === "channel") {
      return buildChannelMetadata(trimmedUrl);
    }

    // video | shorts | playlist-video
    return buildVideoMetadata(trimmedUrl, linkType, 1);
  }
}
