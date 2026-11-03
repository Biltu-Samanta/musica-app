import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { db, uid } from "./db";
import { sha256 } from "./format";
import {
  DEFAULT_FOLDERS,
  type AudioItem,
  type Bookmark,
  type Folder,
  type PlaybackHistory,
  type Playlist,
} from "./types";

export interface ImportItem {
  file: File;
  title: string;
  folderId: string | null;
  duration: number;
  format: string;
  hash: string;
}

interface LibraryValue {
  ready: boolean;
  audios: AudioItem[];
  /** Not deleted and not inside a locked folder. */
  visibleAudios: AudioItem[];
  trash: AudioItem[];
  folders: Folder[];
  playlists: Playlist[];
  bookmarks: Bookmark[];
  history: PlaybackHistory[];
  audioById: Map<string, AudioItem>;
  folderById: Map<string, Folder>;

  importAudios: (items: ImportItem[], onProgress?: (done: number, total: number) => void) => Promise<number>;
  findDuplicate: (hash: string) => AudioItem | undefined;
  updateAudio: (id: string, patch: Partial<AudioItem>) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  moveAudios: (ids: string[], folderId: string | null) => Promise<void>;
  trashAudio: (id: string) => Promise<void>;
  restoreAudio: (id: string) => Promise<void>;
  deleteForever: (ids: string[]) => Promise<void>;
  getFile: (id: string) => Promise<Blob | undefined>;
  getFileUrl: (id: string) => Promise<string | null>;
  recordPlay: (id: string, position: number) => Promise<void>;
  savePosition: (id: string, position: number) => Promise<void>;

  createFolder: (data: Partial<Folder> & { name: string }) => Promise<Folder>;
  updateFolder: (id: string, patch: Partial<Folder>) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
  isFolderLocked: (id: string | null) => boolean;
  unlockFolder: (id: string, pin: string) => Promise<boolean>;
  lockFolder: (id: string) => void;
  folderPath: (id: string | null) => Folder[];

  createPlaylist: (name: string, audioIds?: string[]) => Promise<Playlist>;
  updatePlaylist: (id: string, patch: Partial<Playlist>) => Promise<void>;
  deletePlaylist: (id: string) => Promise<void>;
  addToPlaylist: (id: string, audioIds: string[]) => Promise<number>;

  addBookmark: (b: Omit<Bookmark, "id" | "createdAt">) => Promise<void>;
  updateBookmark: (id: string, patch: Partial<Bookmark>) => Promise<void>;
  deleteBookmark: (id: string) => Promise<void>;

  clearHistory: () => Promise<void>;
  reload: () => Promise<void>;
}

