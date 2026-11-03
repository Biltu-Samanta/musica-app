import { useState } from "react";
import { Moon, Pause, Play, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { usePlayer, usePlayerTime } from "@/lib/hv/player";
import { updateSettings, useSettings } from "@/lib/hv/settings";
import { formatTime } from "@/lib/hv/format";
import { SLEEP_PRESETS } from "@/lib/hv/types";

export function SleepTimerDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const player = usePlayer();
  const { sleepRemaining } = usePlayerTime();
  const settings = useSettings();
  const [custom, setCustom] = useState("");
  const [clock, setClock] = useState("");
  const sl = player.sleep;

  const done = () => onOpenChange(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl font-medium">
            <Moon className="size-5" /> Sleep timer
          </DialogTitle>
          <DialogDescription>Playback gently stops so you can drift off.</DialogDescription>
        </DialogHeader>

        {sl.kind !== "off" && (
          <div className="rounded-2xl bg-accent p-4 text-center text-accent-foreground">
            <p className="text-xs tracking-widest uppercase">
              {sl.kind === "endOfTrack" ? "Stopping" : sl.pausedRemaining !== null ? "Paused" : "Stopping in"}
            </p>
            <p className="font-display mt-1 text-4xl">
              {sl.kind === "endOfTrack" ? "After this one" : formatTime((sleepRemaining ?? 0) / 1000)}
            </p>
            <div className="mt-3 flex justify-center gap-2">
              {sl.kind === "timer" &&
                (sl.pausedRemaining !== null ? (
                  <Button variant="outline" size="sm" className="rounded-full bg-card" onClick={player.resumeSleep}>
                    <Play /> Resume
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" className="rounded-full bg-card" onClick={player.pauseSleep}>
                    <Pause /> Pause
                  </Button>
                ))}
              <Button variant="outline" size="sm" className="rounded-full bg-card" onClick={player.cancelSleep}>
                <X /> Cancel
              </Button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2">
          {SLEEP_PRESETS.map((m) => (
            <Button
              key={m}
              variant="outline"
              className="h-12 rounded-xl"
              onClick={() => {
                player.setSleepMinutes(m);
                done();
              }}
            >
              {m} min
            </Button>
          ))}
        </div>

        <Button
          variant="soft"
          size="lg"
          onClick={() => {
            player.setSleepEndOfTrack();
            done();
          }}
        >
          When this voice note ends
        </Button>

        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const m = Number(custom);
            if (m > 0) {
              player.setSleepMinutes(m);
              setCustom("");
              done();
            }
          }}
        >
          <Input
            inputMode="numeric"
            placeholder="Custom minutes"
            value={custom}
            onChange={(e) => setCustom(e.target.value.replace(/\D/g, "").slice(0, 3))}
            className="h-11 rounded-xl"
          />
          <Button type="submit" variant="outline" className="h-11 rounded-xl">
            Set
          </Button>
        </form>

        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!clock) return;
            const [h, m] = clock.split(":").map(Number);
            const d = new Date();
            d.setHours(h ?? 0, m ?? 0, 0, 0);
            if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1);
            player.setSleepAt(d);
            done();
          }}
        >
          <Input
            type="time"
            aria-label="Stop at time"
            value={clock}
            onChange={(e) => setClock(e.target.value)}
            className="h-11 rounded-xl"
          />
          <Button type="submit" variant="outline" className="h-11 shrink-0 rounded-xl">
            Stop at time
          </Button>
        </form>

        <label className="flex items-center justify-between gap-3 rounded-2xl bg-muted/60 px-4 py-3 text-sm">
          <span>
            <span className="block font-medium">Fade out gently</span>
            <span className="text-xs text-muted-foreground">Lowers volume over the last {settings.sleepFadeSeconds}s</span>
          </span>
          <Switch checked={settings.sleepFade} onCheckedChange={(v) => updateSettings({ sleepFade: v })} />
        </label>
      </DialogContent>
    </Dialog>
  );
}
