import { createFileRoute, Link } from "@tanstack/react-router";
import { FolderPlus, Library, ListMusic, Play, Search, Shuffle, X } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AudioRow } from "@/components/hv/AudioRow";
import { Chip, EmptyState, PageHeader } from "@/components/hv/common";
import { FolderBadge } from "@/components/hv/folder-visual";
import { useUI } from "@/components/hv/ui-context";
import { useLibrary } from "@/lib/hv/library";
import { usePlayer } from "@/lib/hv/player";
import { filterAudios, sortAudios, SORT_LABELS, type DateFilter, type LengthFilter, type SortKey } from "@/lib/hv/query";
import { relativeDate } from "@/lib/hv/format";

type Tab = "all" | "folders" | "recent";
interface LibrarySearch {
  q?: string | undefined;
  tab?: Tab | undefined;
  sort?: SortKey | undefined;
  fav?: boolean | undefined;
  date?: DateFilter | undefined;
  len?: LengthFilter | undefined;
}

export const Route = createFileRoute("/library")({
  validateSearch: (s: Record<string, unknown>): LibrarySearch => ({
    q: typeof s["q"] === "string" && s["q"] ? s["q"] : undefined,
    tab: s["tab"] === "folders" || s["tab"] === "recent" ? s["tab"] : s["tab"] === "all" ? "all" : undefined,
    sort: typeof s["sort"] === "string" && s["sort"] in SORT_LABELS ? (s["sort"] as SortKey) : undefined,
    fav: s["fav"] === true || s["fav"] === "true" ? true : undefined,
    date: s["date"] === "today" || s["date"] === "week" || s["date"] === "month" ? s["date"] : undefined,
    len: s["len"] === "short" || s["len"] === "medium" || s["len"] === "long" ? s["len"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Library — Her Voice" },
      { name: "description", content: "Browse, search, filter and sort every voice note you've saved." },
      { property: "og:title", content: "Library — Her Voice" },
      { property: "og:description", content: "Browse, search, filter and sort every voice note you've saved." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LibraryPage,
});

function LibraryPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const lib = useLibrary();
  const ui = useUI();
  const player = usePlayer();
  const tab = search.tab ?? "all";
  const sort = search.sort ?? "recent";
  const q = search.q ?? "";

  const set = (patch: Partial<LibrarySearch>) =>
    navigate({ search: (prev: LibrarySearch) => ({ ...prev, ...patch }), replace: true });

  const folderNames = useMemo(() => new Map(lib.folders.map((f) => [f.id, f.name])), [lib.folders]);
  const results = useMemo(
    () =>
      sortAudios(
        filterAudios(lib.visibleAudios, { q, favorites: search.fav, date: search.date, length: search.len, folderNames }),
        sort,
      ),
    [lib.visibleAudios, q, search.fav, search.date, search.len, sort, folderNames],
  );
  const recent = useMemo(
    () =>
      lib.visibleAudios
        .filter((a) => a.lastPlayed)
        .sort((a, b) => (b.lastPlayed ?? 0) - (a.lastPlayed ?? 0))
        .filter((a) => !q || a.title.toLowerCase().includes(q.toLowerCase())),
    [lib.visibleAudios, q],
  );
  const ql = q.toLowerCase();
  const folderResults = lib.folders.filter((f) => (q ? f.name.toLowerCase().includes(ql) : !f.parentId));
  const playlistResults = q ? lib.playlists.filter((p) => p.name.toLowerCase().includes(ql)) : [];

  return (
    <div className="animate-float-in">
      <PageHeader
        title="Library"
        subtitle={`${lib.visibleAudios.length} voice notes · ${lib.folders.length} folders`}
        action={
          <Button variant="soft" size="icon-lg" aria-label="Import" onClick={() => ui.openImport()}>
            <Library />
          </Button>
        }
      />

      <div className="sticky top-0 z-20 space-y-3 bg-background/90 px-5 pt-1 pb-3 backdrop-blur-md">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => set({ q: e.target.value || undefined })}
            placeholder="Search by name, folder or playlist"
            aria-label="Search library"
            className="h-12 w-full rounded-2xl border bg-card pr-10 pl-12 outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
          />
          {q && (
            <button
              aria-label="Clear search"
              onClick={() => set({ q: undefined })}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        <div className="flex gap-1 rounded-full bg-muted/70 p-1">
          {(["all", "folders", "recent"] as const).map((t) => (
            <button
              key={t}
              onClick={() => set({ tab: t })}
              className={
                "flex-1 rounded-full py-2 text-sm font-semibold transition-colors " +
                (tab === t ? "bg-card shadow-soft" : "text-muted-foreground")
              }
            >
              {t === "all" ? "All audio" : t === "folders" ? "Folders" : "Recently played"}
            </button>
          ))}
        </div>
      </div>

      {tab === "all" && (
        <>
          <div className="no-scrollbar flex gap-2 overflow-x-auto px-5 pb-3">
            <Chip active={search.fav} onClick={() => set({ fav: search.fav ? undefined : true })}>
              Favorites
            </Chip>
            {(["short", "medium", "long"] as const).map((l) => (
              <Chip key={l} active={search.len === l} onClick={() => set({ len: search.len === l ? undefined : l })}>
                {l === "short" ? "Under 1 min" : l === "medium" ? "1–5 min" : "Over 5 min"}
              </Chip>
            ))}
          </div>
          <div className="flex items-center gap-2 px-5 pb-2">
            <Select value={search.date ?? "any"} onValueChange={(v) => set({ date: v === "any" ? undefined : (v as DateFilter) })}>
              <SelectTrigger className="h-9 w-auto rounded-full bg-card text-sm" aria-label="Date added">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any date</SelectItem>
                <SelectItem value="today">Added today</SelectItem>
                <SelectItem value="week">This week</SelectItem>
                <SelectItem value="month">This month</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={(v) => set({ sort: v as SortKey })}>
              <SelectTrigger className="h-9 w-auto rounded-full bg-card text-sm" aria-label="Sort">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SORT_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="ml-auto flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Shuffle results"
                disabled={!results.length}
                onClick={() => player.playList(results.map((a) => a.id), undefined, { shuffle: true })}
              >
                <Shuffle />
              </Button>
              <Button
                variant="play"
                size="icon"
                aria-label="Play results"
                disabled={!results.length}
                onClick={() => player.playList(results.map((a) => a.id), undefined, { shuffle: false })}
              >
                <Play className="ml-0.5 fill-current" />
              </Button>
            </div>
          </div>

          {q && (folderResults.length > 0 || playlistResults.length > 0) && (
            <div className="no-scrollbar flex gap-2 overflow-x-auto px-5 pb-3">
              {folderResults.map((f) => (
                <Link
                  key={f.id}
                  to="/folders/$folderId"
                  params={{ folderId: f.id }}
                  className="flex shrink-0 items-center gap-2 rounded-2xl border bg-card py-1.5 pr-4 pl-1.5"
                >
                  <FolderBadge folder={f} size="sm" />
                  <span className="text-sm font-semibold">{f.name}</span>
                </Link>
              ))}
              {playlistResults.map((p) => (
                <Link
                  key={p.id}
                  to="/playlists/$playlistId"
                  params={{ playlistId: p.id }}
                  className="flex shrink-0 items-center gap-2 rounded-2xl border bg-card py-1.5 pr-4 pl-1.5"
                >
                  <span className="inline-flex size-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                    <ListMusic className="size-4" />
                  </span>
                  <span className="text-sm font-semibold">{p.name}</span>
                </Link>
              ))}
            </div>
          )}

          {lib.ready && !results.length ? (
            <EmptyState
              icon={<Search />}
              title={lib.visibleAudios.length ? "Nothing matches" : "Your library is empty"}
              body={lib.visibleAudios.length ? "Try a different search or clear the filters." : "Import a voice note to get started."}
              action={
                !lib.visibleAudios.length && (
                  <Button variant="hero" size="lg" onClick={() => ui.openImport()}>
                    Import voice notes
                  </Button>
                )
              }
            />
          ) : (
            <div className="px-2">
              {results.map((a) => (
                <AudioRow key={a.id} audio={a} context={results.map((x) => x.id)} />
              ))}
            </div>
          )}
        </>
      )}

      {tab === "folders" && (
        <div className="px-5">
          <div className="grid grid-cols-2 gap-3">
            {folderResults.map((f) => {
              const items = lib.audios.filter((a) => a.folderId === f.id && !a.deletedAt);
              const subs = lib.folders.filter((x) => x.parentId === f.id).length;
              return (
                <Link
                  key={f.id}
                  to="/folders/$folderId"
                  params={{ folderId: f.id }}
                  className="flex flex-col gap-4 rounded-3xl border bg-card p-4 shadow-soft transition-transform active:scale-[0.97]"
                >
                  <FolderBadge folder={f} size="lg" />
                  <span>
                    <span className="block truncate text-lg font-semibold">{f.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {f.pinHash ? "PIN protected" : `${items.length} notes`}
                      {subs > 0 && ` · ${subs} folders`}
                    </span>
                  </span>
                </Link>
              );
            })}
            <button
              onClick={() => ui.openFolderEditor({})}
              className="flex flex-col items-start gap-4 rounded-3xl border border-dashed p-4 text-muted-foreground hover:text-foreground"
            >
              <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-muted">
                <FolderPlus className="size-6" />
              </span>
              <span className="text-lg font-semibold">New folder</span>
            </button>
          </div>
        </div>
      )}

      {tab === "recent" &&
        (recent.length ? (
          <div className="px-2">
            {recent.map((a) => (
              <AudioRow
                key={a.id}
                audio={a}
                context={recent.map((x) => x.id)}
                meta={`Played ${relativeDate(a.lastPlayed)} · ${a.playCount}×`}
              />
            ))}
          </div>
        ) : (
          <EmptyState icon={<Play />} title="Nothing played yet" body="Voice notes you listen to will show up here." />
        ))}
    </div>
  );
}
