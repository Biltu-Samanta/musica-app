import { useEffect, type ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { LibraryProvider } from "@/lib/hv/library";
import { PlayerProvider, usePlayer } from "@/lib/hv/player";
import { useSettings } from "@/lib/hv/settings";
import { UIProvider } from "./ui-context";
import { BottomNav } from "./BottomNav";
import { MiniPlayer } from "./MiniPlayer";
import { FullPlayer } from "./FullPlayer";
import { Onboarding } from "./Onboarding";

function ThemeSync() {
  const { theme } = useSettings();
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark = theme === "dark" || (theme === "system" && mq.matches);
      document.documentElement.classList.toggle("dark", dark);
      document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#1f1715" : "#f8f3ec");
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [theme]);
  return null;
}

function Frame({ children }: { children: ReactNode }) {
  const player = usePlayer();
  return (
    <>
      <main className={cn("mx-auto min-h-dvh max-w-2xl", player.current ? "pb-44" : "pb-24")}>{children}</main>
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30">
        <div className="mx-auto max-w-2xl">
          <MiniPlayer />
        </div>
        <BottomNav />
      </div>
      <FullPlayer />
      <Onboarding />
    </>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { theme } = useSettings();
  return (
    <LibraryProvider>
      <PlayerProvider>
        <UIProvider>
          <ThemeSync />
          <Frame>{children}</Frame>
          <Toaster position="top-center" theme={theme} richColors={false} />
        </UIProvider>
      </PlayerProvider>
    </LibraryProvider>
  );
}
