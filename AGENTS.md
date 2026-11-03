<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Her Voice architecture
- All user data (audio blobs + metadata) lives in IndexedDB via `src/lib/hv/db.ts`; there is no backend. Why: offline-first, private-by-design requirement.
- `LibraryProvider` (src/lib/hv/library.tsx) is the only writer to IndexedDB; components call its actions. Why: keeps in-memory state and storage in sync.
- `PlayerProvider` owns one shared HTMLAudioElement; current time lives in a separate context (`usePlayerTime`). Why: avoids re-rendering every page on each time update.
- Pure playback rules (repeat/shuffle/resume/fade) live in `src/lib/hv/playback-modes.ts` with tests. Why: rules are testable without a browser.
- Global dialogs (import, audio actions, folder editor) are hosted once in `UIProvider` and opened via `useUI()`. Why: avoids one dialog instance per list row.
- Folder colors are stored as palette keys and rendered through `--folder-*` CSS tokens. Why: user data stays theme-aware.
- Manifest-only install (no service worker). Why: SW offline caching needs a separate guarded setup.
