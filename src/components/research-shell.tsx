import { SiteNav } from "@/components/site-nav";

export function ResearchShell({
  title,
  kicker,
  current: _current,
  children,
}: {
  title: string;
  kicker?: string;
  current: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <SiteNav />
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {kicker ? (
          <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">{kicker}</p>
        ) : null}
        <h1 className="font-display mt-1 text-3xl md:text-4xl">{title}</h1>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
