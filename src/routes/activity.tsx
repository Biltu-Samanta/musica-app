import { createFileRoute } from "@tanstack/react-router";
import { History, RotateCcw, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AudioRow } from "@/components/hv/AudioRow";
import { EmptyState, PageHeader } from "@/components/hv/common";
import { useLibrary } from "@/lib/hv/library";
import { usePlayer } from "@/lib/hv/player";
import { formatTime, relativeDate } from "@/lib/hv/format";

type Tab = "continue" | "imported" | "played" | "most" | "history" | "deleted";
const TABS: Record<Tab, string> = {
  continue: "Continue",
  imported: "Imported",
  played: "Played",
  most: "Most played",
  history: "History",
  deleted: "Deleted",
};

export const Route = createFileRoute("/activity")({
  head: () => ({
    meta: [
      { title: "Activity — Her Voice" },
      { name: "description", content: "Continue listening, recently imported, most played, history and recently deleted." },
      { property: "og:title", content: "Activity — Her Voice" },
      { property: "og:description", content: "Continue listening, recently imported, most played, history and recently deleted." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ActivityPage,
});

function ActivityPage() {
  const lib = useLibrary();
  const player = usePlayer();
  const [tab, setTab] = useState<Tab>("continue");
  const list = lib.visibleAudios;

  const data = useMemo(() => {
    switch (tab) {
      case "continue":
        return list
          .filter((a) => a.lastPosition > 3 && a.duration && a.lastPosition < a.duration - 3)
          .sort((a, b) => (b.lastPlayed ?? 0) - (a.lastPlayed ?? 0));
      case "imported":
        return [...list].sort((a, b) => b.dateImported - a.dateImported).slice(0, 50);
      case "played":
        return list.filter((a) => a.lastPlayed).sort((a, b) => (b.lastPlayed ?? 0) - (a.lastPlayed ?? 0));
      case "most":
        return list.filter((a) => a.playCount).sort((a, b) => b.playCount - a.playCount).slice(0, 50);
      default:
        return [];
    }
  }, [tab, list]);
  const ids = data.map((a) => a.id);
  const visibleIds = new Set(list.map((a) => a.id));
  const history = lib.history.filter((h) => visibleIds.has(h.audioId)).slice(0, 200);

  return (
    <div className="animate-float-in">
      <PageHeader title="Activity" back />
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-5 pb-4">
        {(Object.keys(TABS) as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={
              "h-9 shrink-0 rounded-full px-4 text-sm font-semibold transition-colors " +
              (tab === t ? "bg-foreground text-background" : "border bg-card")
            }
          >
            {TABS[t]}
            {t === "deleted" && lib.trash.length > 0 && ` (${lib.trash.length})`}
          </button>
        ))}
      </div>

      {tab === "history" ? (
        history.length ? (
          <>
            <ul className="px-5">
              {history.map((h) => {
                const a = lib.audioById.get(h.audioId)!;
                return (
                  <li key={h.id} className="flex items-center gap-3 border-b py-3 last:border-0">
                    <button className="min-w-0 flex-1 text-left" onClick={() => player.playList([a.id])}>
                      <p className="truncate font-semibold">{a.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(h.playedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })} · from{" "}
                        {formatTime(h.position)}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="mt-4 flex justify-center">
              <Button variant="ghost" size="sm" onClick={() => lib.clearHistory().then(() => toast("History cleared"))}>
                Clear history
              </Button>
            </div>
          </>
        ) : (
          <EmptyState icon={<History />} title="No history yet" />
        )
      ) : tab === "deleted" ? (
        lib.trash.length ? (
          <div className="space-y-1 px-3">
            {lib.trash.map((a) => (
              <div key={a.id} className="flex items-center gap-3 rounded-2xl px-2 py-2.5 hover:bg-muted/60">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{a.title}</p>
                  <p className="text-xs text-muted-foreground">Deleted {relativeDate(a.deletedAt)}</p>
                </div>
                <Button size="sm" variant="soft" onClick={() => lib.restoreAudio(a.id).then(() => toast.success("Restored"))}>
                  <RotateCcw /> Restore
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Delete forever"
                  onClick={() => lib.deleteForever([a.id]).then(() => toast("Deleted forever"))}
                >
                  <Trash2 />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={<Trash2 />} title="Nothing here" body="Deleted voice notes wait here until you remove them for good." />
        )
      ) : data.length ? (
        <div className="px-2">
          {data.map((a) => (
            <AudioRow
              key={a.id}
              audio={a}
              context={ids}
              meta={
                tab === "continue"
                  ? `${formatTime(a.lastPosition)} of ${formatTime(a.duration)}`
                  : tab === "most"
                    ? `Played ${a.playCount}× · ${formatTime(a.duration)}`
                    : tab === "played"
                      ? `Played ${relativeDate(a.lastPlayed)}`
                      : undefined
              }
            />
          ))}
        </div>
      ) : (
        <EmptyState icon={<History />} title="Nothing yet" body="Start listening and your activity will appear here." />
      )}
    </div>
  );
}
