import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  subtitle,
  back,
  action,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  back?: boolean;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex items-end justify-between gap-3 px-5 pt-6 pb-4", className)}>
      <div className="min-w-0">
        {back && (
          <button
            onClick={() => history.back()}
            className="-ml-1 mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="size-4" /> Back
          </button>
        )}
        <h1 className="truncate text-[2rem] leading-tight font-medium">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-1">{action}</div>}
    </header>
  );
}

const SEE_ALL = "inline-flex items-center text-sm text-muted-foreground hover:text-foreground";

type SeeAllTarget = "/library" | "/activity" | "/favorites" | "/library/folders";

export function SectionTitle({ children, to, action }: { children: ReactNode; to?: SeeAllTarget; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between px-5">
      <h2 className="text-xl font-medium">{children}</h2>
      {to ? (
        to === "/library/folders" ? (
          <Link to="/library" search={{ tab: "folders" }} className={SEE_ALL}>
            See all <ChevronRight className="size-4" />
          </Link>
        ) : to === "/library" ? (
          <Link to="/library" search={{ tab: "all" }} className={SEE_ALL}>
            See all <ChevronRight className="size-4" />
          </Link>
        ) : (
          <Link to={to} className={SEE_ALL}>
            See all <ChevronRight className="size-4" />
          </Link>
        )
      ) : (
        action
      )}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
  className,
}: {
  icon: ReactNode;
  title: string;
  body?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-5 flex flex-col items-center rounded-3xl border border-dashed px-6 py-10 text-center", className)}>
      <div className="mb-4 inline-flex size-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground [&_svg]:size-6">
        {icon}
      </div>
      <h3 className="text-lg font-medium">{title}</h3>
      {body && <p className="mt-1 max-w-xs text-sm text-muted-foreground">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Chip({
  active,
  children,
  onClick,
}: {
  active?: boolean | undefined;
  children: ReactNode;
  onClick?: (() => void) | undefined;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors",
        active
          ? "border-transparent bg-foreground text-background"
          : "bg-card text-foreground hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}
