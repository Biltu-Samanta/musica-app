import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { ACCEPT_ATTR, isSupportedAudio } from "@/lib/hv/import";
import type { Folder } from "@/lib/hv/types";
import { ImportDialog } from "./ImportDialog";
import { AudioActionDialogs, type AudioAction } from "./AudioActionDialogs";
import { FolderEditor } from "./FolderEditor";

interface UIValue {
  /** Must be called from a click handler so the file picker can open. */
  openImport: (defaultFolderId?: string | null) => void;
  importFiles: (files: File[], defaultFolderId?: string | null) => void;
  openAudioAction: (kind: AudioAction, audioId: string) => void;
  openFolderEditor: (opts: { folder?: Folder; parentId?: string | null }) => void;
}

const UIContext = createContext<UIValue | null>(null);

export function UIProvider({ children }: { children: ReactNode }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingFolder = useRef<string | null>(null);
  const [importState, setImportState] = useState<{ files: File[]; folderId: string | null } | null>(null);
  const [action, setAction] = useState<{ kind: AudioAction; id: string } | null>(null);
  const [folderEdit, setFolderEdit] = useState<{ folder?: Folder; parentId?: string | null } | null>(null);

  const importFiles = useCallback((files: File[], folderId: string | null = null) => {
    const ok = files.filter(isSupportedAudio);
    const skipped = files.length - ok.length;
    if (skipped) toast.error(`${skipped} file${skipped > 1 ? "s aren't" : " isn't"} a supported audio format.`);
    if (ok.length) setImportState({ files: ok, folderId });
  }, []);

  const value: UIValue = {
    openImport(folderId = null) {
      pendingFolder.current = folderId;
      inputRef.current?.click();
    },
    importFiles,
    openAudioAction: (kind, id) => setAction({ kind, id }),
    openFolderEditor: (opts) => setFolderEdit(opts),
  };

  return (
    <UIContext.Provider value={value}>
      {children}
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPT_ATTR}
        className="hidden"
        aria-hidden
        tabIndex={-1}
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = "";
          if (files.length) importFiles(files, pendingFolder.current);
        }}
      />
      <ImportDialog state={importState} onClose={() => setImportState(null)} />
      <AudioActionDialogs action={action} onClose={() => setAction(null)} />
      <FolderEditor state={folderEdit} onClose={() => setFolderEdit(null)} />
    </UIContext.Provider>
  );
}

export function useUI() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("useUI must be used inside UIProvider");
  return ctx;
}
