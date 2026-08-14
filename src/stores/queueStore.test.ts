import { beforeEach, describe, expect, it } from "vitest";
import type { VideoMetadata } from "../types/download";
import { useQueueStore } from "./queueStore";

const metadata: VideoMetadata = {
  id: "video-1",
  sourceUrl: "https://www.youtube.com/watch?v=abc",
  linkType: "video",
  thumbnail: "https://example.com/thumb.jpg",
  title: "Test Video",
  channelName: "Test Channel",
  duration: "10:00",
  views: 100,
  qualityOptions: ["1080p"],
  videoFormats: ["mp4"],
  audioFormats: ["m4a"],
  resolution: "1080p",
  fps: 60,
  videoCodec: "H.264",
  audioCodec: "AAC",
  videoBitrate: "8 Mbps",
  audioBitrate: "192 Kbps",
  container: "mp4",
  fileSize: 1024,
  uploadDate: "2026-08-01"
};

describe("useQueueStore", () => {
  beforeEach(() => {
    useQueueStore.getState().clear();
  });

  it("adds metadata to the queue without starting download", () => {
    const item = useQueueStore.getState().addFromMetadata(metadata, "1080p", "mp4");
    expect(item.status).toBe("queued");
    expect(useQueueStore.getState().items).toHaveLength(1);
  });
});
