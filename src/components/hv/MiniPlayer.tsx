import { Pause, Play, SkipForward } from "lucide-react";
import { useLibrary } from "@/lib/hv/library";
import { usePlayer, usePlayerTime } from "@/lib/hv/player";
import { FolderBadge } from "./folder-visual";

export function MiniPlayer() {
  const player = usePlayer();
  const { currentTime, duration } = usePlayerTime();
  const lib = useLibrary();
  const a = player.current;
  if (!a) return null;
  const folder = a.folderId ? lib.folderById.get(a.folderId) : undefined;
  const pct = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className="pointer-events-auto mx-3 mb-2 animate-float-in overflow-hidden rounded-2xl border glass shadow-soft">
      <div className="flex items-center gap-3 p-2 pr-2">
        <button
          onClick={() => player.setFullOpen(true)}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
          aria-label="Open player"
        >
          <FolderBadge folder={folder ?? { icon: "mic", color: "garnet", pinHash: null }} />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">{a.title}</span>
            <span className="block truncate text-xs text-muted-foreground">{folder?.name ?? "Her Voice"}</span>
          </span>
        </button>
        <button
          onClick={player.togglePlay}
          aria-label={player.isPlaying ? "Pause" : "Play"}
          className="inline-flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground active:scale-95"
        >
          {player.isPlaying ? <Pause className="size-5" /> : <Play className="ml-0.5 size-5" />}
        </button>
        <button
          onClick={player.next}
          aria-label="Next"
          className="inline-flex size-10 items-center justify-center rounded-full text-foreground hover:bg-muted"
        >
          <SkipForward className="size-5" />
        </button>
      </div>
      <div className="h-[3px] bg-foreground/10">
        <div className="h-full bg-primary transition-[width] duration-300" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
