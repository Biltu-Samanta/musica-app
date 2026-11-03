import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, HardDrive, Info, Monitor, Moon, ShieldCheck, Smartphone, Sun } from "lucide-react";
import type { ReactNode } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { BackupControls } from "@/components/hv/BackupControls";
import { PageHeader } from "@/components/hv/common";
import { updateSettings, useSettings, type DefaultRepeat, type ThemeMode } from "@/lib/hv/settings";
import { formatSpeed } from "@/lib/hv/format";
import { PLAYBACK_SPEEDS, SKIP_INTERVALS } from "@/lib/hv/types";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Her Voice" },
      { name: "description", content: "Appearance, playback defaults, sleep timer, backup and privacy." },
      { property: "og:title", content: "Settings — Her Voice" },
      { property: "og:description", content: "Appearance, playback defaults, sleep timer, backup and privacy." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="px-5 pb-6">
      <h2 className="mb-2 px-1 text-sm font-semibold tracking-wide text-muted-foreground uppercase font-sans">{title}</h2>
      <div className="divide-y overflow-hidden rounded-3xl border bg-card shadow-soft">{children}</div>
    </section>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex min-h-14 items-center justify-between gap-4 px-4 py-3">
      <div className="min-w-0">
        <p className="font-medium">{label}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

const THEMES: { v: ThemeMode; label: string; icon: typeof Sun }[] = [
  { v: "light", label: "Light", icon: Sun },
  { v: "dark", label: "Dark", icon: Moon },
  { v: "system", label: "System", icon: Monitor },
];

const REPEATS: Record<DefaultRepeat, string> = {
  NO_REPEAT: "Play once",
  REPEAT_ALL: "Repeat all",
  REPEAT_ONE: "Repeat one",
  SHUFFLE: "Shuffle",
};

function SettingsPage() {
  const s = useSettings();

  return (
    <div className="animate-float-in">
      <PageHeader title="Settings" />

      <Group title="Appearance">
        <div className="grid grid-cols-3 gap-2 p-3">
          {THEMES.map(({ v, label, icon: Icon }) => (
            <button
              key={v}
              onClick={() => updateSettings({ theme: v })}
              aria-pressed={s.theme === v}
              className={cn(
                "flex flex-col items-center gap-2 rounded-2xl border py-4 text-sm font-semibold transition-colors",
                s.theme === v ? "border-primary bg-accent text-accent-foreground" : "hover:bg-muted",
              )}
            >
              <Icon className="size-5" />
              {label}
            </button>
          ))}
        </div>
      </Group>

      <Group title="Playback">
        <Row label="Default speed">
          <Select value={String(s.defaultSpeed)} onValueChange={(v) => updateSettings({ defaultSpeed: Number(v) })}>
            <SelectTrigger className="h-9 w-24 rounded-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PLAYBACK_SPEEDS.map((r) => (
                <SelectItem key={r} value={String(r)}>
                  {formatSpeed(r)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Row>
        <Row label="Skip interval" hint="For the ⟲ ⟳ buttons and headset">
          <Select value={String(s.skipInterval)} onValueChange={(v) => updateSettings({ skipInterval: Number(v) })}>
            <SelectTrigger className="h-9 w-24 rounded-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SKIP_INTERVALS.map((r) => (
                <SelectItem key={r} value={String(r)}>
                  {r}s
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Row>
        <Row label="Default repeat mode">
          <Select value={s.defaultRepeat} onValueChange={(v) => updateSettings({ defaultRepeat: v as DefaultRepeat })}>
            <SelectTrigger className="h-9 w-32 rounded-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(REPEATS).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Row>
        <Row label="Remember where I stopped" hint="Resume each voice note from the last spot">
          <Switch checked={s.resumePlayback} onCheckedChange={(v) => updateSettings({ resumePlayback: v })} />
        </Row>
        <Row label="Play next automatically">
          <Switch checked={s.autoplayNext} onCheckedChange={(v) => updateSettings({ autoplayNext: v })} />
        </Row>
      </Group>

      <Group title="Sleep timer">
        <Row label="Fade out before stopping">
          <Switch checked={s.sleepFade} onCheckedChange={(v) => updateSettings({ sleepFade: v })} />
        </Row>
        <Row label="Fade length">
          <Select
            value={String(s.sleepFadeSeconds)}
            onValueChange={(v) => updateSettings({ sleepFadeSeconds: Number(v) })}
            disabled={!s.sleepFade}
          >
            <SelectTrigger className="h-9 w-24 rounded-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[5, 10, 15, 30, 60].map((r) => (
                <SelectItem key={r} value={String(r)}>
                  {r}s
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Row>
      </Group>

      <Group title="Storage & backup">
        <Link to="/storage" className="flex min-h-14 items-center gap-3 px-4 py-3 hover:bg-muted/60">
          <HardDrive className="size-5 text-primary" />
          <span className="flex-1 font-medium">Storage dashboard</span>
          <ChevronRight className="size-4 text-muted-foreground" />
        </Link>
        <div className="space-y-2 p-4">
          <p className="text-sm text-muted-foreground">
            Save everything — audio, folders, playlists, bookmarks — into a single file you can keep anywhere.
          </p>
          <BackupControls />
        </div>
      </Group>

      <Group title="Privacy">
        <div className="flex gap-3 p-4">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-success" />
          <p className="text-sm text-muted-foreground">
            Her Voice has no account and no cloud. Your voice notes are stored only on this device and never leave it
            unless you share or back them up yourself.
          </p>
        </div>
      </Group>

      <Group title="About">
        <div className="flex gap-3 p-4">
          <Smartphone className="mt-0.5 size-5 shrink-0 text-primary" />
          <p className="text-sm text-muted-foreground">
            Install on your phone: open your browser menu and choose <strong className="text-foreground">Add to Home screen</strong>.
          </p>
        </div>
        <button
          onClick={() => updateSettings({ onboarded: false })}
          className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/60"
        >
          <Info className="size-5 text-primary" />
          <span className="flex-1 font-medium">Show the welcome tour again</span>
          <ChevronRight className="size-4 text-muted-foreground" />
        </button>
        <div className="px-4 py-4 text-center">
          <p className="font-display text-2xl italic">her voice</p>
          <p className="text-xs text-muted-foreground">Version 1.0</p>
        </div>
      </Group>
    </div>
  );
}
