export const CONCURRENT_DOWNLOAD_OPTIONS = [1, 2, 3, 4, 5, 10] as const;

export const SPEED_LIMIT_OPTIONS = [
  { label: "500 KB/s", value: 500 * 1024 },
  { label: "1 MB/s", value: 1024 * 1024 },
  { label: "5 MB/s", value: 5 * 1024 * 1024 },
  { label: "10 MB/s", value: 10 * 1024 * 1024 },
  { label: "Unlimited", value: "unlimited" }
] as const;
