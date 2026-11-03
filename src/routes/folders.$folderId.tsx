import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ChevronRight,
  Download,
  FolderPlus,
  ListPlus,
  Lock,
  MoreHorizontal,
  Pencil,
  Play,
  Shuffle,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AudioRow } from "@/components/hv/AudioRow";
import { EmptyState } from "@/components/hv/common";
import { FolderBadge } from "@/components/hv/folder-visual";
import { useUI } from "@/components/hv/ui-context";
import { useLibrary } from "@/lib/hv/library";
import { usePlayer } from "@/lib/hv/player";
import { formatBytes, formatTotalDuration } from "@/lib/hv/format";
import { sortAudios, SORT_LABELS, type SortKey } from "@/lib/hv/query";

export const Route = createFileRoute("/folders/$folderId")({
  head: () => ({
    meta: [
      { title: "Folder — Her Voice" },
      { name: "description", content: "Voice notes saved in this folder." },
      { property: "og:title", content: "Folder — Her Voice" },
      { property: "og:description", content: "Voice notes saved in this folder." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FolderPage,
});

function FolderPage() {
  const { folderId } = Route.useParams();
  const lib = useLibrary();
  const ui = useUI();
  const player = usePlayer();
  const navigate = useNavigate();
  const [sort, setSort] = useState<SortKey>("recent");
  const [pin, setPin] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [playlistOpen, setPlaylistOpen] = useState(false);
  const [newPl, setNewPl] = useState("");

  const folder = lib.folderById.get(folderId);
  const items = useMemo(
    () => sortAudios(lib.audios.filter((a) => a.folderId === folderId && !a.deletedAt), sort),
    [lib.audios, folderId, sort],
  );
  const subfolders = lib.folders.filter((f) => f.parentId === folderId);

  if (!lib.ready) return <div className="p-8" />;
  if (!folder)
    return (
      <div className="pt-16">
        <EmptyState
          icon={<FolderPlus />}
          title="Folder not found"
          body="It may have been deleted."
          action={
            <Button asChild variant="outline">
              <Link to="/library" search={{ tab: "folders" }}>
                Back to folders
              </Link>
            </Button>
          }
        />
      </div>
    );

  const path = lib.folderPath(folderId);
  const locked = lib.isFolderLocked(folderId);
  const ids = items.map((a) => a.id);
  const totalSize = items.reduce((s, a) => s + a.fileSize, 0);
  const totalDur = items.reduce((s, a) => s + a.duration, 0);

  if (locked) {
    const lockedAncestor = path.find((f) => f.pinHash && lib.isFolderLocked(f.id) && !lib.isFolderLocked(f.parentId))!;
    return (
      <div className="flex min-h-[75dvh] flex-col items-center justify-center px-8 text-center">
        <FolderBadge folder={folder} size="lg" />
        <h1 className="mt-6 text-3xl font-medium">{folder.name}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {lockedAncestor.id === folder.id ? "This folder is protected." : `Inside protected folder “${lockedAncestor.name}”.`}{" "}
          Enter the PIN to open it.
        </p>
        <form
          className="mt-6 flex w-full max-w-xs gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const ok = await lib.unlockFolder(lockedAncestor.id, pin);
            if (!ok) toast.error("That PIN isn't right.");
            setPin("");
          }}
        >
          <Input
            autoFocus
            type="password"
            inputMode="numeric"
            aria-label="PIN"
            placeholder="PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
            className="h-12 rounded-xl text-center text-lg tracking-[0.5em]"
          />
          <Button type="submit" variant="hero" className="h-12 rounded-xl">
            Open
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="animate-float-in">
      <header className="relative px-5 pt-6 pb-5">
        <div className="absolute inset-x-0 top-0 h-56 bg-glow" aria-hidden />
        <nav className="relative mb-4 flex flex-wrap items-center gap-1 text-sm text-muted-foreground" aria-label="Breadcrumb">
          <Link to="/library" search={{ tab: "folders" }} className="hover:text-foreground">
            Folders
          </Link>
          {path.slice(0, -1).map((p) => (
            <span key={p.id} className="inline-flex items-center gap-1">
              <ChevronRight className="size-3.5" />
              <Link to="/folders/$folderId" params={{ folderId: p.id }} className="hover:text-foreground">
                {p.name}
              </Link>
            </span>
          ))}
        </nav>
        <div className="relative flex items-start gap-4">
          <FolderBadge folder={folder} size="lg" />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[2rem] leading-tight font-medium">{folder.name}</h1>
            <p className="text-sm text-muted-foreground">
              {items.length} notes · {formatTotalDuration(totalDur)} · {formatBytes(totalSize)}
            </p>
            {folder.description && <p className="mt-1 text-sm">{folder.description}</p>}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-lg" aria-label="Folder options">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 rounded-xl">
              <DropdownMenuItem onClick={() => ui.openFolderEditor({ folder })}>
                <Pencil /> Edit folder
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => ui.openFolderEditor({ parentId: folder.id })}>
                <FolderPlus /> New folder inside
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!items.length} onClick={() => setPlaylistOpen(true)}>
                <ListPlus /> Add all to playlist
              </DropdownMenuItem>
              {folder.pinHash && (
                <DropdownMenuItem onClick={() => lib.lockFolder(folder.id)}>
                  <Lock /> Lock now
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setConfirmDelete(true)}>
                <Trash2 /> Delete folder
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="relative mt-5 flex gap-2">
          <Button variant="hero" size="lg" className="flex-1" disabled={!ids.length} onClick={() => player.playList(ids, undefined, { shuffle: false })}>
            <Play className="fill-current" /> Play all
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="bg-card"
            disabled={!ids.length}
            onClick={() => player.playList(ids, undefined, { shuffle: true })}
          >
            <Shuffle /> Shuffle
          </Button>
          <Button variant="outline" size="lg" className="bg-card" aria-label="Import into this folder" onClick={() => ui.openImport(folder.id)}>
            <Download />
          </Button>
        </div>
      </header>

      {subfolders.length > 0 && (
        <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto px-5">
          {subfolders.map((f) => (
            <Link
              key={f.id}
              to="/folders/$folderId"
              params={{ folderId: f.id }}
              className="flex shrink-0 items-center gap-2 rounded-2xl border bg-card py-1.5 pr-4 pl-1.5"
            >
              <FolderBadge folder={f} size="sm" />
              <span className="text-sm font-semibold">{f.name}</span>
            </Link>
          ))}
        </div>
      )}

      {items.length > 0 && (
        <div className="flex justify-end px-5 pb-1">
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger className="h-9 w-auto rounded-full bg-card text-sm" aria-label="Sort">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(SORT_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {items.length ? (
        <div className="px-2">
          {items.map((a) => (
            <AudioRow key={a.id} audio={a} context={ids} showFolder={false} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Download />}
          title="This folder is empty"
          body="Import voice notes straight into it, or move some here from your library."
          action={
            <Button variant="hero" size="lg" onClick={() => ui.openImport(folder.id)}>
              Import here
            </Button>
          }
        />
      )}

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="rounded-3xl sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-2xl font-medium">Delete “{folder.name}”?</DialogTitle>
            <DialogDescription>
              The folder is removed, but its {items.length} voice notes are kept and moved{" "}
              {folder.parentId ? "to the parent folder" : "out of folders"}.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="lg" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="lg"
              onClick={async () => {
                const parent = folder.parentId;
                await lib.deleteFolder(folder.id);
                toast.success("Folder deleted");
                if (parent) navigate({ to: "/folders/$folderId", params: { folderId: parent } });
                else navigate({ to: "/library", search: { tab: "folders" } });
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={playlistOpen} onOpenChange={setPlaylistOpen}>
        <DialogContent className="rounded-3xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-medium">Add all {items.length} to…</DialogTitle>
          </DialogHeader>
          <form
            className="flex gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!newPl.trim()) return;
              await lib.createPlaylist(newPl.trim(), ids);
              toast.success(`Created ${newPl.trim()}`);
              setNewPl("");
              setPlaylistOpen(false);
            }}
          >
            <Input placeholder="New playlist" value={newPl} onChange={(e) => setNewPl(e.target.value)} className="h-11 rounded-xl" />
            <Button type="submit" variant="soft" className="h-11 rounded-xl">
              Create
            </Button>
          </form>
          <div className="-mx-2 max-h-[45dvh] space-y-1 overflow-y-auto">
            {lib.playlists.map((p) => (
              <button
                key={p.id}
                onClick={async () => {
                  const n = await lib.addToPlaylist(p.id, ids);
                  toast.success(n ? `Added ${n} to ${p.name}` : `Everything is already in ${p.name}`);
                  setPlaylistOpen(false);
                }}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left font-medium hover:bg-muted"
              >
                {p.name}
                <span className="text-xs text-muted-foreground">{p.audioIds.length}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
