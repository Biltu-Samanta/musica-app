import { createFileRoute } from "@tanstack/react-router";
import { Bookmark, Pencil, Play, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { BookmarkDialog } from "@/components/hv/BookmarkDialog";
import { EmptyState, PageHeader } from "@/components/hv/common";
import { useLibrary } from "@/lib/hv/library";
import { usePlayer } from "@/lib/hv/player";
import { formatTime } from "@/lib/hv/format";
import type { Bookmark as BM } from "@/lib/hv/types";

export const Route = createFileRoute("/bookmarks")({
  head: () => ({
    meta: [
      { title: "Bookmarks — Her Voice" },
      { name: "description", content: "Every moment you've bookmarked inside your voice notes." },
      { property: "og:title", content: "Bookmarks — Her Voice" },
      { property: "og:description", content: "Every moment you've bookmarked inside your voice notes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BookmarksPage,
});

function BookmarksPage() {
  const lib = useLibrary();
  const player = usePlayer();
  const [editing, setEditing] = useState<BM | null>(null);

  const groups = useMemo(() => {
    const visible = new Set(lib.visibleAudios.map((a) => a.id));
    const map = new Map<string, BM[]>();
    lib.bookmarks
      .filter((b) => visible.has(b.audioId))
      .forEach((b) => map.set(b.audioId, [...(map.get(b.audioId) ?? []), b]));
    return [...map.entries()]
      .map(([id, bms]) => ({ audio: lib.audioById.get(id)!, bms: bms.sort((a, b) => a.timestamp - b.timestamp) }))
      .sort((a, b) => Math.max(...b.bms.map((x) => x.createdAt)) - Math.max(...a.bms.map((x) => x.createdAt)));
  }, [lib.bookmarks, lib.visibleAudios, lib.audioById]);

  const jump = (audioId: string, t: number) => {
    if (player.current?.id === audioId) {
      player.seek(t);
      if (!player.isPlaying) player.togglePlay();
    } else {
      player.playList([audioId]);
      setTimeout(() => player.seek(t), 450);
    }
  };

  return (
    <div className="animate-float-in">
      <PageHeader title="Bookmarks" back subtitle={`${lib.bookmarks.length} saved moments`} />
      {lib.ready && !groups.length ? (
        <EmptyState icon={<Bookmark />} title="No bookmarks yet" body="While listening, tap “Mark” in the player to save a moment." />
      ) : (
        <div className="space-y-4 px-5">
          {groups.map(({ audio, bms }) => (
            <div key={audio.id} className="rounded-3xl border bg-card p-4 shadow-soft">
              <p className="truncate text-lg font-semibold">{audio.title}</p>
              <ul className="mt-2 space-y-1">
                {bms.map((b) => (
                  <li key={b.id} className="flex items-center gap-2 rounded-xl py-1">
                    <button
                      onClick={() => jump(audio.id, b.timestamp)}
                      className="inline-flex h-8 items-center gap-1 rounded-full bg-accent px-3 font-mono text-xs font-semibold text-accent-foreground"
                    >
                      <Play className="size-3 fill-current" /> {formatTime(b.timestamp)}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{b.title}</p>
                      {b.description && <p className="truncate text-xs text-muted-foreground">{b.description}</p>}
                    </div>
                    <button aria-label="Edit bookmark" onClick={() => setEditing(b)} className="p-1.5 text-muted-foreground hover:text-foreground">
                      <Pencil className="size-4" />
                    </button>
                    <button aria-label="Delete bookmark" onClick={() => lib.deleteBookmark(b.id)} className="p-1.5 text-muted-foreground hover:text-destructive">
                      <Trash2 className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
      <BookmarkDialog
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        audioId={editing?.audioId ?? ""}
        timestamp={editing?.timestamp ?? 0}
        editing={editing}
      />
    </div>
  );
}
