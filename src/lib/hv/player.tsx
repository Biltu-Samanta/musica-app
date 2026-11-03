import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { useLibrary } from "./library";
import { getSettings } from "./settings";
import { buildOrder, fadeMultiplier, nextPosition, previousPosition, resumePoint } from "./playback-modes";
import type { AudioItem, RepeatMode } from "./types";

export type SleepState =
  | { kind: "off" }
  | { kind: "endOfTrack" }
  | { kind: "timer"; endsAt: number; total: number; pausedRemaining: number | null };

interface PlayerValue {
  current: AudioItem | null;
  queue: string[];
  order: number[];
  pos: number;
  upNext: { orderPos: number; id: string }[];
  isPlaying: boolean;
  rate: number;
  volume: number;
  repeat: RepeatMode;
  shuffle: boolean;
  stopAfterCurrent: boolean;
  sleep: SleepState;
  fullOpen: boolean;
  setFullOpen: (v: boolean) => void;

  playList: (ids: string[], startId?: string, opts?: { shuffle?: boolean }) => void;
  togglePlay: () => void;
  pause: () => void;
  seek: (t: number) => void;
  skip: (delta: number) => void;
  next: () => void;
  prev: () => void;
  jumpTo: (orderPos: number) => void;
  setRate: (r: number) => void;
  setVolume: (v: number) => void;
  setRepeat: (r: RepeatMode) => void;
  cycleRepeat: () => void;
  toggleShuffle: () => void;
  setStopAfterCurrent: (v: boolean) => void;
  playNext: (id: string) => void;
  addToQueue: (id: string) => void;
  removeFromQueue: (orderPos: number) => void;
  moveInQueue: (orderPos: number, dir: -1 | 1) => void;
  clearQueue: () => void;

  setSleepMinutes: (min: number) => void;
  setSleepAt: (date: Date) => void;
  setSleepEndOfTrack: () => void;
  cancelSleep: () => void;
  pauseSleep: () => void;
  resumeSleep: () => void;
}

interface TimeValue {
  currentTime: number;
  duration: number;
  sleepRemaining: number | null;
}

const PlayerContext = createContext<PlayerValue | null>(null);
const TimeContext = createContext<TimeValue>({ currentTime: 0, duration: 0, sleepRemaining: null });

const SESSION_KEY = "her-voice:session";

