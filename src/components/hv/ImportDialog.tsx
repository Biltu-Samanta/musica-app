import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, FolderPlus, Loader2, Pause, Play, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useLibrary } from "@/lib/hv/library";
import { detectFormat, hashFile, probeDuration } from "@/lib/hv/import";
import { formatBytes, formatTime, stripExtension } from "@/lib/hv/format";
import type { AudioItem } from "@/lib/hv/types";

interface Row {
  key: string;
  file: File;
  title: string;
  format: string;
  duration: number;
  hash: string;
  duplicateOf?: AudioItem | undefined;
  include: boolean;
  ready: boolean;
}

const UNFILED = "__unfiled";

export function ImportDialog({
  state,
  onClose,
}: {
  state: { files: File[]; folderId: string | null } | null;
  onClose: () => void;
}) {
  const lib = useLibrary();
  const [rows, setRows] = useState<Row[]>([]);
  const [folderId, setFolderId] = useState<string>(UNFILED);
  const [newFolder, setNewFolder] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [previewKey, setPreviewKey] = useState<string | null>(null);
  const previewRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!state) return;
    setProgress(null);
    setNewFolder(null);
    setFolderId(state.folderId ?? lib.folders[0]?.id ?? UNFILED);
    const initial: Row[] = state.files.map((file, i) => ({
      key: `${i}-${file.name}-${file.size}`,
      file,
      title: stripExtension(file.name),
      format: detectFormat(file),
      duration: 0,
      hash: "",
      include: true,
      ready: false,
    }));
    setRows(initial);
    let cancelled = false;
    (async () => {
      const seen = new Set<string>();
      for (const r of initial) {
        const [duration, hash] = await Promise.all([probeDuration(r.file), hashFile(r.file)]);
        if (cancelled) return;
        const duplicateOf = lib.findDuplicate(hash);
        const dupInBatch = seen.has(hash);
        seen.add(hash);
        setRows((list) =>
          list.map((x) =>
            x.key === r.key
              ? { ...x, duration, hash, duplicateOf, include: !duplicateOf && !dupInBatch, ready: true }
              : x,
          ),
        );
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const stopPreview = () => {
    previewRef.current?.pause();
    if (previewRef.current?.src) URL.revokeObjectURL(previewRef.current.src);
    previewRef.current = null;
    setPreviewKey(null);
  };

  const togglePreview = (r: Row) => {
    if (previewKey === r.key) return stopPreview();
    stopPreview();
    const a = new Audio(URL.createObjectURL(r.file));
    a.onended = stopPreview;
    a.onerror = () => {
      toast.error("This file can't be previewed in this browser.");
      stopPreview();
    };
    previewRef.current = a;
    setPreviewKey(r.key);
    void a.play().catch(() => undefined);
  };

  const close = () => {
    stopPreview();
    onClose();
  };

  const selected = rows.filter((r) => r.include);
  const allReady = rows.every((r) => r.ready);
  const busy = progress !== null;

  const doImport = async () => {
    stopPreview();
    let target: string | null = folderId === UNFILED ? null : folderId;
    if (newFolder !== null) {
      if (!newFolder.trim()) {
        toast.error("Give the new folder a name.");
        return;
      }
      target = (await lib.createFolder({ name: newFolder.trim() })).id;
    }
    setProgress(0);
    try {
      const count = await lib.importAudios(
        selected.map((r) => ({
          file: r.file,
          title: r.title,
          folderId: target,
          duration: r.duration,
          format: r.format,
          hash: r.hash,
        })),
        (done, total) => setProgress(Math.round((done / total) * 100)),
      );
      const folderName = target ? lib.folderById.get(target)?.name ?? newFolder : "your library";
      toast.success(`Saved ${count} voice note${count === 1 ? "" : "s"} to ${folderName}`);
      onClose();
    } catch (e) {
      console.error(e);
      toast.error("Import failed. Your device may be out of space.");
      setProgress(null);
    }
  };

  return (
    <Dialog open={!!state} onOpenChange={(o) => !o && !busy && close()}>
      <DialogContent className="max-h-[92dvh] gap-0 overflow-hidden rounded-3xl p-0 sm:max-w-lg">
        <DialogHeader className="px-5 pt-5 pb-3 text-left">
          <DialogTitle className="text-2xl font-medium">Save voice notes</DialogTitle>
          <DialogDescription>Kept privately on this device. Nothing is uploaded.</DialogDescription>
        </DialogHeader>

        <div className="max-h-[42dvh] space-y-2 overflow-y-auto px-5 pb-2">
          {rows.map((r) => (
            <div
              key={r.key}
              className={cn(
                "rounded-2xl border bg-card p-3 transition-opacity",
                !r.include && "opacity-60",
              )}
            >
              <div className="flex items-center gap-3">
                <button
                  onClick={() => togglePreview(r)}
                  aria-label={previewKey === r.key ? "Stop preview" : "Preview"}
                  className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground"
                >
                  {previewKey === r.key ? <Pause className="size-4" /> : <Play className="ml-0.5 size-4" />}
                </button>
                <div className="min-w-0 flex-1">
                  <Input
                    value={r.title}
                    onChange={(e) =>
                      setRows((l) => l.map((x) => (x.key === r.key ? { ...x, title: e.target.value } : x)))
                    }
                    className="h-8 border-0 bg-transparent px-0 font-semibold shadow-none focus-visible:ring-0"
                    aria-label="Voice note name"
                  />
                  <p className="truncate text-xs text-muted-foreground">
                    {r.ready ? formatTime(r.duration) : "Reading…"} · {r.format.toUpperCase()} ·{" "}
                    {formatBytes(r.file.size)}
                  </p>
                </div>
                <button
                  onClick={() => setRows((l) => l.map((x) => (x.key === r.key ? { ...x, include: !x.include } : x)))}
                  aria-label={r.include ? "Skip this file" : "Include this file"}
                  className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
                >
                  {r.include ? <X className="size-4" /> : <CheckCircle2 className="size-4" />}
                </button>
              </div>
              {r.duplicateOf && (
                <div className="mt-2 flex gap-1.5 rounded-lg bg-accent px-2.5 py-1.5 text-xs text-accent-foreground">
                  <AlertTriangle className="mt-px size-3.5 shrink-0" />
                  <p>
                    Already saved as “{r.duplicateOf.title}”.
                    {!r.include && " Tap ✓ to keep a copy anyway."}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="space-y-3 border-t bg-muted/40 px-5 pt-4 pb-5">
          <div className="flex items-center gap-2">
            {newFolder === null ? (
              <>
                <Select value={folderId} onValueChange={setFolderId}>
                  <SelectTrigger className="h-11 flex-1 rounded-xl bg-card" aria-label="Destination folder">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNFILED}>No folder</SelectItem>
                    {lib.folders.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {lib.folderPath(f.id).map((p) => p.name).join(" / ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" className="h-11 rounded-xl" onClick={() => setNewFolder("")}>
                  <FolderPlus /> New
                </Button>
              </>
            ) : (
              <>
                <Input
                  autoFocus
                  placeholder="New folder name"
                  value={newFolder}
                  onChange={(e) => setNewFolder(e.target.value)}
                  className="h-11 flex-1 rounded-xl bg-card"
                />
                <Button variant="ghost" className="h-11" onClick={() => setNewFolder(null)}>
                  Cancel
                </Button>
              </>
            )}
          </div>

          {busy ? (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-center text-xs text-muted-foreground">Saving… {progress}%</p>
            </div>
          ) : (
            <Button
              variant="hero"
              size="lg"
              className="w-full"
              disabled={!selected.length || !allReady}
              onClick={doImport}
            >
              {!allReady ? (
                <>
                  <Loader2 className="animate-spin" /> Checking files…
                </>
              ) : (
                `Save ${selected.length} voice note${selected.length === 1 ? "" : "s"}`
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
