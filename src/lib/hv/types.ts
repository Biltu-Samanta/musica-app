export type RepeatMode = "NO_REPEAT" | "REPEAT_ONE" | "REPEAT_ALL";

export interface AudioItem {
  id: string;
  title: string;
  originalName: string;
  folderId: string | null;
  /** seconds */
  duration: number;
  fileSize: number;
  format: string;
  mimeType: string;
  dateImported: number;
  lastPlayed: number | null;
  playCount: number;
  isFavorite: boolean;
  /** seconds */
  lastPosition: number;
  sha256: string;
  deletedAt: number | null;
}

export interface Folder {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  createdAt: number;
  parentId: string | null;
  pinHash: string | null;
}

export interface Playlist {
  id: string;
  name: string;
  createdAt: number;
  audioIds: string[];
}

export interface Bookmark {
  id: string;
  audioId: string;
  title: string;
  description: string;
  /** seconds */
  timestamp: number;
  createdAt: number;
}

export interface PlaybackHistory {
  id: string;
  audioId: string;
  playedAt: number;
  position: number;
}

export const SUPPORTED_FORMATS = ["opus", "ogg", "mp3", "m4a", "wav", "aac", "flac"] as const;

export const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3] as const;

export const SKIP_INTERVALS = [5, 10, 15, 30, 60] as const;

export const SLEEP_PRESETS = [5, 10, 15, 30, 45, 60] as const;

export const FOLDER_COLORS = ["garnet", "amber", "sage", "sky", "plum", "clay", "ink"] as const;

export const FOLDER_ICONS = [
  "users",
  "home",
  "graduation",
  "user",
  "star",
  "heart",
  "mic",
  "music",
  "briefcase",
  "sparkles",
  "moon",
  "coffee",
] as const;

export const DEFAULT_FOLDERS: Array<Pick<Folder, "name" | "icon" | "color">> = [
  { name: "Friends", icon: "users", color: "sky" },
  { name: "Family", icon: "home", color: "amber" },
  { name: "College", icon: "graduation", color: "sage" },
  { name: "Personal", icon: "user", color: "plum" },
  { name: "Important", icon: "star", color: "garnet" },
];
