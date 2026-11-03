import { Link } from "@tanstack/react-router";
import { Heart, Home, Library, ListMusic, Settings } from "lucide-react";

const ITEMS = [
  { to: "/", label: "Home", icon: Home },
  { to: "/library", label: "Library", icon: Library },
  { to: "/playlists", label: "Playlists", icon: ListMusic },
  { to: "/favorites", label: "Favorites", icon: Heart },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function BottomNav() {
  return (
    <nav aria-label="Main" className="pointer-events-auto border-t glass pb-safe">
      <ul className="mx-auto grid max-w-2xl grid-cols-5">
        {ITEMS.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <Link
              to={to}
              activeOptions={{ exact: to === "/" }}
              className="group flex h-16 flex-col items-center justify-center gap-1 text-muted-foreground transition-colors data-[status=active]:text-primary"
            >
              <span className="inline-flex h-7 w-12 items-center justify-center rounded-full transition-colors group-data-[status=active]:bg-accent">
                <Icon className="size-[20px]" strokeWidth={2} />
              </span>
              <span className="text-[0.68rem] font-semibold">{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
