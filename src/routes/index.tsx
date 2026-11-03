import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Activity, Bookmark, Download, HardDrive, Play, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { AudioRow } from "@/components/hv/AudioRow";
import { EmptyState, SectionTitle } from "@/components/hv/common";
import { FolderBadge } from "@/components/hv/folder-visual";
import { useUI } from "@/components/hv/ui-context";
import { Waveform } from "@/components/hv/Waveform";
import { useLibrary } from "@/lib/hv/library";
import { usePlayer } from "@/lib/hv/player";
import { formatTime, formatTotalDuration } from "@/lib/hv/format";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Her Voice — your private voice note library" },
      {
        name: "description",
        content: "Import voice notes from WhatsApp and more, organise them into folders and listen with a beautiful player.",
      },
      { property: "og:title", content: "Her Voice — your private voice note library" },
      {
        property: "og:description",
        content: "Import voice notes from WhatsApp and more, organise them into folders and listen with a beautiful player.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function greeting() {
  const h = new Date().getHours();
  return h < 5 ? "Still up?" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

function Home() {
  const lib = useLibrary();
  const ui = useUI();
  const player = usePlayer();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const list = lib.visibleAudios;

  const recentAdded = useMemo(() => [...list].sort((a, b) => b.dateImported - a.dateImported).slice(0, 5), [list]);
  const recentPlayed = useMemo(
    () => list.filter((a) => a.lastPlayed).sort((a, b) => (b.lastPlayed ?? 0) - (a.lastPlayed ?? 0)).slice(0, 5),
    [list],
  );
  const favorites = useMemo(() => list.filter((a) => a.isFavorite), [list]);
  const continueItem = useMemo(
    () =>
      list
        .filter((a) => a.lastPosition > 3 && a.duration && a.lastPosition < a.duration - 3)
        .sort((a, b) => (b.lastPlayed ?? 0) - (a.lastPlayed ?? 0))[0],
    [list],
  );
  const totalDuration = list.reduce((s, a) => s + a.duration, 0);
  const rootFolders = lib.folders.filter((f) => !f.parentId);

  return (
    <div className="animate-float-in">
      <header className="relative px-5 pt-8 pb-5">
        <div className="absolute inset-x-0 top-0 h-64 bg-glow" aria-hidden />
        <div className="relative flex items-start justify-between">
          <div>
            <p className="text-sm font-semibold text-muted-foreground" suppressHydrationWarning>
              {greeting()}
            </p>
            <h1 className="mt-1 text-[2.75rem] leading-none font-light italic">her voice</h1>
          </div>
          <Link
            to="/storage"
            aria-label="Storage"
            className="inline-flex size-11 items-center justify-center rounded-full border bg-card text-muted-foreground hover:text-foreground"
          >
            <HardDrive className="size-5" />
          </Link>
        </div>
        <form
          className="relative mt-6"
          onSubmit={(e) => {
            e.preventDefault();
            navigate({ to: "/library", search: { q, tab: "all" } });
          }}
        >
          <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search voice notes, folders…"
            aria-label="Search"
            className="h-13 w-full rounded-2xl border bg-card pr-4 pl-12 text-[0.95rem] shadow-soft outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
          />
        </form>
      </header>

      <section className="px-5">
        <div className="relative overflow-hidden rounded-[1.75rem] bg-hero p-5 text-primary-foreground shadow-lift">
          <div className="absolute -top-16 -right-16 size-56 rounded-full border border-primary-foreground/15" />
          <div className="absolute -top-6 -right-6 size-36 rounded-full border border-primary-foreground/15" />
          <div className="relative grid grid-cols-3 gap-2">
            {[
              [list.length, "voice notes"],
              [lib.folders.length, "folders"],
              [formatTotalDuration(totalDuration), "of listening"],
            ].map(([v, l]) => (
              <div key={l as string}>
                <p className="font-display text-3xl leading-none">{v}</p>
                <p className="mt-1 text-xs text-primary-foreground/75">{l}</p>
              </div>
            ))}
          </div>
          <Button
            onClick={() => ui.openImport()}
            className="relative mt-5 h-12 w-full rounded-2xl bg-primary-foreground text-base font-bold text-primary hover:bg-primary-foreground/90"
          >
            <Download /> Import voice notes
          </Button>
        </div>
      </section>

      {continueItem && (
        <section className="mt-8 px-5">
          <h2 className="mb-3 text-xl font-medium">Continue listening</h2>
          <div className="rounded-3xl border bg-card p-4 shadow-soft">
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{continueItem.title}</p>
                <p className="text-xs text-muted-foreground">
                  {formatTime(continueItem.lastPosition)} of {formatTime(continueItem.duration)}
                </p>
              </div>
              <Button
                variant="play"
                size="icon-lg"
                aria-label={`Resume ${continueItem.title}`}
                onClick={() => player.playList([continueItem.id])}
              >
                <Play className="ml-0.5 fill-current" />
              </Button>
            </div>
            <Waveform
              seed={continueItem.id}
              progress={continueItem.lastPosition / continueItem.duration}
              className="mt-3 h-8"
              bars={60}
            />
          </div>
        </section>
      )}

      <section className="mt-8">
        <SectionTitle to="/library/folders">Folders</SectionTitle>
        <div className="no-scrollbar flex gap-3 overflow-x-auto px-5 pb-1">
          {rootFolders.map((f) => {
            const count = lib.audios.filter((a) => a.folderId === f.id && !a.deletedAt).length;
            return (
              <Link
                key={f.id}
                to="/folders/$folderId"
                params={{ folderId: f.id }}
                className="flex w-32 shrink-0 flex-col gap-3 rounded-3xl border bg-card p-4 shadow-soft transition-transform active:scale-[0.97]"
              >
                <FolderBadge folder={f} />
                <span>
                  <span className="block truncate font-semibold">{f.name}</span>
                  <span className="text-xs text-muted-foreground">{f.pinHash ? "Locked" : `${count} notes`}</span>
                </span>
              </Link>
            );
          })}
          <button
            onClick={() => ui.openFolderEditor({})}
            className="flex w-32 shrink-0 flex-col items-start gap-3 rounded-3xl border border-dashed p-4 text-muted-foreground hover:text-foreground"
          >
            <span className="inline-flex size-11 items-center justify-center rounded-xl bg-muted">
              <Plus className="size-5" />
            </span>
            <span className="font-semibold">New folder</span>
          </button>
        </div>
      </section>

      <section className="mt-8">
        <SectionTitle to="/library">Recently added</SectionTitle>
        {lib.ready && !recentAdded.length ? (
          <EmptyState
            icon={<Download />}
            title="No voice notes yet"
            body="Save a voice note from WhatsApp or Telegram to your phone, then import it here."
            action={
              <Button variant="hero" size="lg" onClick={() => ui.openImport()}>
                Import your first
              </Button>
            }
          />
        ) : (
          <div className="px-2">
            {recentAdded.map((a) => (
              <AudioRow key={a.id} audio={a} context={recentAdded.map((x) => x.id)} />
            ))}
          </div>
        )}
      </section>

      {recentPlayed.length > 0 && (
        <section className="mt-8">
          <SectionTitle to="/activity">Recently played</SectionTitle>
          <div className="px-2">
            {recentPlayed.map((a) => (
              <AudioRow key={a.id} audio={a} context={recentPlayed.map((x) => x.id)} />
            ))}
          </div>
        </section>
      )}

      {favorites.length > 0 && (
        <section className="mt-8">
          <SectionTitle to="/favorites">Favorites</SectionTitle>
          <div className="no-scrollbar flex gap-3 overflow-x-auto px-5 pb-1">
            {favorites.slice(0, 10).map((a) => (
              <button
                key={a.id}
                onClick={() => player.playList(favorites.map((x) => x.id), a.id)}
                className="w-40 shrink-0 rounded-3xl border bg-card p-4 text-left shadow-soft active:scale-[0.97]"
              >
                <Waveform seed={a.id} bars={18} className="h-10" progress={0} />
                <p className="mt-3 truncate font-semibold">{a.title}</p>
                <p className="text-xs text-muted-foreground">{formatTime(a.duration)}</p>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="mt-8 grid grid-cols-3 gap-3 px-5">
        {[
          { to: "/bookmarks" as const, label: "Bookmarks", icon: Bookmark },
          { to: "/activity" as const, label: "Activity", icon: Activity },
          { to: "/storage" as const, label: "Storage", icon: HardDrive },
        ].map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="flex flex-col items-center gap-2 rounded-3xl bg-muted/70 py-4 text-sm font-semibold hover:bg-muted"
          >
            <Icon className="size-5 text-primary" />
            {label}
          </Link>
        ))}
      </section>
    </div>
  );
}
