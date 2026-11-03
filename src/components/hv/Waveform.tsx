import { useMemo, useRef } from "react";
import { cn } from "@/lib/utils";
import { waveformFor } from "@/lib/hv/format";

interface Props {
  seed: string;
  progress?: number;
  bars?: number;
  className?: string;
  onSeek?: (fraction: number) => void;
  label?: string;
}

export function Waveform({ seed, progress = 0, bars = 48, className, onSeek, label }: Props) {
  const heights = useMemo(() => waveformFor(seed, bars), [seed, bars]);
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const fractionAt = (clientX: number) => {
    const r = ref.current!.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - r.left) / r.width));
  };

  return (
    <div
      ref={ref}
      role={onSeek ? "slider" : undefined}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress * 100)}
      tabIndex={onSeek ? 0 : undefined}
      onKeyDown={(e) => {
        if (!onSeek) return;
        if (e.key === "ArrowRight") onSeek(Math.min(1, progress + 0.02));
        if (e.key === "ArrowLeft") onSeek(Math.max(0, progress - 0.02));
      }}
      onPointerDown={(e) => {
        if (!onSeek) return;
        dragging.current = true;
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        onSeek(fractionAt(e.clientX));
      }}
      onPointerMove={(e) => dragging.current && onSeek?.(fractionAt(e.clientX))}
      onPointerUp={() => (dragging.current = false)}
      className={cn(
        "flex h-12 touch-none items-center gap-[2px] select-none",
        onSeek && "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md",
        className,
      )}
    >
      {heights.map((h, i) => {
        const filled = (i + 0.5) / heights.length <= progress;
        return (
          <span
            key={i}
            className={cn(
              "flex-1 rounded-full transition-colors duration-150",
              filled ? "bg-primary" : "bg-foreground/15",
            )}
            style={{ height: `${h * 100}%` }}
          />
        );
      })}
    </div>
  );
}

export function EqualizerIcon({ playing, className }: { playing: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex h-3.5 items-end gap-[2px]", className)} aria-hidden>
      {[0, 0.2, 0.4].map((d) => (
        <span
          key={d}
          className={cn("w-[3px] origin-bottom rounded-full bg-primary", playing ? "h-full animate-eq" : "h-1/2")}
          style={{ animationDelay: `${d}s` }}
        />
      ))}
    </span>
  );
}
