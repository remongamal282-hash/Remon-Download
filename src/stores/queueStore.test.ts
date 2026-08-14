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

  it("runs a complete mocked lifecycle", () => {
    useQueueStore.getState().addFromMetadata({ ...metadata, fileSize: 1024 }, "1080p", "mp4");

    useQueueStore.getState().tick(1, "unlimited", 1000);
    expect(useQueueStore.getState().items[0]?.status).toBe("analyzing");

    useQueueStore.getState().tick(1, "unlimited", 1700);
    expect(useQueueStore.getState().items[0]?.status).toBe("downloading");

    useQueueStore.getState().tick(1, "unlimited", 2500);
    expect(useQueueStore.getState().items[0]?.status).toBe("merging");

    useQueueStore.getState().tick(1, "unlimited", 3300);
    expect(useQueueStore.getState().items[0]?.status).toBe("converting");

    useQueueStore.getState().tick(1, "unlimited", 4100);
    expect(useQueueStore.getState().items[0]?.status).toBe("completed");
  });

  it("limits concurrent active downloads", () => {
    useQueueStore.getState().addManyFromMetadata(
      [
        { ...metadata, id: "video-1" },
        { ...metadata, id: "video-2" },
        { ...metadata, id: "video-3" }
      ],
      "1080p",
      "mp4"
    );

    useQueueStore.getState().tick(2, "unlimited", 1000);
    const statuses = useQueueStore.getState().items.map((item) => item.status);

    expect(statuses.filter((status) => status === "analyzing")).toHaveLength(2);
    expect(statuses.filter((status) => status === "queued")).toHaveLength(1);
  });

  it("pauses, resumes, cancels, retries, and removes items", () => {
    const item = useQueueStore.getState().addFromMetadata(metadata, "1080p", "mp4");
    useQueueStore.getState().tick(1, "unlimited", 1000);
    useQueueStore.getState().tick(1, "unlimited", 1700);

    useQueueStore.getState().pause(item.id);
    expect(useQueueStore.getState().items[0]?.status).toBe("paused");

    useQueueStore.getState().resume(item.id);
    expect(useQueueStore.getState().items[0]?.status).toBe("downloading");

    useQueueStore.getState().cancel(item.id);
    expect(useQueueStore.getState().items[0]?.status).toBe("canceled");

    useQueueStore.getState().retry(item.id);
    expect(useQueueStore.getState().items[0]?.status).toBe("retrying");

    useQueueStore.getState().remove(item.id);
    expect(useQueueStore.getState().items).toHaveLength(0);
  });

  it("records mock error scenarios", () => {
    const item = useQueueStore.getState().addFromMetadata(metadata, "1080p", "mp4");
    useQueueStore.getState().tick(1, "unlimited", 1000);

    useQueueStore.getState().simulateError(item.id, "disk_full");

    expect(useQueueStore.getState().items[0]?.status).toBe("failed");
    expect(useQueueStore.getState().items[0]?.errorCode).toBe("disk_full");
  });

  it("reorders items and updates order values", () => {
    const [first, second] = useQueueStore.getState().addManyFromMetadata(
      [
        { ...metadata, id: "video-1", title: "First" },
        { ...metadata, id: "video-2", title: "Second" }
      ],
      "1080p",
      "mp4"
    );

    useQueueStore.getState().reorder(first.id, second.id);

    expect(useQueueStore.getState().items[0]?.title).toBe("Second");
    expect(useQueueStore.getState().items[0]?.order).toBe(1);
    expect(useQueueStore.getState().items[1]?.title).toBe("First");
    expect(useQueueStore.getState().items[1]?.order).toBe(2);
  });
});
