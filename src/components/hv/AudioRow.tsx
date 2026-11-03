import {
  FolderInput,
  Heart,
  Info,
  ListEnd,
  ListPlus,
  ListStart,
  MoreVertical,
  Pause,
  Pencil,
  Play,
  Share2,
  Download,
  Trash2,
} from "lucide-react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useLibrary } from "@/lib/hv/library";
import { usePlayer } from "@/lib/hv/player";
import { downloadBlob, formatTime, relativeDate } from "@/lib/hv/format";
import type { AudioItem } from "@/lib/hv/types";
import { useUI } from "./ui-context";
import { EqualizerIcon } from "./Waveform";

export function fileNameFor(a: AudioItem) {
  return `${a.title.replace(/[\\/:*?"<>|]/g, "_")}.${a.format}`;
}

export async function shareAudio(lib: ReturnType<typeof useLibrary>, a: AudioItem) {
  const blob = await lib.getFile(a.id);
  if (!blob) {
    toast.error("This voice note's file is missing.");
    return;
  }
  const file = new File([blob], fileNameFor(a), { type: a.mimeType });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: a.title });
    } catch {
      /* cancelled */
    }
  } else {
    downloadBlob(blob, file.name);
    toast("Sharing isn't available here, so it was saved to your downloads.");
  }
}

export async function exportAudio(lib: ReturnType<typeof useLibrary>, a: AudioItem) {
  const blob = await lib.getFile(a.id);
  if (!blob) {
    toast.error("This voice note's file is missing.");
    return;
  }
  downloadBlob(blob, fileNameFor(a));
}

interface Props {
  audio: AudioItem;
  /** ids to queue when this row is played */
  context: string[];
  showFolder?: boolean;
  meta?: ReactNode;
  trailing?: ReactNode;
  extraMenu?: ReactNode;
}

export function AudioRow({ audio, context, showFolder = true, meta, trailing, extraMenu }: Props) {
  const lib = useLibrary();
  const player = usePlayer();
  const ui = useUI();
  const isCurrent = player.current?.id === audio.id;
  const folder = audio.folderId ? lib.folderById.get(audio.folderId) : undefined;
  const progress = audio.duration ? Math.min(1, audio.lastPosition / audio.duration) : 0;

  const onPlay = () => {
    if (isCurrent) player.togglePlay();
    else player.playList(context.length ? context : [audio.id], audio.id);
  };

  return (
    <div
      className={cn(
        "group flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors",
        isCurrent ? "bg-accent/60" : "hover:bg-muted/70",
      )}
    >
      <button
        onClick={onPlay}
        aria-label={isCurrent && player.isPlaying ? `Pause ${audio.title}` : `Play ${audio.title}`}
        className={cn(
          "relative inline-flex size-11 shrink-0 items-center justify-center rounded-full transition-all active:scale-95",
          isCurrent ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground",
        )}
      >
        {isCurrent && player.isPlaying ? <Pause className="size-4" /> : <Play className="ml-0.5 size-4" />}
        {progress > 0.02 && !isCurrent && (
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 44 44" aria-hidden>
            <circle
              cx="22"
              cy="22"
              r="20.5"
              fill="none"
              strokeWidth="2"
              className="stroke-primary"
              strokeDasharray={`${progress * 128.8} 200`}
              strokeLinecap="round"
            />
          </svg>
        )}
      </button>

      <button className="min-w-0 flex-1 text-left" onClick={onPlay}>
        <div className="flex items-center gap-2">
          {isCurrent && <EqualizerIcon playing={player.isPlaying} />}
          <p className={cn("truncate font-semibold", isCurrent && "text-primary")}>{audio.title}</p>
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {meta ?? (
            <>
              {formatTime(audio.duration)}
              {showFolder && folder && <> · {folder.name}</>}
              {" · "}
              {relativeDate(audio.dateImported)}
            </>
          )}
        </p>
      </button>

      {trailing}

      <button
        onClick={() => lib.toggleFavorite(audio.id)}
        aria-label={audio.isFavorite ? "Remove from favorites" : "Add to favorites"}
        className="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground hover:text-primary"
      >
        <Heart className={cn("size-[18px]", audio.isFavorite && "fill-primary text-primary")} />
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="More options"
          className="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <MoreVertical className="size-[18px]" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52 rounded-xl">
          <DropdownMenuItem onClick={() => player.playNext(audio.id)}>
            <ListStart /> Play next
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => player.addToQueue(audio.id)}>
            <ListEnd /> Add to queue
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => ui.openAudioAction("playlist", audio.id)}>
            <ListPlus /> Add to playlist
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => ui.openAudioAction("rename", audio.id)}>
            <Pencil /> Rename
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => ui.openAudioAction("move", audio.id)}>
            <FolderInput /> Move to folder
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => shareAudio(lib, audio)}>
            <Share2 /> Share
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => exportAudio(lib, audio)}>
            <Download /> Export file
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => ui.openAudioAction("info", audio.id)}>
            <Info /> Details & bookmarks
          </DropdownMenuItem>
          {extraMenu}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => ui.openAudioAction("delete", audio.id)}
          >
            <Trash2 /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
