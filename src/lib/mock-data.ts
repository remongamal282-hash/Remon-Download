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

export type QueueItem = {
  id: string;
  title: string;
  channel: string;
  duration: string;
  quality: string;
  format: string;
  status: DownloadStatus;
  progress: number;
  sizeDone: string;
  sizeTotal: string;
  speed: string;
  eta: string;
  hue: number;
};

export const initialQueue: QueueItem[] = [
  {
    id: "q1",
    title: "شرح كامل لأساسيات التصوير السينمائي بالموبايل",
    channel: "Cine Arabia",
    duration: "24:12",
    quality: "1080p",
    format: "MP4",
    status: "downloading",
    progress: 62,
    sizeDone: "312 MB",
    sizeTotal: "504 MB",
    speed: "4.8 MB/s",
    eta: "00:41",
    hue: 18,
  },
  {
    id: "q2",
    title: "Lo-fi Study Mix — 3 Hours of Calm Beats",
    channel: "Night Tape",
    duration: "3:02:40",
    quality: "Audio Only",
    format: "MP3",
    status: "merging",
    progress: 91,
    sizeDone: "168 MB",
    sizeTotal: "184 MB",
    speed: "1.2 MB/s",
    eta: "00:12",
    hue: 265,
  },
  {
    id: "q3",
    title: "مراجعة أفضل كروت الشاشة لعام 2026",
    channel: "TechRemon",
    duration: "18:03",
    quality: "2160p",
    format: "MKV",
    status: "paused",
    progress: 27,
    sizeDone: "820 MB",
    sizeTotal: "3.02 GB",
    speed: "—",
    eta: "—",
    hue: 200,
  },
  {
    id: "q4",
    title: "How to Cook Perfect Koshari at Home",
    channel: "Cairo Kitchen",
    duration: "12:48",
    quality: "720p",
    format: "MP4",
    status: "queued",
    progress: 0,
    sizeDone: "0 MB",
    sizeTotal: "212 MB",
    speed: "—",
    eta: "—",
    hue: 45,
  },
  {
    id: "q5",
    title: "Interstellar Docking Scene — Score Breakdown",
    channel: "Score Lab",
    duration: "09:21",
    quality: "1440p",
    format: "WEBM",
    status: "failed",
    progress: 44,
    sizeDone: "196 MB",
    sizeTotal: "445 MB",
    speed: "—",
    eta: "—",
    hue: 340,
  },
];

export type HistoryItem = {
  id: string;
  title: string;
  channel: string;
  quality: string;
  format: string;
  size: string;
  date: string;
  status: Extract<DownloadStatus, "completed" | "failed" | "canceled">;
  hue: number;
};

export const historyItems: HistoryItem[] = [
  {
    id: "h1",
    title: "دورة تعلم البرمجة من الصفر — الحلقة 12",
    channel: "Code Arabia",
    quality: "1080p",
    format: "MP4",
    size: "612 MB",
    date: "2026-08-12 21:14",
    status: "completed",
    hue: 22,
  },
  {
    id: "h2",
    title: "Ambient Piano for Deep Focus",
    channel: "Blue Room",
    quality: "Audio Only",
    format: "FLAC",
    size: "241 MB",
    date: "2026-08-12 18:02",
    status: "completed",
    hue: 210,
  },
  {
    id: "h3",
    title: "ملخص مباراة الأمس بالتحليل",
    channel: "Malaeb",
    quality: "720p",
    format: "MP4",
    size: "180 MB",
    date: "2026-08-11 23:40",
    status: "failed",
    hue: 150,
  },
  {
    id: "h4",
    title: "Blender Donut Tutorial — Part 4",
    channel: "Blender Guru",
    quality: "1440p",
    format: "MKV",
    size: "1.4 GB",
    date: "2026-08-11 12:25",
    status: "completed",
    hue: 40,
  },
  {
    id: "h5",
    title: "جولة في شوارع القاهرة القديمة 4K",
    channel: "Walk Egypt",
    quality: "2160p",
    format: "MP4",
    size: "3.1 GB",
    date: "2026-08-10 09:55",
    status: "canceled",
    hue: 300,
  },
];