export function PlayerProvider({ children }: { children: ReactNode }) {
  const lib = useLibrary();
  const libRef = useRef(lib);
  libRef.current = lib;

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [queue, setQueue] = useState<string[]>([]);
  const [order, setOrder] = useState<number[]>([]);
  const [pos, setPos] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [rate, setRateState] = useState(1);
  const [volume, setVolumeState] = useState(1);
  const [repeat, setRepeatState] = useState<RepeatMode>("NO_REPEAT");
  const [shuffle, setShuffle] = useState(false);
  const [stopAfterCurrent, setStopAfterCurrent] = useState(false);
  const [sleep, setSleep] = useState<SleepState>({ kind: "off" });
  const [fullOpen, setFullOpen] = useState(false);
  const [time, setTime] = useState<TimeValue>({ currentTime: 0, duration: 0, sleepRemaining: null });

  const s = useRef({ queue, order, pos, rate, volume, repeat, shuffle, stopAfterCurrent, sleep });
  s.current = { queue, order, pos, rate, volume, repeat, shuffle, stopAfterCurrent, sleep };

  const currentQi = order[pos];
  const currentId = currentQi === undefined ? null : (queue[currentQi] ?? null);
  const currentIdRef = useRef<string | null>(null);
  currentIdRef.current = currentId;
  const current = currentId ? (lib.audioById.get(currentId) ?? null) : null;

  const loadSeq = useRef(0);
  const counted = useRef(false);
  const lastSave = useRef(0);

  const load = useCallback(async (id: string, autoplay: boolean) => {
    const a = audioRef.current;
    if (!a) return;
    const seq = ++loadSeq.current;
    const item = libRef.current.audioById.get(id);
    const url = await libRef.current.getFileUrl(id);
    if (seq !== loadSeq.current) return;
    if (!url) {
      toast.error(`“${item?.title ?? "This voice note"}” is missing from this device.`);
      setIsPlaying(false);
      return;
    }
    counted.current = false;
    a.src = url;
    a.defaultPlaybackRate = s.current.rate;
    a.playbackRate = s.current.rate;
    const start = getSettings().resumePlayback && item ? resumePoint(item.lastPosition, item.duration) : 0;
    const onMeta = () => {
      if (start) a.currentTime = start;
      a.removeEventListener("loadedmetadata", onMeta);
    };
    a.addEventListener("loadedmetadata", onMeta);
    if (autoplay) {
      try {
        await a.play();
      } catch (e) {
        if ((e as Error).name !== "AbortError" && (e as Error).name !== "NotAllowedError") {
          console.warn(e);
        }
      }
    }
  }, []);

  const goTo = useCallback(
    (nextPos: number, autoplay: boolean, q = s.current.queue, o = s.current.order) => {
      const qi = o[nextPos];
      const id = qi === undefined ? undefined : q[qi];
      if (!id) return;
      setPos(nextPos);
      void load(id, autoplay);
    },
    [load],
  );

  const handleEnded = useCallback(() => {
    const a = audioRef.current!;
    const st = s.current;
    const id = currentIdRef.current;
    if (id) void libRef.current.savePosition(id, 0);
    if (st.sleep.kind === "endOfTrack") {
      setSleep({ kind: "off" });
      toast("Sleep timer ended. Sweet dreams.");
      return;
    }
    if (st.stopAfterCurrent) {
      setStopAfterCurrent(false);
      return;
    }
    if (!getSettings().autoplayNext && st.repeat !== "REPEAT_ONE") return;
    const np = nextPosition(st.pos, st.order.length, st.repeat, "ended");
    if (np === null) return;
    if (np === st.pos) {
      a.currentTime = 0;
      counted.current = false;
      void a.play();
      return;
    }
    goTo(np, true);
  }, [goTo]);

  // Create the single audio element and wire its events.
  useEffect(() => {
    const a = new Audio();
    a.preload = "auto";
    audioRef.current = a;
    const st = getSettings();
    setRateState(st.defaultSpeed);
    if (st.defaultRepeat === "SHUFFLE") setShuffle(true);
    else setRepeatState(st.defaultRepeat);

    const onTime = () => {
      setTime((t) => ({ ...t, currentTime: a.currentTime, duration: Number.isFinite(a.duration) ? a.duration : t.duration }));
      const id = currentIdRef.current;
      if (id && Date.now() - lastSave.current > 5000 && !a.paused) {
        lastSave.current = Date.now();
        void libRef.current.savePosition(id, a.currentTime);
      }
    };
    const onMeta = () => {
      setTime((t) => ({ ...t, duration: Number.isFinite(a.duration) ? a.duration : 0, currentTime: a.currentTime }));
      const id = currentIdRef.current;
      const item = id ? libRef.current.audioById.get(id) : undefined;
      if (item && Number.isFinite(a.duration) && Math.abs(item.duration - a.duration) > 1) {
        void libRef.current.updateAudio(item.id, { duration: a.duration });
      }
    };
    const onPlay = () => setIsPlaying(true);
    const onPlaying = () => {
      const id = currentIdRef.current;
      if (id && !counted.current) {
        counted.current = true;
        void libRef.current.recordPlay(id, a.currentTime);
      }
    };
    const onPause = () => {
      setIsPlaying(false);
      const id = currentIdRef.current;
      if (id && !a.ended) void libRef.current.savePosition(id, a.currentTime);
    };
    const onError = () => {
      if (!a.src) return;
      const code = a.error?.code;
      setIsPlaying(false);
      toast.error(
        code === 4
          ? "This audio format can't be played in this browser."
          : "Couldn't play this voice note.",
      );
    };
    const onEnded = () => handleEndedRef.current();
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("durationchange", onMeta);
    a.addEventListener("play", onPlay);
    a.addEventListener("playing", onPlaying);
    a.addEventListener("pause", onPause);
    a.addEventListener("ended", onEnded);
    a.addEventListener("error", onError);
    return () => {
      a.pause();
      a.src = "";
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("durationchange", onMeta);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("playing", onPlaying);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("ended", onEnded);
      a.removeEventListener("error", onError);
    };
  }, []);

  const handleEndedRef = useRef(handleEnded);
  handleEndedRef.current = handleEnded;

  // Restore the last session (paused) once the library is ready.
  const restored = useRef(false);
  useEffect(() => {
    if (!lib.ready || restored.current) return;
    restored.current = true;
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return;
      const sess = JSON.parse(raw) as { queue: string[]; order: number[]; pos: number; rate?: number; repeat?: RepeatMode; shuffle?: boolean };
      if (!sess.queue?.length || sess.queue.some((id) => !lib.audioById.has(id))) return;
      setQueue(sess.queue);
      setOrder(sess.order);
      if (sess.rate) setRateState(sess.rate);
      if (sess.repeat) setRepeatState(sess.repeat);
      if (sess.shuffle !== undefined) setShuffle(sess.shuffle);
      s.current.rate = sess.rate ?? s.current.rate;
      goTo(sess.pos, false, sess.queue, sess.order);
    } catch {
      /* ignore broken session */
    }
  }, [lib.ready, lib.audioById, goTo]);

  useEffect(() => {
    if (!restored.current) return;
    localStorage.setItem(SESSION_KEY, JSON.stringify({ queue, order, pos, rate, repeat, shuffle }));
  }, [queue, order, pos, rate, repeat, shuffle]);

  // Drop queue entries whose audio was permanently deleted.
  useEffect(() => {
    if (!lib.ready || !queue.length) return;
    if (queue.every((id) => lib.audioById.has(id))) return;
    const keepIdx = queue.map((id, i) => (lib.audioById.has(id) ? i : -1)).filter((i) => i >= 0);
    const remap = new Map(keepIdx.map((old, i) => [old, i]));
    const newOrder = order.filter((i) => remap.has(i)).map((i) => remap.get(i)!);
    const newQueue = keepIdx.map((i) => queue[i]!);
    if (!currentId || !lib.audioById.has(currentId)) {
      audioRef.current?.pause();
      if (audioRef.current) audioRef.current.src = "";
      setQueue(newQueue);
      setOrder(newOrder);
      setPos(0);
      if (newQueue.length) goTo(0, false, newQueue, newOrder);
      return;
    }
    const curQ = remap.get(order[pos] ?? -1) ?? 0;
    setQueue(newQueue);
    setOrder(newOrder);
    setPos(newOrder.indexOf(curQ));
  }, [lib.ready, lib.audioById, queue, order, pos, currentId, goTo]);

  // Sleep timer ticking + fade-out.
  useEffect(() => {
    if (sleep.kind !== "timer") {
      setTime((t) => (t.sleepRemaining === null ? t : { ...t, sleepRemaining: null }));
      return;
    }
    const tick = () => {
      const a = audioRef.current;
      const remaining = sleep.pausedRemaining ?? Math.max(0, sleep.endsAt - Date.now());
      setTime((t) => ({ ...t, sleepRemaining: remaining }));
      if (sleep.pausedRemaining !== null || !a) return;
      const st = getSettings();
      a.volume = s.current.volume * (st.sleepFade ? fadeMultiplier(remaining, st.sleepFadeSeconds) : 1);
      if (remaining <= 0) {
        a.pause();
        a.volume = s.current.volume;
        setSleep({ kind: "off" });
        toast("Sleep timer ended. Sweet dreams.");
      }
    };
    tick();
    const iv = window.setInterval(tick, 500);
    return () => window.clearInterval(iv);
  }, [sleep]);

  const togglePlay = useCallback(() => {
    const a = audioRef.current;
    if (!a || !currentIdRef.current) return;
    if (!a.src) {
      void load(currentIdRef.current, true);
      return;
    }
    if (a.paused) void a.play().catch(() => undefined);
    else a.pause();
  }, [load]);

  const seek = useCallback((t: number) => {
    const a = audioRef.current;
    if (!a) return;
    const d = Number.isFinite(a.duration) ? a.duration : t;
    a.currentTime = Math.max(0, Math.min(d, t));
    setTime((x) => ({ ...x, currentTime: a.currentTime }));
  }, []);

  const skip = useCallback((delta: number) => {
    const a = audioRef.current;
    if (a) seek(a.currentTime + delta);
  }, [seek]);

  const next = useCallback(() => {
    const st = s.current;
    const np = nextPosition(st.pos, st.order.length, st.repeat, "user");
    if (np === null) {
      toast("That was the last one in the queue.");
      return;
    }
    goTo(np, true);
  }, [goTo]);

  const prev = useCallback(() => {
    const st = s.current;
    const a = audioRef.current;
    const r = previousPosition(st.pos, st.order.length, st.repeat, a?.currentTime ?? 0);
    if (r.restart) seek(0);
    else goTo(r.pos, true);
  }, [goTo, seek]);

  // Lock screen / notification / headset controls.
  const actions = useRef({ togglePlay, next, prev, skip, seek });
  actions.current = { togglePlay, next, prev, skip, seek };
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    const ms = navigator.mediaSession;
    const set = (k: MediaSessionAction, fn: MediaSessionActionHandler | null) => {
      try {
        ms.setActionHandler(k, fn);
      } catch {
        /* unsupported action */
      }
    };
    set("play", () => void audioRef.current?.play());
    set("pause", () => audioRef.current?.pause());
    set("previoustrack", () => actions.current.prev());
    set("nexttrack", () => actions.current.next());
    set("seekbackward", (d) => actions.current.skip(-(d.seekOffset ?? getSettings().skipInterval)));
    set("seekforward", (d) => actions.current.skip(d.seekOffset ?? getSettings().skipInterval));
    set("seekto", (d) => d.seekTime !== undefined && actions.current.seek(d.seekTime));
  }, []);

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    if (!current) {
      navigator.mediaSession.metadata = null;
      return;
    }
    const folder = current.folderId ? lib.folderById.get(current.folderId)?.name : undefined;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: current.title,
      artist: folder ?? "Her Voice",
      album: "Her Voice",
    });
  }, [current?.id, current?.title, current?.folderId, lib.folderById]);

  useEffect(() => {
    if ("mediaSession" in navigator) navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
  }, [isPlaying]);

  useEffect(() => {
    if (!("mediaSession" in navigator) || !time.duration) return;
    try {
      navigator.mediaSession.setPositionState({
        duration: time.duration,
        playbackRate: rate,
        position: Math.min(time.currentTime, time.duration),
      });
    } catch {
      /* ignore */
    }
    // Only refresh on second boundaries to keep this cheap.
  }, [Math.floor(time.currentTime), time.duration, rate]);

  const value: PlayerValue = {
    current,
    queue,
    order,
    pos,
    upNext: order.slice(pos + 1).map((qi, i) => ({ orderPos: pos + 1 + i, id: queue[qi]! })),
    isPlaying,
    rate,
    volume,
    repeat,
    shuffle,
    stopAfterCurrent,
    sleep,
    fullOpen,
    setFullOpen,

    playList(ids, startId, opts) {
      if (!ids.length) return;
      const startIndex = Math.max(0, startId ? ids.indexOf(startId) : 0);
      const sh = opts?.shuffle ?? s.current.shuffle;
      const realStart = opts?.shuffle && !startId ? Math.floor(Math.random() * ids.length) : startIndex;
      const o = buildOrder(ids.length, realStart, sh);
      if (opts?.shuffle !== undefined) setShuffle(opts.shuffle);
      setQueue(ids);
      setOrder(o);
      goTo(Math.max(0, o.indexOf(realStart)), true, ids, o);
    },
    togglePlay,
    pause: () => audioRef.current?.pause(),
    seek,
    skip,
    next,
    prev,
    jumpTo: (orderPos) => goTo(orderPos, true),
    setRate(r) {
      setRateState(r);
      if (audioRef.current) {
        audioRef.current.playbackRate = r;
        audioRef.current.defaultPlaybackRate = r;
      }
    },
    setVolume(v) {
      setVolumeState(v);
      if (audioRef.current) audioRef.current.volume = v;
    },
    setRepeat: setRepeatState,
    cycleRepeat() {
      setRepeatState((r) => (r === "NO_REPEAT" ? "REPEAT_ALL" : r === "REPEAT_ALL" ? "REPEAT_ONE" : "NO_REPEAT"));
    },
    toggleShuffle() {
      const st = s.current;
      const nextShuffle = !st.shuffle;
      setShuffle(nextShuffle);
      if (!st.queue.length) return;
      const curQ = st.order[st.pos] ?? 0;
      const o = buildOrder(st.queue.length, curQ, nextShuffle);
      setOrder(o);
      setPos(o.indexOf(curQ));
    },
    setStopAfterCurrent,
    playNext(id) {
      const st = s.current;
      if (!st.queue.length) return value.playList([id]);
      const qi = st.queue.length;
      setQueue([...st.queue, id]);
      const o = [...st.order];
      o.splice(st.pos + 1, 0, qi);
      setOrder(o);
      toast("Playing next");
    },
    addToQueue(id) {
      const st = s.current;
      if (!st.queue.length) return value.playList([id]);
      setQueue([...st.queue, id]);
      setOrder([...st.order, st.queue.length]);
      toast("Added to queue");
    },
    removeFromQueue(orderPos) {
      const st = s.current;
      if (orderPos === st.pos) return;
      const qi = st.order[orderPos];
      if (qi === undefined) return;
      const q = st.queue.filter((_, i) => i !== qi);
      const o = st.order.filter((_, i) => i !== orderPos).map((i) => (i > qi ? i - 1 : i));
      setQueue(q);
      setOrder(o);
      if (orderPos < st.pos) setPos(st.pos - 1);
    },
    moveInQueue(orderPos, dir) {
      const st = s.current;
      const target = orderPos + dir;
      if (target <= st.pos || target >= st.order.length || orderPos <= st.pos) return;
      const o = [...st.order];
      const tmp = o[orderPos]!;
      o[orderPos] = o[target]!;
      o[target] = tmp;
      setOrder(o);
    },
    clearQueue() {
      const st = s.current;
      const curQ = st.order[st.pos];
      if (curQ === undefined) return;
      setQueue([st.queue[curQ]!]);
      setOrder([0]);
      setPos(0);
    },

    setSleepMinutes(min) {
      setSleep({ kind: "timer", endsAt: Date.now() + min * 60000, total: min * 60000, pausedRemaining: null });
      toast(`Sleep timer set for ${min} min`);
    },
    setSleepAt(date) {
      const ms = date.getTime() - Date.now();
      if (ms <= 0) return;
      setSleep({ kind: "timer", endsAt: date.getTime(), total: ms, pausedRemaining: null });
      toast(`Playback stops at ${date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`);
    },
    setSleepEndOfTrack() {
      setSleep({ kind: "endOfTrack" });
      toast("Stopping after this voice note");
    },
    cancelSleep() {
      setSleep({ kind: "off" });
      if (audioRef.current) audioRef.current.volume = s.current.volume;
    },
    pauseSleep() {
      setSleep((sl) =>
        sl.kind === "timer" && sl.pausedRemaining === null
          ? { ...sl, pausedRemaining: Math.max(0, sl.endsAt - Date.now()) }
          : sl,
      );
      if (audioRef.current) audioRef.current.volume = s.current.volume;
    },
    resumeSleep() {
      setSleep((sl) =>
        sl.kind === "timer" && sl.pausedRemaining !== null
          ? { ...sl, endsAt: Date.now() + sl.pausedRemaining, pausedRemaining: null }
          : sl,
      );
    },
  };

  return (
    <PlayerContext.Provider value={value}>
      <TimeContext.Provider value={time}>{children}</TimeContext.Provider>
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used inside PlayerProvider");
  return ctx;
}

export function usePlayerTime() {
  return useContext(TimeContext);
}
