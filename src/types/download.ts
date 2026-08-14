export type LinkType =
  | "video"
  | "shorts"
  | "playlist"
  | "playlist-video"
  | "channel";

export type VideoLinkType = "video" | "shorts" | "playlist-video";

export type DownloadStatus =
  | "queued"
  | "analyzing"
  | "downloading"
  | "paused"
  | "merging"
  | "converting"
  | "completed"
  | "failed"
  | "canceled"
  | "retrying";

export interface VideoMetadata {
  id: string;
  sourceUrl: string;
  linkType: VideoLinkType;
  thumbnail: string;
  title: string;
  channelName: string;
  duration: string;
  views: number;
  qualityOptions: string[];
  videoFormats: string[];
  audioFormats: string[];
  resolution: string;
  fps: number;
  videoCodec: string;
  audioCodec: string;
  videoBitrate: string;
  audioBitrate: string;
  container: string;
  fileSize: number;
  uploadDate: string;
}

export interface PlaylistMetadata {
  id: string;
  sourceUrl: string;
  linkType: "playlist";
  title: string;
  thumbnail: string;
  videos: VideoMetadata[];
}

export interface ChannelMetadata {
  id: string;
  sourceUrl: string;
  linkType: "channel";
  name: string;
  thumbnail: string;
  mockVideoCount: number;
  latestVideos: VideoMetadata[];
}

export type AnalysisResult = VideoMetadata | PlaylistMetadata | ChannelMetadata;

export interface DownloadItem {
  id: string;
  metadataId: string;
  thumbnail: string;
  title: string;
  sourceUrl: string;
  quality: string;
  format: string;
  fileSize: number;
  downloadedSize: number;
  speed: number;
  eta: string;
  progress: number;
  status: DownloadStatus;
  order: number;
  addedAt: string;
  retryCount: number;
}
