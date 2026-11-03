import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLibrary } from "@/lib/hv/library";
import { formatTime } from "@/lib/hv/format";
import type { Bookmark } from "@/lib/hv/types";

export function BookmarkDialog({
  open,
  onOpenChange,
  audioId,
  timestamp,
  editing,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  audioId: string;
  timestamp: number;
  editing?: Bookmark | null;
}) {
  const lib = useLibrary();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!open) return;
    setTitle(editing?.title ?? "");
    setDescription(editing?.description ?? "");
  }, [open, editing]);

  const ts = editing?.timestamp ?? timestamp;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-medium">{editing ? "Edit bookmark" : "Bookmark this moment"}</DialogTitle>
          <DialogDescription>At {formatTime(ts)}</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            const t = title.trim() || `Moment at ${formatTime(ts)}`;
            if (editing) {
              await lib.updateBookmark(editing.id, { title: t, description: description.trim() });
              toast.success("Bookmark updated");
            } else {
              await lib.addBookmark({ audioId, timestamp: ts, title: t, description: description.trim() });
              toast.success("Bookmark saved");
            }
            onOpenChange(false);
          }}
        >
          <Input
            autoFocus
            placeholder="Title, e.g. “the part where she laughs”"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-11 rounded-xl"
          />
          <Textarea
            placeholder="Note (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="min-h-20 rounded-xl"
          />
          <Button type="submit" variant="hero" size="lg" className="w-full">
            Save bookmark
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
