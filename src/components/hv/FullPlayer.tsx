import { useEffect, useState } from "react";
import {
  Bookmark as BookmarkIcon,
  ChevronDown,
  ChevronUp,
  Heart,
  Info,
  Moon,
  Pause,
  Pencil,
  Play,
  Repeat,
  Repeat1,
  RotateCcw,
  RotateCw,
  Shuffle,
  SkipBack,
  SkipForward,
  Square,
  Trash2,
  Volume1,
  Volume2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { useLibrary } from "@/lib/hv/library";
import { usePlayer, usePlayerTime } from "@/lib/hv/player";
import { useSettings } from "@/lib/hv/settings";
import { formatSpeed, formatTime } from "@/lib/hv/format";
import { PLAYBACK_SPEEDS, type Bookmark } from "@/lib/hv/types";
import { folderColorStyle, folderIcon } from "./folder-visual";
import { Waveform } from "./Waveform";
import { SleepTimerDialog } from "./SleepTimerDialog";
import { BookmarkDialog } from "./BookmarkDialog";
import { useUI } from "./ui-context";

export function FullPlayer() {
  const player = usePlayer();
  const { currentTime, duration, sleepRemaining } = usePlayerTime();
  const lib = useLibrary();
  const ui = useUI();
  const settings = useSettings();
  const [tab, setTab] = useState<"queue" | "bookmarks">("queue");
  const [sleepOpen, setSleepOpen] = useState(false);
  const [bmOpen, setBmOpen] = useState(false);
  const [bmEditing, setBmEditing] = useState<Bookmark | null>(null);
  const [bmTime, setBmTime] = useState(0);

  const a = player.current;
  const open = player.fullOpen && !!a;

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && player.setFullOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!a) return null;
  const folder = a.folderId ? lib.folderById.get(a.folderId) : undefined;
  const Icon = folderIcon(folder?.icon ?? "mic");
  const d = duration || a.duration;
  const bms = lib.bookmarks.filter((b) => b.audioId === a.id).sort((x, y) => x.timestamp - y.timestamp);
  const skipBy = settings.skipInterval;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Now playing"
      aria-hidden={!open}
      className={cn(
        "fixed inset-0 z-40 flex justify-center bg-background transition-transform duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)]",
        open ? "translate-y-0" : "pointer-events-none translate-y-full",
      )}
    >
      <div className="absolute inset-0 bg-glow" aria-hidden />
      <div className="relative flex h-full w-full max-w-md flex-col overflow-y-auto px-5 pt-[max(env(safe-area-inset-top),1rem)] pb-8">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon-lg" aria-label="Close player" onClick={() => player.setFullOpen(false)}>
            <ChevronDown />
          </Button>
          <div className="text-center">
            <p className="text-[0.7rem] tracking-[0.2em] text-muted-foreground uppercase">Playing from</p>
            <p className="text-sm font-semibold">{folder?.name ?? "Your library"}</p>
          </div>
          <Button variant="ghost" size="icon-lg" aria-label="Details" onClick={() => ui.openAudioAction("info", a.id)}>
            <Info />
          </Button>
        </div>

        <div
          style={folderColorStyle(folder?.color ?? "garnet")}
          className="relative mx-auto mt-6 flex aspect-square w-full max-w-[19rem] shrink-0 items-center justify-center overflow-hidden rounded-[2.25rem] bg-hero shadow-lift"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,color-mix(in_oklch,var(--fc)_55%,transparent),transparent_60%)]" />
          <div className="absolute -right-10 -bottom-10 size-48 rounded-full border border-primary-foreground/20" />
          <div className="absolute -right-4 -bottom-4 size-32 rounded-full border border-primary-foreground/20" />
          <Icon className="relative size-16 text-primary-foreground/90" strokeWidth={1.5} />
          <span className="font-display absolute bottom-5 left-6 text-lg text-primary-foreground/80 italic">her voice</span>
        </div>

        <div className="mt-7 flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-[1.65rem] leading-tight font-medium">{a.title}</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {a.format.toUpperCase()} · played {a.playCount}×
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon-lg"
            aria-label={a.isFavorite ? "Remove from favorites" : "Add to favorites"}
            onClick={() => lib.toggleFavorite(a.id)}
          >
            <Heart className={cn(a.isFavorite && "fill-primary text-primary")} />
          </Button>
        </div>

        <div className="mt-5">
          <div className="relative">
            <Waveform
              seed={a.id}
              bars={56}
              progress={d ? currentTime / d : 0}
              onSeek={(f) => player.seek(f * d)}
              label="Seek"
              className="h-14"
            />
            {d > 0 &&
              bms.map((b) => (
                <button
                  key={b.id}
                  aria-label={`Jump to bookmark ${b.title}`}
                  onClick={() => player.seek(b.timestamp)}
                  className="absolute -bottom-2 size-2 -translate-x-1/2 rounded-full bg-primary ring-2 ring-background"
                  style={{ left: `${(b.timestamp / d) * 100}%` }}
                />
              ))}
          </div>
          <div className="mt-2 flex justify-between font-mono text-xs text-muted-foreground tabular-nums">
            <span>{formatTime(currentTime)}</span>
            <span>-{formatTime(Math.max(0, d - currentTime))}</span>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <button
            onClick={() => player.skip(-skipBy)}
            aria-label={`Back ${skipBy} seconds`}
            className="relative inline-flex size-12 items-center justify-center rounded-full hover:bg-muted"
          >
            <RotateCcw className="size-7" strokeWidth={1.5} />
            <span className="absolute text-[0.6rem] font-bold">{skipBy}</span>
          </button>
          <Button variant="ghost" size="icon-lg" aria-label="Previous" onClick={player.prev}>
            <SkipBack className="fill-current" />
          </Button>
          <Button variant="play" size="icon-xl" aria-label={player.isPlaying ? "Pause" : "Play"} onClick={player.togglePlay}>
            {player.isPlaying ? <Pause className="fill-current" /> : <Play className="ml-1 fill-current" />}
          </Button>
          <Button variant="ghost" size="icon-lg" aria-label="Next" onClick={player.next}>
            <SkipForward className="fill-current" />
          </Button>
          <button
            onClick={() => player.skip(skipBy)}
            aria-label={`Forward ${skipBy} seconds`}
            className="relative inline-flex size-12 items-center justify-center rounded-full hover:bg-muted"
          >
            <RotateCw className="size-7" strokeWidth={1.5} />
            <span className="absolute text-[0.6rem] font-bold">{skipBy}</span>
          </button>
        </div>

        <div className="mt-5 grid grid-cols-5 gap-1 rounded-2xl bg-muted/60 p-1.5">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex h-12 flex-col items-center justify-center rounded-xl text-xs font-bold hover:bg-card">
              <span className="text-sm">{formatSpeed(player.rate)}</span>
              <span className="text-[0.6rem] font-medium text-muted-foreground">Speed</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="z-50 rounded-xl">
              <DropdownMenuLabel>Playback speed</DropdownMenuLabel>
              {PLAYBACK_SPEEDS.map((r) => (
                <DropdownMenuItem
                  key={r}
                  onClick={() => player.setRate(r)}
                  className={cn(player.rate === r && "font-bold text-primary")}
                >
                  {formatSpeed(r)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <ToggleTile
            label={player.repeat === "REPEAT_ONE" ? "One" : player.repeat === "REPEAT_ALL" ? "All" : "Repeat"}
            active={player.repeat !== "NO_REPEAT"}
            onClick={player.cycleRepeat}
            icon={player.repeat === "REPEAT_ONE" ? <Repeat1 /> : <Repeat />}
          />
          <ToggleTile label="Shuffle" active={player.shuffle} onClick={player.toggleShuffle} icon={<Shuffle />} />
          <ToggleTile
            label={
              player.sleep.kind === "timer"
                ? formatTime((sleepRemaining ?? 0) / 1000)
                : player.sleep.kind === "endOfTrack"
                  ? "End"
                  : "Sleep"
            }
            active={player.sleep.kind !== "off"}
            onClick={() => setSleepOpen(true)}
            icon={<Moon />}
          />
          <ToggleTile
            label="Mark"
            onClick={() => {
              setBmEditing(null);
              setBmTime(currentTime);
              setBmOpen(true);
            }}
            icon={<BookmarkIcon />}
          />
        </div>

        <div className="mt-4 flex items-center gap-3 px-1">
          <Volume1 className="size-4 text-muted-foreground" />
          <Slider
            aria-label="Volume"
            value={[player.volume * 100]}
            max={100}
            step={1}
            onValueChange={(vals) => player.setVolume((vals[0] ?? 0) / 100)}
          />
          <Volume2 className="size-4 text-muted-foreground" />
        </div>

        <button
          onClick={() => player.setStopAfterCurrent(!player.stopAfterCurrent)}
          className={cn(
            "mt-4 inline-flex items-center justify-center gap-2 self-center rounded-full px-4 py-1.5 text-xs font-semibold transition-colors",
            player.stopAfterCurrent ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted",
          )}
        >
          <Square className="size-3" /> Stop after this one
        </button>

        <div className="mt-6 flex gap-1 rounded-full bg-muted/60 p-1">
          {(["queue", "bookmarks"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "flex-1 rounded-full py-2 text-sm font-semibold transition-colors",
                tab === t ? "bg-card shadow-soft" : "text-muted-foreground",
              )}
            >
              {t === "queue" ? `Up next (${player.upNext.length})` : `Bookmarks (${bms.length})`}
            </button>
          ))}
        </div>

        <div className="mt-3 space-y-1 pb-4">
          {tab === "queue" ? (
            <>
              {player.upNext.map(({ orderPos, id }, i) => {
                const item = lib.audioById.get(id);
                if (!item) return null;
                return (
                  <div key={`${orderPos}-${id}`} className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-muted/60">
                    <button className="min-w-0 flex-1 text-left" onClick={() => player.jumpTo(orderPos)}>
                      <p className="truncate text-sm font-semibold">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{formatTime(item.duration)}</p>
                    </button>
                    <IconBtn label="Move up" disabled={i === 0} onClick={() => player.moveInQueue(orderPos, -1)}>
                      <ChevronUp />
                    </IconBtn>
                    <IconBtn
                      label="Move down"
                      disabled={i === player.upNext.length - 1}
                      onClick={() => player.moveInQueue(orderPos, 1)}
                    >
                      <ChevronDown />
                    </IconBtn>
                    <IconBtn label="Remove from queue" onClick={() => player.removeFromQueue(orderPos)}>
                      <X />
                    </IconBtn>
                  </div>
                );
              })}
              {player.upNext.length ? (
                <button onClick={player.clearQueue} className="mx-auto block pt-2 text-xs text-muted-foreground hover:text-foreground">
                  Clear queue
                </button>
              ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">Nothing queued after this one.</p>
              )}
            </>
          ) : bms.length ? (
            bms.map((b) => (
              <div key={b.id} className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-muted/60">
                <button className="min-w-0 flex-1 text-left" onClick={() => player.seek(b.timestamp)}>
                  <p className="truncate text-sm font-semibold">
                    <span className="mr-2 font-mono text-xs text-primary">{formatTime(b.timestamp)}</span>
                    {b.title}
                  </p>
                  {b.description && <p className="truncate text-xs text-muted-foreground">{b.description}</p>}
                </button>
                <IconBtn
                  label="Edit bookmark"
                  onClick={() => {
                    setBmEditing(b);
                    setBmOpen(true);
                  }}
                >
                  <Pencil />
                </IconBtn>
                <IconBtn label="Delete bookmark" onClick={() => lib.deleteBookmark(b.id)}>
                  <Trash2 />
                </IconBtn>
              </div>
            ))
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">Tap “Mark” to save a moment you love.</p>
          )}
        </div>
      </div>

      <SleepTimerDialog open={sleepOpen} onOpenChange={setSleepOpen} />
      <BookmarkDialog open={bmOpen} onOpenChange={setBmOpen} audioId={a.id} timestamp={bmTime} editing={bmEditing} />
    </div>
  );
}

function ToggleTile({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex h-12 flex-col items-center justify-center gap-0.5 rounded-xl transition-colors [&_svg]:size-[18px]",
        active ? "bg-card text-primary shadow-soft" : "hover:bg-card",
      )}
    >
      {icon}
      <span className={cn("text-[0.6rem] font-medium tabular-nums", !active && "text-muted-foreground")}>{label}</span>
    </button>
  );
}

function IconBtn({
  label,
  children,
  onClick,
  disabled,
}: {
  label: string;
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-card hover:text-foreground disabled:opacity-30 [&_svg]:size-4"
    >
      {children}
    </button>
  );
}
