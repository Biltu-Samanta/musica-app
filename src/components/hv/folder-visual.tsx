import {
  Briefcase,
  Coffee,
  GraduationCap,
  Heart,
  Home,
  Lock,
  Mic,
  Moon,
  Music,
  Sparkles,
  Star,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import type { Folder } from "@/lib/hv/types";

export const FOLDER_ICON_MAP: Record<string, LucideIcon> = {
  users: Users,
  home: Home,
  graduation: GraduationCap,
  user: User,
  star: Star,
  heart: Heart,
  mic: Mic,
  music: Music,
  briefcase: Briefcase,
  sparkles: Sparkles,
  moon: Moon,
  coffee: Coffee,
};

export function folderIcon(name: string): LucideIcon {
  return FOLDER_ICON_MAP[name] ?? Mic;
}

export function folderColorStyle(color: string): CSSProperties {
  return { "--fc": `var(--folder-${color}, var(--primary))` } as CSSProperties;
}

export function FolderBadge({
  folder,
  className,
  size = "md",
}: {
  folder: Pick<Folder, "icon" | "color" | "pinHash">;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const Icon = folderIcon(folder.icon);
  const dims = size === "sm" ? "size-8 rounded-lg" : size === "lg" ? "size-14 rounded-2xl" : "size-11 rounded-xl";
  const icon = size === "sm" ? "size-4" : size === "lg" ? "size-7" : "size-5";
  return (
    <span
      style={folderColorStyle(folder.color)}
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center bg-[color-mix(in_oklch,var(--fc)_18%,transparent)] text-[var(--fc)]",
        dims,
        className,
      )}
    >
      <Icon className={icon} strokeWidth={2} />
      {folder.pinHash && (
        <span className="absolute -right-1 -bottom-1 inline-flex size-4 items-center justify-center rounded-full bg-foreground text-background">
          <Lock className="size-2.5" />
        </span>
      )}
    </span>
  );
}
