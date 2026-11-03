import { createFileRoute, Link } from "@tanstack/react-router";
import { ListMusic, Play, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, PageHeader } from "@/components/hv/common";
import { useLibrary } from "@/lib/hv/library";
import { usePlayer } from "@/lib/hv/player";
import { formatTotalDuration, waveformFor } from "@/lib/hv/format";

export const Route = createFileRoute("/playlists/")({
  head: () => ({
    meta: [
      { title: "Playlists — Her Voice" },
      { name: "description", content: "Your custom playlists of voice notes." },
      { property: "og:title", content: "Playlists — Her Voice" },
      { property: "og:description", content: "Your custom playlists of voice notes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PlaylistsPage,
});

function PlaylistsPage() {
  const lib = useLibrary();
  const player = usePlayer();
  const [name, setName] = useState("");

  return (
    <div className="animate-float-in">
      <PageHeader title="Playlists" subtitle="Line up voice notes to hear together." />
      <form
        className="flex gap-2 px-5 pb-5"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!name.trim()) return;
          await lib.createPlaylist(name.trim());
          toast.success(`Created ${name.trim()}`);
          setName("");
        }}
      >
        <Input
          placeholder="New playlist name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-12 rounded-2xl bg-card"
        />
        <Button type="submit" variant="hero" className="h-12 rounded-2xl px-5">
          <Plus /> Create
        </Button>
      </form>

      {lib.ready && !lib.playlists.length ? (
        <EmptyState
          icon={<ListMusic />}
          title="No playlists yet"
          body="Create one above, then add voice notes from any ⋮ menu."
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 px-5">
          {lib.playlists.map((p) => {
            const items = p.audioIds.map((id) => lib.audioById.get(id)).filter((a) => a && !a.deletedAt);
            const dur = items.reduce((s, a) => s + (a?.duration ?? 0), 0);
            const bars = waveformFor(p.id, 14);
            return (
              <div key={p.id} className="relative rounded-3xl border bg-card p-4 shadow-soft">
                <Link to="/playlists/$playlistId" params={{ playlistId: p.id }} className="absolute inset-0 rounded-3xl" aria-label={p.name} />
                <div className="flex h-16 items-end gap-[3px] rounded-2xl bg-accent px-3 py-3">
                  {bars.map((h, i) => (
                    <span key={i} className="flex-1 rounded-full bg-primary/70" style={{ height: `${h * 100}%` }} />
                  ))}
                </div>
                <p className="mt-3 truncate font-semibold">{p.name}</p>
                <p className="text-xs text-muted-foreground">
                  {items.length} notes · {formatTotalDuration(dur)}
                </p>
                <Button
                  variant="play"
                  size="icon"
                  aria-label={`Play ${p.name}`}
                  disabled={!items.length}
                  onClick={() => player.playList(items.map((a) => a!.id), undefined, { shuffle: false })}
                  className="absolute top-6 right-6"
                >
                  <Play className="ml-0.5 fill-current" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
