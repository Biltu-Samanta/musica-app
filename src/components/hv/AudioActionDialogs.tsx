import { useEffect, useState } from "react";
import { Bookmark as BookmarkIcon, Check, Inbox, ListPlus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useLibrary } from "@/lib/hv/library";
import { usePlayer } from "@/lib/hv/player";
import { formatBytes, formatTime, relativeDate } from "@/lib/hv/format";
import { FolderBadge } from "./folder-visual";

export type AudioAction = "rename" | "move" | "playlist" | "info" | "delete";

export function AudioActionDialogs({
  action,
  onClose,
}: {
  action: { kind: AudioAction; id: string } | null;
  onClose: () => void;
}) {
  const lib = useLibrary();
  const player = usePlayer();
  const audio = action ? lib.audioById.get(action.id) : undefined;
  const [name, setName] = useState("");
  const [newPlaylist, setNewPlaylist] = useState("");

  useEffect(() => {
    if (audio) setName(audio.title);
    setNewPlaylist("");
  }, [action?.id, action?.kind]);

  if (!action || !audio) return null;
  const open = (k: AudioAction) => action.kind === k;
  const folder = audio.folderId ? lib.folderById.get(audio.folderId) : undefined;
  const bms = lib.bookmarks.filter((b) => b.audioId === audio.id).sort((a, b) => a.timestamp - b.timestamp);

  return (
    <>
      <Dialog open={open("rename")} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="rounded-3xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-medium">Rename</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!name.trim()) return;
              await lib.updateAudio(audio.id, { title: name.trim() });
              toast.success("Renamed");
              onClose();
            }}
            className="space-y-4"
          >
            <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} className="h-11 rounded-xl" />
            <DialogFooter>
              <Button type="submit" variant="hero" size="lg" className="w-full">
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={open("move")} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="rounded-3xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-medium">Move to folder</DialogTitle>
            <DialogDescription className="truncate">{audio.title}</DialogDescription>
          </DialogHeader>
          <div className="-mx-2 max-h-[55dvh] space-y-1 overflow-y-auto">
            <button
              onClick={async () => {
                await lib.moveAudios([audio.id], null);
                toast.success("Moved out of folders");
                onClose();
              }}
              className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-muted"
            >
              <span className="inline-flex size-11 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <Inbox className="size-5" />
              </span>
              <span className="flex-1 font-medium">No folder</span>
              {!audio.folderId && <Check className="size-4 text-primary" />}
            </button>
            {lib.folders.map((f) => (
              <button
                key={f.id}
                onClick={async () => {
                  await lib.moveAudios([audio.id], f.id);
                  toast.success(`Moved to ${f.name}`);
                  onClose();
                }}
                className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-muted"
              >
                <FolderBadge folder={f} />
                <span className="flex-1 truncate font-medium">
                  {lib.folderPath(f.id).map((p) => p.name).join(" / ")}
                </span>
                {audio.folderId === f.id && <Check className="size-4 text-primary" />}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={open("playlist")} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="rounded-3xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-medium">Add to playlist</DialogTitle>
            <DialogDescription className="truncate">{audio.title}</DialogDescription>
          </DialogHeader>
          <form
            className="flex gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!newPlaylist.trim()) return;
              const p = await lib.createPlaylist(newPlaylist.trim(), [audio.id]);
              toast.success(`Added to ${p.name}`);
              onClose();
            }}
          >
            <Input
              placeholder="New playlist name"
              value={newPlaylist}
              onChange={(e) => setNewPlaylist(e.target.value)}
              className="h-11 rounded-xl"
            />
            <Button type="submit" variant="soft" className="h-11 rounded-xl" aria-label="Create playlist">
              <Plus />
            </Button>
          </form>
          <div className="-mx-2 max-h-[45dvh] space-y-1 overflow-y-auto">
            {lib.playlists.map((p) => {
              const has = p.audioIds.includes(audio.id);
              return (
                <button
                  key={p.id}
                  disabled={has}
                  onClick={async () => {
                    await lib.addToPlaylist(p.id, [audio.id]);
                    toast.success(`Added to ${p.name}`);
                    onClose();
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-muted disabled:opacity-60"
                >
                  <span className="inline-flex size-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                    <ListPlus className="size-5" />
                  </span>
                  <span className="flex-1 truncate font-medium">{p.name}</span>
                  <span className="text-xs text-muted-foreground">{has ? "Added" : `${p.audioIds.length}`}</span>
                </button>
              );
            })}
            {!lib.playlists.length && (
              <p className="px-2 py-4 text-center text-sm text-muted-foreground">No playlists yet. Create one above.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={open("info")} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-3xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-medium break-words">{audio.title}</DialogTitle>
            <DialogDescription>{folder ? lib.folderPath(folder.id).map((p) => p.name).join(" / ") : "No folder"}</DialogDescription>
          </DialogHeader>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-2xl bg-muted/60 p-4 text-sm">
            {[
              ["Duration", formatTime(audio.duration)],
              ["Format", audio.format.toUpperCase()],
              ["Size", formatBytes(audio.fileSize)],
              ["Imported", new Date(audio.dateImported).toLocaleDateString()],
              ["Last played", relativeDate(audio.lastPlayed)],
              ["Times played", String(audio.playCount)],
              ["Resume at", formatTime(audio.lastPosition)],
              ["Original file", audio.originalName],
            ].map(([k, v]) => (
              <div key={k} className="min-w-0">
                <dt className="text-xs text-muted-foreground">{k}</dt>
                <dd className="truncate font-medium">{v}</dd>
              </div>
            ))}
          </dl>
          <div>
            <h3 className="mb-2 flex items-center gap-2 text-lg font-medium">
              <BookmarkIcon className="size-4" /> Bookmarks
            </h3>
            {bms.length ? (
              <ul className="space-y-1">
                {bms.map((b) => (
                  <li key={b.id} className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-muted">
                    <button
                      className="min-w-0 flex-1 text-left"
                      onClick={() => {
                        if (player.current?.id !== audio.id) player.playList([audio.id]);
                        setTimeout(() => player.seek(b.timestamp), player.current?.id === audio.id ? 0 : 400);
                        onClose();
                      }}
                    >
                      <span className="mr-2 font-mono text-xs text-primary">{formatTime(b.timestamp)}</span>
                      <span className="font-medium">{b.title}</span>
                      {b.description && <p className="truncate text-xs text-muted-foreground">{b.description}</p>}
                    </button>
                    <button
                      aria-label="Delete bookmark"
                      onClick={() => lib.deleteBookmark(b.id)}
                      className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Add bookmarks from the player while listening.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={open("delete")} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="rounded-3xl sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-2xl font-medium">Delete voice note?</DialogTitle>
            <DialogDescription>
              “{audio.title}” moves to Recently deleted. You can restore it from Activity.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="lg" onClick={onClose}>
              Keep
            </Button>
            <Button
              variant="destructive"
              size="lg"
              onClick={async () => {
                await lib.trashAudio(audio.id);
                toast("Moved to Recently deleted", {
                  action: { label: "Undo", onClick: () => lib.restoreAudio(audio.id) },
                });
                onClose();
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
