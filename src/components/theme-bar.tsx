import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Check, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { THEMES, type ThemeId, applyTheme, readTheme, writeTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

const ThemeCtx = createContext<{ theme: ThemeId; setTheme: (id: ThemeId) => void }>({
  theme: "spacex",
  setTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeCtx);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>("spacex");

  useEffect(() => {
    const next = readTheme();
    setThemeState(next);
    applyTheme(next);
  }, []);

  const value = useMemo(
    () => ({
      theme,
      setTheme: (id: ThemeId) => {
        setThemeState(id);
        writeTheme(id);
      },
    }),
    [theme],
  );

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

function Pill({ id, className }: { id: ThemeId; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("size-3.5 shrink-0 rounded-full border", `swatch-${id}`, className)}
    />
  );
}

export function ThemeBar() {
  const { theme, setTheme } = useTheme();
  const current = THEMES.find((t) => t.id === theme) ?? THEMES[0];

  return (
    <div className="sticky top-0 z-50 border-b border-border bg-card text-card-foreground">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2 lg:px-5">
        <div className="flex min-h-11 min-w-0 items-center gap-2">
          <span className="shrink-0 text-sm text-muted-foreground">Style</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Interface style"
                className="inline-flex min-h-11 min-w-52 items-center gap-2 rounded-sm border border-border bg-background px-3 text-sm text-foreground"
              >
                <Pill id={current.id} />
                <span className="flex-1 text-left capitalize">{current.label}</span>
                <ChevronDown className="size-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-56">
              {THEMES.map((t) => (
                <DropdownMenuItem key={t.id} onSelect={() => setTheme(t.id)}>
                  <Pill id={t.id} />
                  <span className="flex-1 capitalize">{t.label}</span>
                  {theme === t.id ? <Check className="size-3.5" /> : null}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <p className="hidden min-w-0 flex-1 truncate text-[12px] text-muted-foreground md:block">
          {current.label}: {current.note} Paint is yours. Guardrails are not.
        </p>
      </div>
    </div>
  );
}
