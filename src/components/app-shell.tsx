import { Link, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  Calendar,
  FileText,
  Inbox,
  LineChart,
  Menu,
  MessageSquare,
  Radio,
  Sparkles,
  Users,
  ShieldCheck,
  Warehouse,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Mark } from "@/components/mark";
import { LiveInquiryButton } from "@/components/copilot-panels";
import { GuidedTour, TourButton } from "@/components/guided-tour";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { unreadForRep } from "@/lib/package";
import { DEALER } from "@/lib/seed";
import { TEAM, useApp } from "@/lib/store";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/format";

const NAV: { to: string; label: string; icon: typeof Inbox; tour?: string; group: string }[] = [
  { to: "/app/inbox", label: "Inbox", icon: Inbox, group: "Floor" },
  { to: "/app/handoffs", label: "Handoffs", icon: FileText, group: "Floor" },
  { to: "/app/appointments", label: "Appointments", icon: Calendar, group: "Floor" },
  { to: "/app/sequences", label: "Sequences", icon: Radio, group: "Floor" },
  { to: "/app/intel", label: "Intel", icon: Sparkles, group: "Floor" },
  { to: "/app/pipeline", label: "Pipeline", icon: Activity, group: "Floor" },
  { to: "/app/inventory", label: "Inventory", icon: Warehouse, group: "Floor" },
  { to: "/app/team", label: "Team", icon: Users, group: "Floor" },
  { to: "/app/admin", label: "Admin", icon: ShieldCheck, group: "Leadership" },
  { to: "/app/analytics", label: "Owner", icon: LineChart, tour: "owner", group: "Leadership" },
];

const MOBILE = [
  { to: "/app/inbox", label: "Inbox", icon: Inbox },
  { to: "/app/appointments", label: "Appts", icon: Calendar },
  { to: "/app/intel", label: "Intel", icon: Sparkles },
  { to: "/app/admin", label: "Admin", icon: ShieldCheck },
  { to: "/app/analytics", label: "Owner", icon: LineChart },
];

