import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronDown, ChevronUp, ListMusic, MinusCircle, Pencil, Play, Plus, Shuffle, Trash2, Repeat } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { AudioRow } from "@/components/hv/AudioRow";
import { EmptyState } from "@/components/hv/common";
import { useLibrary } from "@/lib/hv/library";
import { usePlayer } from "@/lib/hv/player";
import { formatTime, formatTotalDuration } from "@/lib/hv/format";

export const Route = createFileRoute("/playlists/$playlistId")({
  head: () => ({
    meta: [
      { title: "Playlist — Her Voice" },
      { name: "description", content: "Play, shuffle and reorder the voice notes in this playlist." },
      { property: "og:title", content: "Playlist — Her Voice" },
      { property: "og:description", content: "Play, shuffle and reorder the voice notes in this playlist." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PlaylistPage,
});

function PlaylistPage() {
  const { playlistId } = Route.useParams();
  const lib = useLibrary();
  const player = usePlayer();
  const navigate = useNavigate();
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState("");

  const p = lib.playlists.find((x) => x.id === playlistId);
  const items = useMemo(
    () => (p ? p.audioIds.map((id) => lib.audioById.get(id)).filter((a) => a && !a.deletedAt && !lib.isFolderLocked(a.folderId)) : []),
    [p, lib.audioById, lib.isFolderLocked],
  ) as NonNullable<ReturnType<typeof lib.audioById.get>>[];

  if (!lib.ready) return <div className="p-8" />;
  if (!p)
    return (
      <div className="pt-16">
        <EmptyState
          icon={<ListMusic />}
          title="Playlist not found"
          action={
            <Button asChild variant="outline">
              <Link to="/playlists">All playlists</Link>
            </Button>
          }
        />
      </div>
    );

  const ids = items.map((a) => a.id);
  const move = (index: number, dir: -1 | 1) => {
    const arr = [...p.audioIds];
    const a = ids[index];
    const b = ids[index + dir];
    if (!a || !b) return;
    const from = arr.indexOf(a);
    const to = arr.indexOf(b);
    if (from < 0 || to < 0) return;
    arr[from] = b;
    arr[to] = a;
    void lib.updatePlaylist(p.id, { audioIds: arr });
  };
  const candidates = lib.visibleAudios
    .filter((a) => !p.audioIds.includes(a.id))
    .filter((a) => !filter || a.title.toLowerCase().includes(filter.toLowerCase()))
    .sort((a, b) => b.dateImported - a.dateImported);

  return (
    <div className="animate-float-in">
      <header className="relative px-5 pt-6 pb-5">
        <div className="absolute inset-x-0 top-0 h-56 bg-glow" aria-hidden />
        <Link to="/playlists" className="relative text-sm text-muted-foreground hover:text-foreground">
          ← Playlists
        </Link>
        {renaming ? (
          <form
            className="relative mt-3 flex gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!name.trim()) return;
              await lib.updatePlaylist(p.id, { name: name.trim() });
              setRenaming(false);
            }}
          >
            <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} className="h-12 rounded-xl text-lg" />
            <Button type="submit" variant="hero" className="h-12 rounded-xl">
              Save
            </Button>
          </form>
        ) : (
          <div className="relative mt-3 flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-[2rem] leading-tight font-medium">{p.name}</h1>
              <p className="text-sm text-muted-foreground">
                {items.length} notes · {formatTotalDuration(items.reduce((s, a) => s + a.duration, 0))}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon-lg"
              aria-label="Rename playlist"
              onClick={() => {
                setName(p.name);
                setRenaming(true);
              }}
            >
              <Pencil />
            </Button>
            <Button
              variant="ghost"
              size="icon-lg"
              aria-label="Delete playlist"
              onClick={async () => {
                await lib.deletePlaylist(p.id);
                toast.success("Playlist deleted");
                navigate({ to: "/playlists" });
              }}
            >
              <Trash2 />
            </Button>
          </div>
        )}
        <div className="relative mt-5 flex gap-2">
          <Button variant="hero" size="lg" className="flex-1" disabled={!ids.length} onClick={() => player.playList(ids, undefined, { shuffle: false })}>
            <Play className="fill-current" /> Play
          </Button>
          <Button variant="outline" size="lg" className="bg-card" aria-label="Shuffle" disabled={!ids.length} onClick={() => player.playList(ids, undefined, { shuffle: true })}>
            <Shuffle />
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="bg-card"
            aria-label="Play on repeat"
            disabled={!ids.length}
            onClick={() => {
              player.setRepeat("REPEAT_ALL");
              player.playList(ids, undefined, { shuffle: false });
            }}
          >
            <Repeat />
          </Button>
          <Button variant="outline" size="lg" className="bg-card" onClick={() => setAdding(true)}>
            <Plus /> Add
          </Button>
        </div>
      </header>

      {items.length ? (
        <div className="px-2">
          {items.map((a, i) => (
            <AudioRow
              key={a.id}
              audio={a}
              context={ids}
              trailing={
                <span className="flex flex-col">
                  <button aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)} className="text-muted-foreground disabled:opacity-25">
                    <ChevronUp className="size-4" />
                  </button>
                  <button
                    aria-label="Move down"
                    disabled={i === items.length - 1}
                    onClick={() => move(i, 1)}
                    className="text-muted-foreground disabled:opacity-25"
                  >
                    <ChevronDown className="size-4" />
                  </button>
                </span>
              }
              extraMenu={
                <DropdownMenuItem
                  onClick={() => lib.updatePlaylist(p.id, { audioIds: p.audioIds.filter((x) => x !== a.id) })}
                >
                  <MinusCircle /> Remove from playlist
                </DropdownMenuItem>
              }
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<ListMusic />}
          title="Empty playlist"
          body="Add voice notes to start listening."
          action={
            <Button variant="hero" size="lg" onClick={() => setAdding(true)}>
              Add voice notes
            </Button>
          }
        />
      )}

      <Dialog
        open={adding}
        onOpenChange={(o) => {
          setAdding(o);
          if (!o) {
            setPicked(new Set());
            setFilter("");
          }
        }}
      >
        <DialogContent className="max-h-[90dvh] rounded-3xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-medium">Add to {p.name}</DialogTitle>
          </DialogHeader>
          <Input placeholder="Search" value={filter} onChange={(e) => setFilter(e.target.value)} className="h-11 rounded-xl" />
          <div className="-mx-2 max-h-[50dvh] space-y-0.5 overflow-y-auto">
            {candidates.map((a) => (
              <label key={a.id} className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2 hover:bg-muted">
                <Checkbox
                  checked={picked.has(a.id)}
                  onCheckedChange={(v) =>
                    setPicked((s) => {
                      const n = new Set(s);
                      if (v) n.add(a.id);
                      else n.delete(a.id);
                      return n;
                    })
                  }
                />
                <span className="min-w-0 flex-1 truncate font-medium">{a.title}</span>
                <span className="text-xs text-muted-foreground">{formatTime(a.duration)}</span>
              </label>
            ))}
            {!candidates.length && <p className="py-6 text-center text-sm text-muted-foreground">Nothing else to add.</p>}
          </div>
          <DialogFooter>
            <Button
              variant="hero"
              size="lg"
              className="w-full"
              disabled={!picked.size}
              onClick={async () => {
                const n = await lib.addToPlaylist(p.id, [...picked]);
                toast.success(`Added ${n}`);
                setAdding(false);
                setPicked(new Set());
              }}
            >
              Add {picked.size || ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
