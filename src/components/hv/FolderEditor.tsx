import { useEffect, useState } from "react";
import { Lock, Unlock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useLibrary } from "@/lib/hv/library";
import { sha256 } from "@/lib/hv/format";
import { FOLDER_COLORS, FOLDER_ICONS, type Folder } from "@/lib/hv/types";
import { FolderBadge, folderColorStyle, folderIcon } from "./folder-visual";

const ROOT = "__root";

export function FolderEditor({
  state,
  onClose,
}: {
  state: { folder?: Folder; parentId?: string | null } | null;
  onClose: () => void;
}) {
  const lib = useLibrary();
  const editing = state?.folder;
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState<string>("garnet");
  const [icon, setIcon] = useState<string>("mic");
  const [parent, setParent] = useState<string>(ROOT);
  const [pin, setPin] = useState("");
  const [removePin, setRemovePin] = useState(false);

  useEffect(() => {
    if (!state) return;
    const f = state.folder;
    setName(f?.name ?? "");
    setDescription(f?.description ?? "");
    setColor(f?.color ?? FOLDER_COLORS[Math.floor(Math.random() * FOLDER_COLORS.length)] ?? "garnet");
    setIcon(f?.icon ?? "mic");
    setParent(f?.parentId ?? state.parentId ?? ROOT);
    setPin("");
    setRemovePin(false);
  }, [state]);

  // A folder can't be moved inside itself or its own subfolders.
  const blocked = new Set<string>();
  if (editing) {
    const walk = (id: string) => {
      blocked.add(id);
      lib.folders.filter((f) => f.parentId === id).forEach((f) => walk(f.id));
    };
    walk(editing.id);
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Give your folder a name.");
      return;
    }
    if (pin && !/^\d{4,8}$/.test(pin)) {
      toast.error("PIN must be 4–8 digits.");
      return;
    }
    const pinHash = pin ? await sha256(`her-voice:${pin}`) : removePin ? null : (editing?.pinHash ?? null);
    const data = {
      name: name.trim(),
      description: description.trim(),
      color,
      icon,
      parentId: parent === ROOT ? null : parent,
      pinHash,
    };
    if (editing) {
      await lib.updateFolder(editing.id, data);
      if (pin) await lib.unlockFolder(editing.id, pin);
      toast.success("Folder updated");
    } else {
      const f = await lib.createFolder(data);
      if (pin) await lib.unlockFolder(f.id, pin);
      toast.success(`Created ${f.name}`);
    }
    onClose();
  };

  return (
    <Dialog open={!!state} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto rounded-3xl sm:max-w-md">
        <DialogHeader className="flex-row items-center gap-3 space-y-0 text-left">
          <FolderBadge folder={{ icon, color, pinHash: pin || (editing?.pinHash && !removePin) ? "x" : null }} size="lg" />
          <DialogTitle className="text-2xl font-medium">{editing ? "Edit folder" : "New folder"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={save} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="folder-name">Name</Label>
            <Input id="folder-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} className="h-11 rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="folder-desc">Description</Label>
            <Input
              id="folder-desc"
              placeholder="Optional"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="h-11 rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {FOLDER_COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  aria-label={c}
                  aria-pressed={color === c}
                  onClick={() => setColor(c)}
                  style={folderColorStyle(c)}
                  className={cn(
                    "size-9 rounded-full bg-[var(--fc)] ring-offset-2 ring-offset-background transition",
                    color === c && "ring-2 ring-foreground",
                  )}
                />
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Icon</Label>
            <div className="grid grid-cols-6 gap-2">
              {FOLDER_ICONS.map((i) => {
                const I = folderIcon(i);
                return (
                  <button
                    type="button"
                    key={i}
                    aria-label={i}
                    aria-pressed={icon === i}
                    onClick={() => setIcon(i)}
                    className={cn(
                      "inline-flex aspect-square items-center justify-center rounded-xl border transition",
                      icon === i ? "border-primary bg-accent text-accent-foreground" : "hover:bg-muted",
                    )}
                  >
                    <I className="size-5" />
                  </button>
                );
              })}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Inside</Label>
            <Select value={parent} onValueChange={setParent}>
              <SelectTrigger className="h-11 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ROOT}>Top level</SelectItem>
                {lib.folders
                  .filter((f) => !blocked.has(f.id))
                  .map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {lib.folderPath(f.id).map((p) => p.name).join(" / ")}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 rounded-2xl bg-muted/60 p-4">
            <Label htmlFor="folder-pin" className="flex items-center gap-2">
              <Lock className="size-4" /> {editing?.pinHash && !removePin ? "Change PIN" : "Protect with a PIN"}
            </Label>
            <Input
              id="folder-pin"
              inputMode="numeric"
              type="password"
              autoComplete="new-password"
              placeholder="4–8 digits (optional)"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
              className="h-11 rounded-xl bg-card"
            />
            {editing?.pinHash && (
              <button
                type="button"
                onClick={() => {
                  setRemovePin((v) => !v);
                  setPin("");
                }}
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
              >
                <Unlock className="size-3.5" /> {removePin ? "Keep the PIN" : "Remove PIN"}
              </button>
            )}
          </div>
          <Button type="submit" variant="hero" size="lg" className="w-full">
            {editing ? "Save changes" : "Create folder"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
