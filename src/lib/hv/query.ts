import type { AudioItem } from "./types";

export type SortKey = "recent" | "played" | "alpha" | "duration" | "size";
export type DateFilter = "any" | "today" | "week" | "month";
export type LengthFilter = "any" | "short" | "medium" | "long";

export const SORT_LABELS: Record<SortKey, string> = {
  recent: "Recently added",
  played: "Recently played",
  alpha: "A to Z",
  duration: "Longest first",
  size: "Largest first",
};

export function sortAudios(list: AudioItem[], sort: SortKey) {
  const out = [...list];
  switch (sort) {
    case "alpha":
      return out.sort((a, b) => a.title.localeCompare(b.title));
    case "played":
      return out.sort((a, b) => (b.lastPlayed ?? 0) - (a.lastPlayed ?? 0));
    case "duration":
      return out.sort((a, b) => b.duration - a.duration);
    case "size":
      return out.sort((a, b) => b.fileSize - a.fileSize);
    default:
      return out.sort((a, b) => b.dateImported - a.dateImported);
  }
}

export function filterAudios(
  list: AudioItem[],
  f: {
    q?: string | undefined;
    favorites?: boolean | undefined;
    date?: DateFilter | undefined;
    length?: LengthFilter | undefined;
    folderNames?: Map<string, string> | undefined;
  },
) {
  const q = f.q?.trim().toLowerCase();
  const now = Date.now();
  const since =
    f.date === "today" ? now - 864e5 : f.date === "week" ? now - 7 * 864e5 : f.date === "month" ? now - 30 * 864e5 : 0;
  return list.filter((a) => {
    if (f.favorites && !a.isFavorite) return false;
    if (since && a.dateImported < since) return false;
    if (f.length === "short" && a.duration >= 60) return false;
    if (f.length === "medium" && (a.duration < 60 || a.duration > 300)) return false;
    if (f.length === "long" && a.duration <= 300) return false;
    if (q) {
      const folder = a.folderId ? (f.folderNames?.get(a.folderId) ?? "") : "";
      if (!a.title.toLowerCase().includes(q) && !folder.toLowerCase().includes(q)) return false;
    }
    return true;
  });
}