const LibraryContext = createContext<LibraryValue | null>(null);

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [audios, setAudios] = useState<AudioItem[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [history, setHistory] = useState<PlaybackHistory[]>([]);
  const [unlocked, setUnlocked] = useState<Set<string>>(new Set());
  const urlCache = useRef(new Map<string, string>());
  const audiosRef = useRef(audios);
  audiosRef.current = audios;

  const reload = useCallback(async () => {
    let [a, f, p, b, h] = await Promise.all([
      db.all<AudioItem>("audios"),
      db.all<Folder>("folders"),
      db.all<Playlist>("playlists"),
      db.all<Bookmark>("bookmarks"),
      db.all<PlaybackHistory>("history"),
    ]);
    if (!f.length && !localStorage.getItem("her-voice:seeded")) {
      const now = Date.now();
      f = DEFAULT_FOLDERS.map((d, i) => ({
        id: uid(),
        description: "",
        createdAt: now + i,
        parentId: null,
        pinHash: null,
        ...d,
      }));
      await db.putMany("folders", f);
      localStorage.setItem("her-voice:seeded", "1");
    }
    setAudios(a);
    setFolders(f.sort((x, y) => x.createdAt - y.createdAt));
    setPlaylists(p.sort((x, y) => y.createdAt - x.createdAt));
    setBookmarks(b);
    setHistory(h.sort((x, y) => y.playedAt - x.playedAt));
    setReady(true);
  }, []);

  useEffect(() => {
    reload().catch((e) => {
      console.error("Library failed to load", e);
      setReady(true);
    });
  }, [reload]);

  const audioById = useMemo(() => new Map(audios.map((a) => [a.id, a])), [audios]);
  const folderById = useMemo(() => new Map(folders.map((f) => [f.id, f])), [folders]);

  const folderPath = useCallback(
    (id: string | null) => {
      const path: Folder[] = [];
      let cur = id ? folderById.get(id) : undefined;
      let guard = 0;
      while (cur && guard++ < 50) {
        path.unshift(cur);
        cur = cur.parentId ? folderById.get(cur.parentId) : undefined;
      }
      return path;
    },
    [folderById],
  );

  const isFolderLocked = useCallback(
    (id: string | null) => folderPath(id).some((f) => f.pinHash && !unlocked.has(f.id)),
    [folderPath, unlocked],
  );

  const visibleAudios = useMemo(
    () => audios.filter((a) => !a.deletedAt && !isFolderLocked(a.folderId)),
    [audios, isFolderLocked],
  );
  const trash = useMemo(
    () => audios.filter((a) => a.deletedAt).sort((x, y) => (y.deletedAt ?? 0) - (x.deletedAt ?? 0)),
    [audios],
  );

  const patchAudioState = (id: string, patch: Partial<AudioItem>) => {
    let next: AudioItem | undefined;
    setAudios((list) =>
      list.map((a) => {
        if (a.id !== id) return a;
        next = { ...a, ...patch };
        return next;
      }),
    );
    const base = audiosRef.current.find((a) => a.id === id);
    return next ?? (base ? { ...base, ...patch } : undefined);
  };

  const updateAudio = useCallback(async (id: string, patch: Partial<AudioItem>) => {
    const next = patchAudioState(id, patch);
    if (next) await db.put("audios", next);
  }, []);

  const value: LibraryValue = {
    ready,
    audios,
    visibleAudios,
    trash,
    folders,
    playlists,
    bookmarks,
    history,
    audioById,
    folderById,
    folderPath,
    isFolderLocked,

    findDuplicate: (hash) => audiosRef.current.find((a) => a.sha256 === hash && !a.deletedAt),

    async importAudios(items, onProgress) {
      const created: AudioItem[] = [];
      for (let i = 0; i < items.length; i++) {
        const it = items[i]!;
        const item: AudioItem = {
          id: uid(),
          title: it.title.trim() || it.file.name,
          originalName: it.file.name,
          folderId: it.folderId,
          duration: it.duration,
          fileSize: it.file.size,
          format: it.format,
          mimeType: it.file.type || `audio/${it.format}`,
          dateImported: Date.now() + i,
          lastPlayed: null,
          playCount: 0,
          isFavorite: false,
          lastPosition: 0,
          sha256: it.hash || (await sha256(await it.file.arrayBuffer())),
          deletedAt: null,
        };
        // Copy the file bytes first so metadata never points at a missing file.
        await db.putFile(item.id, new Blob([await it.file.arrayBuffer()], { type: item.mimeType }));
        await db.put("audios", item);
        created.push(item);
        onProgress?.(i + 1, items.length);
      }
      setAudios((list) => [...list, ...created]);
      return created.length;
    },

    updateAudio,

    async toggleFavorite(id) {
      const a = audiosRef.current.find((x) => x.id === id);
      if (a) await updateAudio(id, { isFavorite: !a.isFavorite });
    },

    async moveAudios(ids, folderId) {
      for (const id of ids) await updateAudio(id, { folderId });
    },

    trashAudio: (id) => updateAudio(id, { deletedAt: Date.now() }),
    restoreAudio: (id) => updateAudio(id, { deletedAt: null }),

    async deleteForever(ids) {
      await db.delMany("audios", ids);
      await db.delMany("files", ids);
      const bms = bookmarks.filter((b) => ids.includes(b.audioId)).map((b) => b.id);
      await db.delMany("bookmarks", bms);
      const hs = history.filter((h) => ids.includes(h.audioId)).map((h) => h.id);
      await db.delMany("history", hs);
      const changed = playlists
        .filter((p) => p.audioIds.some((x) => ids.includes(x)))
        .map((p) => ({ ...p, audioIds: p.audioIds.filter((x) => !ids.includes(x)) }));
      await db.putMany("playlists", changed);
      ids.forEach((id) => {
        const u = urlCache.current.get(id);
        if (u) URL.revokeObjectURL(u);
        urlCache.current.delete(id);
      });
      setAudios((l) => l.filter((a) => !ids.includes(a.id)));
      setBookmarks((l) => l.filter((b) => !ids.includes(b.audioId)));
      setHistory((l) => l.filter((h) => !ids.includes(h.audioId)));
      setPlaylists((l) => l.map((p) => changed.find((c) => c.id === p.id) ?? p));
    },

    getFile: (id) => db.getFile(id),

    async getFileUrl(id) {
      const cached = urlCache.current.get(id);
      if (cached) return cached;
      const blob = await db.getFile(id);
      if (!blob || !blob.size) return null;
      const url = URL.createObjectURL(blob);
      urlCache.current.set(id, url);
      return url;
    },

    async recordPlay(id, position) {
      const a = audiosRef.current.find((x) => x.id === id);
      if (!a) return;
      await updateAudio(id, { playCount: a.playCount + 1, lastPlayed: Date.now() });
      const entry: PlaybackHistory = { id: uid(), audioId: id, playedAt: Date.now(), position };
      await db.put("history", entry);
      setHistory((h) => [entry, ...h].slice(0, 500));
    },

    savePosition: (id, position) => updateAudio(id, { lastPosition: position }),

    async createFolder(data) {
      const folder: Folder = {
        id: uid(),
        description: "",
        icon: "mic",
        color: "garnet",
        createdAt: Date.now(),
        parentId: null,
        pinHash: null,
        ...data,
      };
      await db.put("folders", folder);
      setFolders((l) => [...l, folder]);
      return folder;
    },

    async updateFolder(id, patch) {
      const f = folderById.get(id);
      if (!f) return;
      const next = { ...f, ...patch };
      await db.put("folders", next);
      setFolders((l) => l.map((x) => (x.id === id ? next : x)));
    },

    async deleteFolder(id) {
      const f = folderById.get(id);
      if (!f) return;
      // Children move up one level; voice notes inside become unfiled.
      const children = folders.filter((x) => x.parentId === id).map((x) => ({ ...x, parentId: f.parentId }));
      await db.putMany("folders", children);
      for (const a of audiosRef.current.filter((x) => x.folderId === id)) {
        await updateAudio(a.id, { folderId: f.parentId });
      }
      await db.del("folders", id);
      setFolders((l) =>
        l.filter((x) => x.id !== id).map((x) => children.find((c) => c.id === x.id) ?? x),
      );
    },

    async unlockFolder(id, pin) {
      const f = folderById.get(id);
      if (!f?.pinHash) return true;
      const ok = (await sha256(`her-voice:${pin}`)) === f.pinHash;
      if (ok) setUnlocked((s) => new Set(s).add(id));
      return ok;
    },

    lockFolder(id) {
      setUnlocked((s) => {
        const n = new Set(s);
        n.delete(id);
        return n;
      });
    },

    async createPlaylist(name, audioIds = []) {
      const p: Playlist = { id: uid(), name, createdAt: Date.now(), audioIds };
      await db.put("playlists", p);
      setPlaylists((l) => [p, ...l]);
      return p;
    },

    async updatePlaylist(id, patch) {
      const p = playlists.find((x) => x.id === id);
      if (!p) return;
      const next = { ...p, ...patch };
      await db.put("playlists", next);
      setPlaylists((l) => l.map((x) => (x.id === id ? next : x)));
    },

    async deletePlaylist(id) {
      await db.del("playlists", id);
      setPlaylists((l) => l.filter((x) => x.id !== id));
    },

    async addToPlaylist(id, audioIds) {
      const p = playlists.find((x) => x.id === id);
      if (!p) return 0;
      const fresh = audioIds.filter((a) => !p.audioIds.includes(a));
      const next = { ...p, audioIds: [...p.audioIds, ...fresh] };
      await db.put("playlists", next);
      setPlaylists((l) => l.map((x) => (x.id === id ? next : x)));
      return fresh.length;
    },

    async addBookmark(b) {
      const bm: Bookmark = { ...b, id: uid(), createdAt: Date.now() };
      await db.put("bookmarks", bm);
      setBookmarks((l) => [...l, bm]);
    },

    async updateBookmark(id, patch) {
      const b = bookmarks.find((x) => x.id === id);
      if (!b) return;
      const next = { ...b, ...patch };
      await db.put("bookmarks", next);
      setBookmarks((l) => l.map((x) => (x.id === id ? next : x)));
    },

    async deleteBookmark(id) {
      await db.del("bookmarks", id);
      setBookmarks((l) => l.filter((x) => x.id !== id));
    },

    async clearHistory() {
      await db.delMany(
        "history",
        history.map((h) => h.id),
      );
      setHistory([]);
    },

    reload,
  };

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary() {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error("useLibrary must be used inside LibraryProvider");
  return ctx;
}