export type FavoriteItem = {
  id: string;
  title: string;
  channel: string;
  added: string;
  available: boolean;
  hue: number;
};

export const favoriteItems: FavoriteItem[] = [
  {
    id: "f1",
    title: "أفضل 10 اختصارات في Premiere Pro",
    channel: "Edit Room",
    added: "2026-08-09",
    available: true,
    hue: 28,
  },
  {
    id: "f2",
    title: "Full Album — Desert Sessions Live",
    channel: "Live Tapes",
    added: "2026-08-05",
    available: true,
    hue: 250,
  },
  {
    id: "f3",
    title: "Deleted Interview — Archive Copy",
    channel: "Old Archive",
    added: "2026-07-28",
    available: false,
    hue: 0,
  },
  {
    id: "f4",
    title: "تعلّم الإضاءة ثلاثية النقاط في 8 دقائق",
    channel: "Cine Arabia",
    added: "2026-07-21",
    available: true,
    hue: 180,
  },
];

export type PlaylistVideo = {
  id: string;
  index: number;
  title: string;
  duration: string;
  available: boolean;
  hue: number;
};

export const playlistInfo = {
  title: "دورة الجرافيك الكاملة 2026 — 42 درساً",
  channel: "Design Arabia",
  count: 42,
};

export const playlistVideos: PlaylistVideo[] = [
  { id: "p1", index: 1, title: "مقدمة الدورة وخطة العمل", duration: "06:12", available: true, hue: 20 },
  { id: "p2", index: 2, title: "أساسيات نظرية اللون", duration: "18:44", available: true, hue: 35 },
  { id: "p3", index: 3, title: "التايبوغرافي للمبتدئين", duration: "22:05", available: true, hue: 60 },
  { id: "p4", index: 4, title: "درس محجوب من صاحب القناة", duration: "—", available: false, hue: 0 },
  { id: "p5", index: 5, title: "الشبكات والتخطيط (Grids)", duration: "15:30", available: true, hue: 120 },
  { id: "p6", index: 6, title: "تصميم الهوية البصرية", duration: "31:18", available: true, hue: 200 },
  { id: "p7", index: 7, title: "مشروع تطبيقي: بوستر سينمائي", duration: "27:02", available: true, hue: 260 },
  { id: "p8", index: 8, title: "درس محذوف", duration: "—", available: false, hue: 0 },
];

export type Schedule = {
  id: string;
  title: string;
  when: string;
  repeat: "once" | "daily" | "weekly";
  quality: string;
};

export const initialSchedules: Schedule[] = [
  { id: "s1", title: "نشرة الأخبار التقنية الأسبوعية", when: "2026-08-14 02:00", repeat: "weekly", quality: "1080p" },
  { id: "s2", title: "Daily Podcast — Morning Edition", when: "2026-08-14 05:30", repeat: "daily", quality: "Audio Only" },
  { id: "s3", title: "قائمة تشغيل: مؤتمر المطورين", when: "2026-08-15 23:15", repeat: "once", quality: "1440p" },
];

export const analyzedVideo = {
  title: "كيف تبني تطبيق سطح مكتب حقيقي — الدليل الكامل",
  channel: "Remon Gamal",
  duration: "41:26",
  views: "1,284,902",
  uploaded: "2026-06-18",
  resolution: "3840×2160",
  fps: "60",
  codec: "avc1 / H.264",
  bitrate: "18.4 Mbps",
  audioBitrate: "192 kbps",
  container: "mp4",
  size: "2.94 GB",
  qualities: ["2160p", "1440p", "1080p", "720p", "480p", "360p", "144p"],
  subtitles: [
    { lang: "العربية / Arabic", auto: false },
    { lang: "English", auto: false },
    { lang: "Français", auto: true },
    { lang: "Deutsch", auto: true },
  ],
};

export const qualities = [
  "2160p",
  "1440p",
  "1080p",
  "720p",
  "480p",
  "360p",
  "audio",
  "best",
];

export const videoFormats = ["MP4", "MKV", "WEBM"];
export const audioFormats = ["MP3", "M4A", "WAV", "FLAC"];
export const speedLimits = ["500 KB/s", "1 MB/s", "5 MB/s", "10 MB/s", "unlimited"];
