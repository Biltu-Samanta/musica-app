import type { RepeatMode } from "./types";

/**
 * Where to go after the current position in the play order.
 * `reason: "ended"` = track finished on its own; `"user"` = user pressed next.
 * Returns null when playback should stop.
 */
export function nextPosition(
  pos: number,
  length: number,
  repeat: RepeatMode,
  reason: "ended" | "user",
): number | null {
  if (length === 0) return null;
  if (reason === "ended" && repeat === "REPEAT_ONE") return pos;
  if (pos + 1 < length) return pos + 1;
  if (repeat === "REPEAT_ALL") return 0;
  return null;
}

/** Previous press: restart the track if more than 3s in, otherwise step back. */
export function previousPosition(
  pos: number,
  length: number,
  repeat: RepeatMode,
  currentTime: number,
): { pos: number; restart: boolean } {
  if (length === 0) return { pos: 0, restart: true };
  if (currentTime > 3) return { pos, restart: true };
  if (pos > 0) return { pos: pos - 1, restart: false };
  if (repeat === "REPEAT_ALL") return { pos: length - 1, restart: false };
  return { pos: 0, restart: true };
}

/** Build a play order. With shuffle, the starting track stays first. */
export function buildOrder(length: number, startIndex: number, shuffle: boolean, rand = Math.random) {
  const order = Array.from({ length }, (_, i) => i);
  if (!shuffle || length < 2) return order;
  const rest = order.filter((i) => i !== startIndex);
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = rest[i]!;
    rest[i] = rest[j]!;
    rest[j] = tmp;
  }
  return [startIndex, ...rest];
}

/** Resume from the remembered spot unless it's at the very start or end. */
export function resumePoint(lastPosition: number, duration: number) {
  if (!lastPosition || lastPosition < 3) return 0;
  if (duration && lastPosition > duration - 3) return 0;
  return lastPosition;
}

/** Volume multiplier while a sleep timer fades out over `fadeSeconds`. */
export function fadeMultiplier(remainingMs: number, fadeSeconds: number) {
  if (fadeSeconds <= 0) return 1;
  const fadeMs = fadeSeconds * 1000;
  if (remainingMs >= fadeMs) return 1;
  return Math.max(0, remainingMs / fadeMs);
}
