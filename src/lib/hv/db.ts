import { openDB, type IDBPDatabase } from "idb";

export type StoreName = "audios" | "folders" | "playlists" | "bookmarks" | "history" | "files";

let dbPromise: Promise<IDBPDatabase> | null = null;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB("her-voice", 1, {
      upgrade(db) {
        db.createObjectStore("audios", { keyPath: "id" });
        db.createObjectStore("folders", { keyPath: "id" });
        db.createObjectStore("playlists", { keyPath: "id" });
        db.createObjectStore("bookmarks", { keyPath: "id" });
        db.createObjectStore("history", { keyPath: "id" });
        // Raw audio blobs keyed by audio id.
        db.createObjectStore("files");
      },
    });
  }
  return dbPromise;
}

export const db = {
  async all<T>(store: Exclude<StoreName, "files">): Promise<T[]> {
    return (await getDB()).getAll(store) as Promise<T[]>;
  },
  async put<T>(store: Exclude<StoreName, "files">, value: T) {
    await (await getDB()).put(store, value);
  },
  async putMany<T>(store: Exclude<StoreName, "files">, values: T[]) {
    const tx = (await getDB()).transaction(store, "readwrite");
    await Promise.all([...values.map((v) => tx.store.put(v)), tx.done]);
  },
  async del(store: StoreName, id: string) {
    await (await getDB()).delete(store, id);
  },
  async delMany(store: StoreName, ids: string[]) {
    if (!ids.length) return;
    const tx = (await getDB()).transaction(store, "readwrite");
    await Promise.all([...ids.map((id) => tx.store.delete(id)), tx.done]);
  },
  async getFile(id: string): Promise<Blob | undefined> {
    return (await getDB()).get("files", id);
  },
  async putFile(id: string, blob: Blob) {
    await (await getDB()).put("files", blob, id);
  },
};

export function uid() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}
