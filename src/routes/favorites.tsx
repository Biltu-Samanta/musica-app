import { createFileRoute } from "@tanstack/react-router";
import { Heart, Play, Shuffle } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { AudioRow } from "@/components/hv/AudioRow";
import { EmptyState, PageHeader } from "@/components/hv/common";
import { useLibrary } from "@/lib/hv/library";
import { usePlayer } from "@/lib/hv/player";
import { formatTotalDuration } from "@/lib/hv/format";

export const Route = createFileRoute("/favorites")({
  head: () => ({
    meta: [
      { title: "Favorites — Her Voice" },
      { name: "description", content: "The voice notes you love most, ready to play." },
      { property: "og:title", content: "Favorites — Her Voice" },
      { property: "og:description", content: "The voice notes you love most, ready to play." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FavoritesPage,
});

function FavoritesPage() {
  const lib = useLibrary();
  const player = usePlayer();
  const favs = useMemo(
    () => lib.visibleAudios.filter((a) => a.isFavorite).sort((a, b) => b.dateImported - a.dateImported),
    [lib.visibleAudios],
  );
  const ids = favs.map((a) => a.id);

  return (
    <div className="animate-float-in">
      <PageHeader
        title="Favorites"
        subtitle={`${favs.length} loved · ${formatTotalDuration(favs.reduce((s, a) => s + a.duration, 0))}`}
      />
      {favs.length > 0 && (
        <div className="flex gap-2 px-5 pb-4">
          <Button variant="hero" size="lg" className="flex-1" onClick={() => player.playList(ids, undefined, { shuffle: false })}>
            <Play className="fill-current" /> Play all
          </Button>
          <Button variant="outline" size="lg" className="bg-card" onClick={() => player.playList(ids, undefined, { shuffle: true })}>
            <Shuffle /> Shuffle
          </Button>
        </div>
      )}
      {lib.ready && !favs.length ? (
        <EmptyState icon={<Heart />} title="No favorites yet" body="Tap the heart on any voice note to keep it here." />
      ) : (
        <div className="px-2">
          {favs.map((a) => (
            <AudioRow key={a.id} audio={a} context={ids} />
          ))}
        </div>
      )}
    </div>
  );
}
