import { strFromU8, strToU8, unzip, zip, type Zippable } from "fflate";
import { db } from "./db";
import { getSettings, replaceSettings } from "./settings";
import type { AudioItem, Bookmark, Folder, PlaybackHistory, Playlist } from "./types";

interface Manifest {
  app: "her-voice";
  version: 1;
  createdAt: number;
  audios: AudioItem[];
  folders: Folder[];
  playlists: Playlist[];
  bookmarks: Bookmark[];
  history: PlaybackHistory[];
  settings: ReturnType<typeof getSettings>;
}

export async function createBackup(onProgress?: (done: number, total: number) => void): Promise<Blob> {
  const [audios, folders, playlists, bookmarks, history] = await Promise.all([
    db.all<AudioItem>("audios"),
    db.all<Folder>("folders"),
    db.all<Playlist>("playlists"),
    db.all<Bookmark>("bookmarks"),
    db.all<PlaybackHistory>("history"),
  ]);
  const manifest: Manifest = {
    app: "her-voice",
    version: 1,
    createdAt: Date.now(),
    audios,
    folders,
    playlists,
    bookmarks,
    history,
    settings: getSettings(),
  };
  const files: Zippable = { "manifest.json": strToU8(JSON.stringify(manifest)) };
  let done = 0;
  for (const a of audios) {
    const blob = await db.getFile(a.id);
    if (blob) files[`audio/${a.id}`] = [new Uint8Array(await blob.arrayBuffer()), { level: 0 }];
    onProgress?.(++done, audios.length);
  }
  const data = await new Promise<Uint8Array>((res, rej) => zip(files, (err, out) => (err ? rej(err) : res(out))));
  return new Blob([data as BlobPart], { type: "application/zip" });
}

export async function restoreBackup(file: File): Promise<number> {
  const buf = new Uint8Array(await file.arrayBuffer());
  const entries = await new Promise<Record<string, Uint8Array>>((res, rej) =>
    unzip(buf, (err, out) => (err ? rej(err) : res(out))),
  );
  const raw = entries["manifest.json"];
  if (!raw) throw new Error("This file isn't a Her Voice backup.");
  const m = JSON.parse(strFromU8(raw)) as Manifest;
  if (m.app !== "her-voice") throw new Error("This file isn't a Her Voice backup.");
  let restored = 0;
  for (const a of m.audios) {
    const bytes = entries[`audio/${a.id}`];
    if (!bytes) continue;
    await db.putFile(a.id, new Blob([bytes as BlobPart], { type: a.mimeType }));
    await db.put("audios", a);
    restored++;
  }
  await db.putMany("folders", m.folders);
  await db.putMany("playlists", m.playlists);
  await db.putMany("bookmarks", m.bookmarks);
  await db.putMany("history", m.history);
  if (m.settings) replaceSettings({ ...m.settings, onboarded: true });
  return restored;
}
