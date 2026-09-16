import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronDown, Menu } from "lucide-react";
import { useState } from "react";
import { Wordmark } from "@/components/mark";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type Item = { to: string; label: string; note: string };

const FLOOR: Item[] = [
  { to: "/app/inbox", label: "Inbox", note: "Operator home. Thread, next action, Send." },
  { to: "/app/appointments", label: "Appointments", note: "The Saturday board." },
  { to: "/app/intel", label: "Intel", note: "Gong, for the floor." },
  { to: "/app/pipeline", label: "Pipeline", note: "Every open deal, one kanban." },
  { to: "/app/inventory", label: "Inventory", note: "Live lot feed. Sold stays sold." },
  { to: "/app/sequences", label: "Sequences", note: "Setter cadences. Never past opt-out." },
  { to: "/app/team", label: "Team", note: "Who is ahead. Healthy competition." },
  { to: "/desk", label: "Desk", note: "Language / path. EN, ES, VI, AR." },
];

const LEADERSHIP: Item[] = [
  { to: "/app/admin", label: "Admin", note: "Floor board. Every open thread." },
  { to: "/app/handoffs", label: "Handoffs", note: "Closer packets. F&I and GSM." },
  { to: "/review", label: "Merge review", note: "What ported. What we will not ship." },
  { to: "/compare", label: "vs the field", note: "Better, worse, or the same." },
  { to: "/spot", label: "Spot agents", note: "HITL sidecar. Copy, never auto-type." },
];

const OWNERSHIP: Item[] = [
  { to: "/app/analytics", label: "Owner", note: "Impact, gates, RAI scorecard with floor plays." },
  { to: "/impact", label: "Before & after", note: "One rural Ford floor. Pessimistic math." },
  { to: "/leavebehind", label: "Tyler & Kyle", note: "The one-pager for the walk-through." },
  { to: "/design", label: "Design", note: "Curiosity. Not a ship vote." },
];

function pathIn(pathname: string, items: Item[]) {
  return items.some((i) => pathname === i.to || pathname.startsWith(`${i.to}/`));
}

export function SiteNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const floorOn = pathIn(pathname, FLOOR);
  const leadOn = pathIn(pathname, LEADERSHIP);
  const ownOn = pathIn(pathname, OWNERSHIP);
  const priceOn = pathname === "/pricing";

  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4 lg:px-5">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
        >
          <Menu className="size-5" />
        </Button>
        <Link to="/" className="shrink-0">
          <Wordmark />
        </Link>

        <nav className="ml-4 hidden items-center gap-1 lg:flex">
          <PersonaMenu label="Sales floor" items={FLOOR} active={floorOn} />
          <PersonaMenu label="Leadership" items={LEADERSHIP} active={leadOn} />
          <PersonaMenu label="Ownership" items={OWNERSHIP} active={ownOn} />
          <Link
            to="/pricing"
            className={cn(
              "inline-flex h-11 items-center px-3 text-sm",
              priceOn ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            Pricing
          </Link>
        </nav>

        <div className="ml-auto">
          <Button asChild size="sm">
            <Link to="/pilot">Request a pilot</Link>
          </Button>
        </div>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="flex flex-col p-4">
          <Wordmark />
          <div className="mt-6 flex-1 overflow-y-auto">
            <MobileGroup title="Sales floor" items={FLOOR} pathname={pathname} onGo={() => setOpen(false)} />
            <MobileGroup title="Leadership" items={LEADERSHIP} pathname={pathname} onGo={() => setOpen(false)} />
            <MobileGroup title="Ownership" items={OWNERSHIP} pathname={pathname} onGo={() => setOpen(false)} />
            <Link
              to="/pricing"
              onClick={() => setOpen(false)}
              className={cn(
                "mt-2 flex h-11 items-center rounded-sm px-3 text-sm",
                priceOn ? "bg-accent text-foreground" : "text-muted-foreground",
              )}
            >
              Pricing
            </Link>
          </div>
          <Button asChild className="mt-4">
            <Link to="/pilot" onClick={() => setOpen(false)}>
              Request a pilot
            </Link>
          </Button>
        </SheetContent>
      </Sheet>
    </header>
  );
}

function PersonaMenu({ label, items, active }: { label: string; items: Item[]; active: boolean }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex h-11 items-center gap-1 rounded-sm px-3 text-sm",
            active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {label}
          <ChevronDown className="size-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-72 p-1.5">
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        {items.map((item) => (
          <DropdownMenuItem key={item.to} asChild className="items-start">
            <Link to={item.to} className="flex flex-col items-start gap-0.5 py-2">
              <span>{item.label}</span>
              <span className="text-[11px] leading-snug text-muted-foreground">{item.note}</span>
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MobileGroup({
  title,
  items,
  pathname,
  onGo,
}: {
  title: string;
  items: Item[];
  pathname: string;
  onGo: () => void;
}) {
  return (
    <div className="mb-4">
      <p className="px-3 pb-1 text-[10px] tracking-wide text-muted-foreground uppercase">{title}</p>
      {items.map((item) => {
        const on = pathname === item.to || pathname.startsWith(`${item.to}/`);
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onGo}
            className={cn(
              "flex min-h-11 flex-col justify-center rounded-sm px-3 py-2",
              on ? "bg-accent text-foreground" : "text-foreground",
            )}
          >
            <span className="text-sm">{item.label}</span>
            <span className="text-[11px] text-muted-foreground">{item.note}</span>
          </Link>
        );
      })}
    </div>
  );
}
