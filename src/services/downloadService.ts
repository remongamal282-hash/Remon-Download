import type { DownloadItem, VideoMetadata } from "../types/download";

export interface DownloadService {
  createFromMetadata(metadata: VideoMetadata, order: number, quality: string, format: string): DownloadItem;
}

export class MockDownloadService implements DownloadService {
  createFromMetadata(metadata: VideoMetadata, order: number, quality: string, format: string): DownloadItem {
    return {
      id: crypto.randomUUID(),
      metadataId: metadata.id,
      thumbnail: metadata.thumbnail,
      title: metadata.title,
      sourceUrl: metadata.sourceUrl,
      quality,
      format,
      fileSize: metadata.fileSize,
      downloadedSize: 0,
      speed: 0,
      eta: "--",
      progress: 0,
      status: "queued",
      order,
      addedAt: new Date().toISOString(),
      retryCount: 0
    };
  }
}

export const downloadService: DownloadService = new MockDownloadService();
