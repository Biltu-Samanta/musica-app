import { createFileRoute, Link } from "@tanstack/react-router";
import { Copy, ShieldCheck, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { BackupControls } from "@/components/hv/BackupControls";
import { PageHeader } from "@/components/hv/common";
import { FolderBadge, folderColorStyle } from "@/components/hv/folder-visual";
import { useLibrary } from "@/lib/hv/library";
import { formatBytes, relativeDate } from "@/lib/hv/format";

export const Route = createFileRoute("/storage")({
  head: () => ({
    meta: [
      { title: "Storage — Her Voice" },
      { name: "description", content: "See how much space your voice notes use, find duplicates and free up room." },
      { property: "og:title", content: "Storage — Her Voice" },
      { property: "og:description", content: "See how much space your voice notes use, find duplicates and free up room." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StoragePage,
});

function StoragePage() {
  const lib = useLibrary();
  const [quota, setQuota] = useState<{ usage: number; quota: number } | null>(null);
  const [persisted, setPersisted] = useState<boolean | null>(null);

  useEffect(() => {
    navigator.storage?.estimate?.().then((e) => setQuota({ usage: e.usage ?? 0, quota: e.quota ?? 0 }));
    navigator.storage?.persisted?.().then(setPersisted);
  }, [lib.audios.length]);

  const active = lib.audios.filter((a) => !a.deletedAt);
  const total = active.reduce((s, a) => s + a.fileSize, 0);
  const trashSize = lib.trash.reduce((s, a) => s + a.fileSize, 0);

  const perFolder = useMemo(() => {
    const rows = lib.folders.map((f) => ({
      folder: f,
      size: active.filter((a) => a.folderId === f.id).reduce((s, a) => s + a.fileSize, 0),
      count: active.filter((a) => a.folderId === f.id).length,
    }));
    const unfiled = active.filter((a) => !a.folderId);
    return { rows: rows.sort((a, b) => b.size - a.size), unfiled: unfiled.reduce((s, a) => s + a.fileSize, 0), unfiledCount: unfiled.length };
  }, [lib.folders, active]);

  const duplicates = useMemo(() => {
    const groups = new Map<string, typeof active>();
    active.forEach((a) => groups.set(a.sha256, [...(groups.get(a.sha256) ?? []), a]));
    return [...groups.values()].filter((g) => g.length > 1).map((g) => g.sort((a, b) => a.dateImported - b.dateImported));
  }, [active]);

  const neverPlayed = active.filter((a) => !a.playCount && Date.now() - a.dateImported > 30 * 864e5);

  return (
    <div className="animate-float-in">
      <PageHeader title="Storage" back />

      <section className="px-5">
        <div className="rounded-3xl bg-hero p-5 text-primary-foreground shadow-lift">
          <p className="text-sm text-primary-foreground/75">Voice notes use</p>
          <p className="font-display text-5xl leading-tight">{formatBytes(total)}</p>
          <p className="text-sm text-primary-foreground/75">across {active.length} voice notes</p>
          {quota && quota.quota > 0 && (
            <>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-primary-foreground/20">
                <div
                  className="h-full rounded-full bg-primary-foreground"
                  style={{ width: `${Math.max(1, (quota.usage / quota.quota) * 100)}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-primary-foreground/75">
                {formatBytes(quota.usage)} of {formatBytes(quota.quota)} available to Her Voice on this device
              </p>
            </>
          )}
        </div>
      </section>

      <section className="mt-4 px-5">
        <div className="flex items-center gap-3 rounded-2xl border bg-card p-4">
          <ShieldCheck className={persisted ? "size-5 text-success" : "size-5 text-muted-foreground"} />
          <p className="flex-1 text-sm">
            {persisted ? "Storage is protected from automatic clean-up." : "Your browser may clear storage when space is low."}
          </p>
          {!persisted && (
            <Button
              size="sm"
              variant="soft"
              onClick={async () => {
                const ok = await navigator.storage?.persist?.();
                setPersisted(!!ok);
                toast(ok ? "Storage protected" : "Your browser didn't allow it. Install the app to your home screen and try again.");
              }}
            >
              Protect
            </Button>
          )}
        </div>
      </section>

      <section className="mt-8 px-5">
        <h2 className="mb-3 text-xl font-medium">By folder</h2>
        <div className="space-y-3 rounded-3xl border bg-card p-4 shadow-soft">
          {perFolder.rows.map(({ folder, size, count }) => (
            <Link key={folder.id} to="/folders/$folderId" params={{ folderId: folder.id }} className="flex items-center gap-3">
              <FolderBadge folder={folder} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex justify-between text-sm">
                  <span className="truncate font-semibold">{folder.name}</span>
                  <span className="text-muted-foreground">
                    {count} · {formatBytes(size)}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    style={{ ...folderColorStyle(folder.color), width: `${total ? (size / total) * 100 : 0}%` }}
                    className="h-full rounded-full bg-[var(--fc)]"
                  />
                </div>
              </div>
            </Link>
          ))}
          {perFolder.unfiledCount > 0 && (
            <div className="flex justify-between pt-1 text-sm text-muted-foreground">
              <span>Not in a folder</span>
              <span>
                {perFolder.unfiledCount} · {formatBytes(perFolder.unfiled)}
              </span>
            </div>
          )}
        </div>
      </section>

      <section className="mt-8 px-5">
        <h2 className="mb-1 flex items-center gap-2 text-xl font-medium">
          <Copy className="size-5" /> Duplicates
        </h2>
        <p className="mb-3 text-sm text-muted-foreground">Identical files, matched by their content fingerprint.</p>
        {duplicates.length ? (
          <div className="space-y-3">
            {duplicates.map((g) => (
              <div key={g[0]!.sha256} className="rounded-2xl border bg-card p-4">
                <p className="font-semibold">{g[0]!.title}</p>
                <p className="text-xs text-muted-foreground">
                  {g.length} copies · {formatBytes(g[0]!.fileSize)} each
                </p>
                <Button
                  size="sm"
                  variant="soft"
                  className="mt-3"
                  onClick={async () => {
                    const extra = g.slice(1).map((a) => a.id);
                    await lib.deleteForever(extra);
                    toast.success(`Removed ${extra.length} duplicate${extra.length > 1 ? "s" : ""}`);
                  }}
                >
                  Keep the oldest, remove {g.length - 1}
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-2xl bg-muted/60 p-4 text-sm text-muted-foreground">No duplicates found.</p>
        )}
      </section>

      <section className="mt-8 px-5">
        <h2 className="mb-3 text-xl font-medium">Free up space</h2>
        <div className="divide-y rounded-3xl border bg-card">
          <div className="flex items-center gap-3 p-4">
            <Trash2 className="size-5 text-muted-foreground" />
            <div className="flex-1">
              <p className="font-medium">Recently deleted</p>
              <p className="text-xs text-muted-foreground">
                {lib.trash.length} items · {formatBytes(trashSize)}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={!lib.trash.length}
              onClick={async () => {
                await lib.deleteForever(lib.trash.map((a) => a.id));
                toast.success("Recently deleted emptied");
              }}
            >
              Empty
            </Button>
          </div>
          <div className="p-4">
            <p className="font-medium">Never played, older than 30 days</p>
            <p className="text-xs text-muted-foreground">
              {neverPlayed.length} items · {formatBytes(neverPlayed.reduce((s, a) => s + a.fileSize, 0))}
            </p>
            {neverPlayed.slice(0, 5).map((a) => (
              <div key={a.id} className="mt-2 flex items-center justify-between gap-2 text-sm">
                <span className="truncate">{a.title}</span>
                <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                  {relativeDate(a.dateImported)}
                  <button aria-label={`Delete ${a.title}`} onClick={() => lib.trashAudio(a.id)} className="hover:text-destructive">
                    <Trash2 className="size-4" />
                  </button>
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-8 px-5 pb-4">
        <h2 className="mb-1 text-xl font-medium">Backup & restore</h2>
        <p className="mb-3 text-sm text-muted-foreground">Download everything as one file, or bring a backup back in.</p>
        <BackupControls />
      </section>
    </div>
  );
}
