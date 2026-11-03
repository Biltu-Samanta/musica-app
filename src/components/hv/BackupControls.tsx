import { useRef, useState } from "react";
import { DownloadCloud, Loader2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createBackup, restoreBackup } from "@/lib/hv/backup";
import { downloadBlob } from "@/lib/hv/format";
import { useLibrary } from "@/lib/hv/library";

export function BackupControls() {
  const lib = useLibrary();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);

  return (
    <div className="grid grid-cols-2 gap-2">
      <Button
        variant="outline"
        size="lg"
        className="bg-card"
        disabled={!!busy}
        onClick={async () => {
          setBusy("Preparing…");
          try {
            const blob = await createBackup((d, t) => setBusy(`Packing ${d}/${t}`));
            const date = new Date().toISOString().slice(0, 10);
            downloadBlob(blob, `her-voice-backup-${date}.zip`);
            toast.success("Backup saved to your downloads");
          } catch (e) {
            console.error(e);
            toast.error("Backup failed.");
          } finally {
            setBusy(null);
          }
        }}
      >
        {busy && busy !== "Restoring…" ? <Loader2 className="animate-spin" /> : <DownloadCloud />}
        {busy && busy !== "Restoring…" ? busy : "Back up"}
      </Button>
      <Button variant="outline" size="lg" className="bg-card" disabled={!!busy} onClick={() => input.current?.click()}>
        {busy === "Restoring…" ? <Loader2 className="animate-spin" /> : <UploadCloud />}
        {busy === "Restoring…" ? busy : "Restore"}
      </Button>
      <input
        ref={input}
        type="file"
        accept=".zip,application/zip"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          setBusy("Restoring…");
          try {
            const n = await restoreBackup(file);
            await lib.reload();
            toast.success(`Restored ${n} voice notes`);
          } catch (err) {
            toast.error((err as Error).message || "Couldn't restore that file.");
          } finally {
            setBusy(null);
          }
        }}
      />
    </div>
  );
}
