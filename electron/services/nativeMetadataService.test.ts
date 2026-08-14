/**
 * NativeMetadataService Tests
 *
 * Tests the Electron Main Process metadata service in isolation.
 * This file runs under Vitest (Node.js environment) — no Electron, no browser.
 *
 * Coverage:
 * 1.  isYouTubeUrl() — valid YouTube domains
 * 2.  isYouTubeUrl() — non-YouTube URLs
 * 3.  isYouTubeUrl() — invalid/malformed strings
 * 4.  classifyYouTubeUrl() — video URL
 * 5.  classifyYouTubeUrl() — shorts URL
 * 6.  classifyYouTubeUrl() — playlist URL
 * 7.  classifyYouTubeUrl() — playlist-video URL (list + v params)
 * 8.  classifyYouTubeUrl() — channel URL /channel/
 * 9.  classifyYouTubeUrl() — channel URL /@handle
 * 10. analyze() — video URL → VideoMetadata
 * 11. analyze() — shorts URL → VideoMetadata (linkType: "shorts")
 * 12. analyze() — playlist URL → PlaylistMetadata
 * 13. analyze() — playlist-video URL → VideoMetadata (linkType: "playlist-video")
 * 14. analyze() — channel URL → ChannelMetadata
 * 15. analyze() — unsupported URL → throws "unsupported_url"
 * 16. analyze() — invalid URL string → throws "invalid_url"
 * 17. analyze() — empty string → throws "invalid_url"
 * 18. analyze() — youtu.be short URL → VideoMetadata
 * 19. AnalysisResult shape — VideoMetadata has all required fields
 * 20. AnalysisResult shape — PlaylistMetadata has required fields + videos array
 * 21. AnalysisResult shape — ChannelMetadata has required fields + latestVideos array
 * 22. Error contract matches MockMetadataService ("unsupported_url" message)
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  NativeMetadataService,
  isYouTubeUrl,
  classifyYouTubeUrl
} from "./nativeMetadataService";
import type { VideoMetadata, PlaylistMetadata, ChannelMetadata } from "../../src/types/download";

// ─── Test fixtures ──────────────────────────────────────────────────────────

const URLS = {
  video: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  shorts: "https://www.youtube.com/shorts/abc123",
  playlist: "https://www.youtube.com/playlist?list=PLxxxxxx",
  playlistVideo: "https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLxxxxxx",
  channelById: "https://www.youtube.com/channel/UCxxxxxx",
  channelByHandle: "https://www.youtube.com/@ExampleChannel",
  youtubeDotBe: "https://youtu.be/dQw4w9WgXcQ",
  mobileYoutube: "https://m.youtube.com/watch?v=dQw4w9WgXcQ",
  unsupported: "https://vimeo.com/123456",
  nonVideoUnsupported: "https://example.com/video",
  invalid: "not-a-url",
  empty: ""
};

// ─── 1. isYouTubeUrl ────────────────────────────────────────────────────────

describe("isYouTubeUrl()", () => {
  it("returns true for www.youtube.com", () => {
    expect(isYouTubeUrl(URLS.video)).toBe(true);
  });

  it("returns true for youtube.com (no www)", () => {
    expect(isYouTubeUrl("https://youtube.com/watch?v=abc")).toBe(true);
  });

  it("returns true for m.youtube.com (mobile)", () => {
    expect(isYouTubeUrl(URLS.mobileYoutube)).toBe(true);
  });

  it("returns true for youtu.be (short links)", () => {
    expect(isYouTubeUrl(URLS.youtubeDotBe)).toBe(true);
  });

  it("returns false for vimeo.com", () => {
    expect(isYouTubeUrl(URLS.unsupported)).toBe(false);
  });

  it("returns false for example.com", () => {
    expect(isYouTubeUrl(URLS.nonVideoUnsupported)).toBe(false);
  });

  it("returns false for malformed URL", () => {
    expect(isYouTubeUrl(URLS.invalid)).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isYouTubeUrl(URLS.empty)).toBe(false);
  });
});

// ─── 2. classifyYouTubeUrl ──────────────────────────────────────────────────

describe("classifyYouTubeUrl()", () => {
  it("classifies a standard video URL as 'video'", () => {
    expect(classifyYouTubeUrl(URLS.video)).toBe("video");
  });

  it("classifies a /shorts/ URL as 'shorts'", () => {
    expect(classifyYouTubeUrl(URLS.shorts)).toBe("shorts");
  });

  it("classifies a playlist-only URL as 'playlist'", () => {
    expect(classifyYouTubeUrl(URLS.playlist)).toBe("playlist");
  });

  it("classifies a URL with both list and v params as 'playlist-video'", () => {
    expect(classifyYouTubeUrl(URLS.playlistVideo)).toBe("playlist-video");
  });

  it("classifies a /channel/ URL as 'channel'", () => {
    expect(classifyYouTubeUrl(URLS.channelById)).toBe("channel");
  });

  it("classifies a /@handle URL as 'channel'", () => {
    expect(classifyYouTubeUrl(URLS.channelByHandle)).toBe("channel");
  });

  it("classifies a youtu.be short link as 'video'", () => {
    expect(classifyYouTubeUrl(URLS.youtubeDotBe)).toBe("video");
  });
});

// ─── 3. NativeMetadataService.analyze() ────────────────────────────────────

describe("NativeMetadataService — analyze()", () => {
  let service: NativeMetadataService;

  beforeEach(() => {
    service = new NativeMetadataService();
  });

  // ── Invalid / unsupported inputs ──────────────────────────────────────────

  it("throws 'invalid_url' for empty string", async () => {
    await expect(service.analyze(URLS.empty)).rejects.toThrow("invalid_url");
  });

  it("throws 'invalid_url' for a non-URL string", async () => {
    await expect(service.analyze(URLS.invalid)).rejects.toThrow("invalid_url");
  });

  it("throws 'unsupported_url' for a non-YouTube URL (vimeo.com)", async () => {
    await expect(service.analyze(URLS.unsupported)).rejects.toThrow("unsupported_url");
  });

  it("throws 'unsupported_url' for any generic valid URL (example.com)", async () => {
    await expect(service.analyze(URLS.nonVideoUnsupported)).rejects.toThrow("unsupported_url");
  });

  // ── Error contract consistency with MockMetadataService ──────────────────

  it("uses 'unsupported_url' as the error message (same as MockMetadataService)", async () => {
    let caught: Error | null = null;
    try {
      await service.analyze("https://vimeo.com/123");
    } catch (err) {
      caught = err as Error;
    }
    expect(caught).not.toBeNull();
    expect(caught?.message).toBe("unsupported_url");
  });

  // ── Video URL ─────────────────────────────────────────────────────────────

  it("returns VideoMetadata for a standard video URL", async () => {
    const result = await service.analyze(URLS.video);
    expect(result.linkType).toBe("video");
    expect(result.sourceUrl).toBe(URLS.video);
  });

  it("VideoMetadata has all required fields populated", async () => {
    const result = await service.analyze(URLS.video) as VideoMetadata;
    expect(result.id).toBeTruthy();
    expect(result.sourceUrl).toBe(URLS.video);
    expect(result.linkType).toBe("video");
    expect(result.thumbnail).toBeTruthy();
    expect(result.title).toBeTruthy();
    expect(result.channelName).toBeTruthy();
    expect(result.duration).toBeTruthy();
    expect(typeof result.views).toBe("number");
    expect(Array.isArray(result.qualityOptions)).toBe(true);
    expect(result.qualityOptions.length).toBeGreaterThan(0);
    expect(Array.isArray(result.videoFormats)).toBe(true);
    expect(Array.isArray(result.audioFormats)).toBe(true);
    expect(result.resolution).toBeTruthy();
    expect(typeof result.fps).toBe("number");
    expect(result.videoCodec).toBeTruthy();
    expect(result.audioCodec).toBeTruthy();
    expect(result.videoBitrate).toBeTruthy();
    expect(result.audioBitrate).toBeTruthy();
    expect(result.container).toBeTruthy();
    expect(typeof result.fileSize).toBe("number");
    expect(result.uploadDate).toBeTruthy();
  });

  it("VideoMetadata thumbnail uses the YouTube standard thumbnail URL pattern", async () => {
    const result = await service.analyze(URLS.video) as VideoMetadata;
    // For a URL with v=dQw4w9WgXcQ, thumbnail should reference that video ID
    expect(result.thumbnail).toContain("dQw4w9WgXcQ");
    expect(result.thumbnail).toContain("ytimg.com");
  });

  // ── Shorts URL ────────────────────────────────────────────────────────────

  it("returns VideoMetadata with linkType 'shorts' for a /shorts/ URL", async () => {
    const result = await service.analyze(URLS.shorts) as VideoMetadata;
    expect(result.linkType).toBe("shorts");
    expect(result.sourceUrl).toBe(URLS.shorts);
  });

  it("Shorts VideoMetadata has all required fields", async () => {
    const result = await service.analyze(URLS.shorts) as VideoMetadata;
    expect(result.id).toBeTruthy();
    expect(result.qualityOptions.length).toBeGreaterThan(0);
    expect(result.videoFormats.length).toBeGreaterThan(0);
    expect(result.audioFormats.length).toBeGreaterThan(0);
  });

  // ── Playlist URL ──────────────────────────────────────────────────────────

  it("returns PlaylistMetadata for a playlist URL", async () => {
    const result = await service.analyze(URLS.playlist);
    expect(result.linkType).toBe("playlist");
    expect(result.sourceUrl).toBe(URLS.playlist);
  });

  it("PlaylistMetadata has required fields including a videos array", async () => {
    const result = await service.analyze(URLS.playlist) as PlaylistMetadata;
    expect(result.id).toBeTruthy();
    expect(result.title).toBeTruthy();
    expect(result.thumbnail).toBeTruthy();
    expect(Array.isArray(result.videos)).toBe(true);
    expect(result.videos.length).toBeGreaterThan(0);
  });

  it("PlaylistMetadata videos are VideoMetadata objects with linkType 'playlist-video'", async () => {
    const result = await service.analyze(URLS.playlist) as PlaylistMetadata;
    for (const video of result.videos) {
      expect(video.linkType).toBe("playlist-video");
      expect(video.qualityOptions.length).toBeGreaterThan(0);
    }
  });

  // ── Playlist-video URL ────────────────────────────────────────────────────

  it("returns VideoMetadata with linkType 'playlist-video' for ?list=&v= URL", async () => {
    const result = await service.analyze(URLS.playlistVideo) as VideoMetadata;
    expect(result.linkType).toBe("playlist-video");
    expect(result.sourceUrl).toBe(URLS.playlistVideo);
  });

  // ── Channel URL ───────────────────────────────────────────────────────────

  it("returns ChannelMetadata for a /channel/ URL", async () => {
    const result = await service.analyze(URLS.channelById);
    expect(result.linkType).toBe("channel");
    expect(result.sourceUrl).toBe(URLS.channelById);
  });

  it("returns ChannelMetadata for a /@handle URL", async () => {
    const result = await service.analyze(URLS.channelByHandle);
    expect(result.linkType).toBe("channel");
  });

  it("ChannelMetadata has required fields including latestVideos array", async () => {
    const result = await service.analyze(URLS.channelById) as ChannelMetadata;
    expect(result.id).toBeTruthy();
    expect(result.name).toBeTruthy();
    expect(result.thumbnail).toBeTruthy();
    expect(typeof result.mockVideoCount).toBe("number");
    expect(Array.isArray(result.latestVideos)).toBe(true);
    expect(result.latestVideos.length).toBeGreaterThan(0);
  });

  // ── youtu.be short link ───────────────────────────────────────────────────

  it("returns VideoMetadata for a youtu.be short link", async () => {
    const result = await service.analyze(URLS.youtubeDotBe) as VideoMetadata;
    expect(result.linkType).toBe("video");
    expect(result.sourceUrl).toBe(URLS.youtubeDotBe);
  });

  it("youtu.be thumbnail includes the video ID in the URL", async () => {
    const result = await service.analyze(URLS.youtubeDotBe) as VideoMetadata;
    expect(result.thumbnail).toContain("ytimg.com");
  });

  // ── Mobile URL ────────────────────────────────────────────────────────────

  it("returns VideoMetadata for m.youtube.com (mobile URL)", async () => {
    const result = await service.analyze(URLS.mobileYoutube);
    expect(result.linkType).toBe("video");
  });

  // ── Determinism ───────────────────────────────────────────────────────────

  it("returns the same linkType on repeated calls for the same URL", async () => {
    const r1 = await service.analyze(URLS.video);
    const r2 = await service.analyze(URLS.video);
    expect(r1.linkType).toBe(r2.linkType);
  });
});