const DESK: Record<string, string> = {
  sales: "r_jordan",
  owner: "r_morgan",
  admin: "r_morgan",
  finance: "r_dana",
};

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const search = useRouterState({ select: (s) => s.location.search as { as?: string } });
  const currentRepId = useApp((s) => s.currentRepId);
  const setRep = useApp((s) => s.setRep);
  const resetDemo = useApp((s) => s.resetDemo);
  const threads = useApp((s) => s.threads);
  const packages = useApp((s) => s.packages);
  const [open, setOpen] = useState(false);
  const [tour, setTour] = useState(false);
  const rep = TEAM.find((r) => r.id === currentRepId) ?? TEAM[0];
  const waiting = threads.filter((t) => {
    const last = t.messages[t.messages.length - 1];
    return last?.who === "customer" && !t.dnc;
  }).length;
  const unreadPkgs = unreadForRep(packages, currentRepId);

  useEffect(() => {
    const id = search?.as ? DESK[search.as] : undefined;
    if (id && id !== currentRepId) setRep(id);
  }, [search?.as, currentRepId, setRep]);

  const NavLinks = ({ onGo }: { onGo?: () => void }) => {
    const groups = ["Floor", "Leadership"] as const;
    return (
      <nav className="flex flex-col gap-0.5">
        {groups.map((group) => (
          <div key={group} className="mb-3">
            <p className="px-3 pb-1 text-[10px] tracking-wide text-muted-foreground uppercase">{group}</p>
            {NAV.filter((item) => item.group === group).map((item) => {
              const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={onGo}
                  data-tour={item.tour}
                  className={cn(
                    "flex h-10 items-center gap-3 rounded-sm px-3 text-sm",
                    active ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                  )}
                >
                  <Icon className="size-4" />
                  {item.label}
                  {item.to === "/app/inbox" && waiting > 0 && (
                    <span className="ml-auto tabular text-[11px] text-silver">{waiting}</span>
                  )}
                  {item.to === "/app/handoffs" && unreadPkgs > 0 && (
                    <span className="ml-auto tabular text-[11px] text-silver">{unreadPkgs}</span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
        <p className="mt-1 px-3 pb-1 text-[10px] tracking-wide text-muted-foreground uppercase">Company</p>
        <Link
          to="/pricing"
          onClick={onGo}
          className={cn(
            "flex h-9 items-center rounded-sm px-3 text-[13px]",
            pathname === "/pricing" ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
          )}
        >
          Pricing
        </Link>
        <Link
          to="/pilot"
          onClick={onGo}
          className={cn(
            "flex h-9 items-center rounded-sm px-3 text-[13px]",
            pathname === "/pilot" ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
          )}
        >
          Request a pilot
        </Link>
      </nav>
    );
  };

  return (
    <div className="flex min-h-dvh bg-background text-foreground">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-border bg-card lg:flex">
        <div className="flex h-14 items-center gap-2 border-b border-border px-4">
          <Mark className="size-5" />
          <div className="min-w-0">
            <div className="text-sm font-medium leading-none">LotBeacon</div>
            <div className="mt-1 truncate text-[11px] text-muted-foreground">{DEALER.name}</div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <NavLinks />
        </div>
        <div className="border-t border-border p-3">
          <p className="px-2 pb-2 text-[10px] tracking-wide text-muted-foreground uppercase">You are</p>
          <RolePicker />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between gap-3 border-b border-paper/20 bg-paper px-3 py-2 text-ink lg:px-5">
          <p className="min-w-0 truncate text-[12px] leading-tight sm:text-sm">
            Live demo · {DEALER.name} · you are <span className="font-medium">{rep.name}</span>, {rep.title}. Not live customers.
          </p>
          <Link to="/" className="shrink-0 text-[12px] font-medium underline-offset-2 hover:underline">
            Back to Click Here
          </Link>
        </div>
        <header className="flex h-14 items-center gap-2 border-b border-border px-3 lg:px-5">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)} aria-label="Menu">
            <Menu className="size-5" />
          </Button>
          <Link to="/" className="lg:hidden">
            <Mark className="size-5" />
          </Link>
          <div className="hidden min-w-0 flex-1 lg:block">
            <p data-tour="keys" className="truncate text-sm text-muted-foreground">
              {rep.title} · J/K next · E edit · ⌘↵ send · 1/2 slot pair · no autonomous sends
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <TourButton onClick={() => setTour(true)} />
            <span data-tour="live-inquiry">
              <LiveInquiryButton label="Live inquiry" />
            </span>
            <Button
              variant="outline"
              size="sm"
              className="hidden sm:inline-flex"
              onClick={() => {
                resetDemo();
                toast("Reset. Start Riley Grant, then Mike, then Admin huddle.");
              }}
            >
              Reset demo
            </Button>
            <div className="flex size-8 items-center justify-center rounded-full bg-secondary text-[11px] font-medium">
              {initials(rep.name)}
            </div>
          </div>
        </header>
        <main className="min-h-0 flex-1 pb-16 lg:pb-0">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-card lg:hidden">
        {MOBILE.map((item) => {
          const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex min-h-11 flex-col items-center justify-center gap-1 py-2 text-[10px]",
                active ? "text-foreground" : "text-muted-foreground",
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex min-h-11 flex-col items-center justify-center gap-1 py-2 text-[10px] text-muted-foreground"
        >
          <MessageSquare className="size-4" />
          More
        </button>
      </nav>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="flex flex-col p-4">
          <div className="mb-4 flex items-center gap-2">
            <Mark className="size-5" />
            <span className="font-medium">LotBeacon</span>
          </div>
          <NavLinks onGo={() => setOpen(false)} />
          <div className="mt-auto space-y-3 pt-6">
            <RolePicker />
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                resetDemo();
                setOpen(false);
                toast("Reset. Start Riley Grant, then Mike, then Admin huddle.");
              }}
            >
              Reset demo
            </Button>
          </div>
        </SheetContent>
      </Sheet>
      <GuidedTour open={tour} onClose={() => setTour(false)} />
    </div>
  );

  function RolePicker() {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex min-h-11 w-full items-center gap-2 rounded-sm px-2 py-2 text-left hover:bg-accent"
          >
            <span className="flex size-7 items-center justify-center rounded-full bg-secondary text-[10px]">
              {initials(rep.name)}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm">{rep.name}</span>
              <span className="block truncate text-[11px] text-muted-foreground">{rep.title}</span>
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>Switch desk</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {TEAM.map((r) => (
            <DropdownMenuItem key={r.id} onSelect={() => setRep(r.id)}>
              {r.name}
              <span className="ml-auto text-[11px] text-muted-foreground">{r.role.replace("_", " ")}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }
}
