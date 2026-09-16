import { useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  SPOT_DECKS,
  SPOT_LOOKS,
  lookById,
  looksInDeck,
  nextLook,
  type SpotLookId,
} from "@/lib/spot-looks";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function SpotRolodex({
  look,
  onChange,
}: {
  look: SpotLookId;
  onChange: (id: SpotLookId) => void;
}) {
  const current = lookById(look);
  const index = SPOT_LOOKS.findIndex((l) => l.id === look);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "TEXTAREA" || tag === "INPUT" || tag === "SELECT") return;
      if (e.key === "ArrowLeft" || e.key === "[") {
        e.preventDefault();
        onChange(nextLook(look, -1));
      }
      if (e.key === "ArrowRight" || e.key === "]") {
        e.preventDefault();
        onChange(nextLook(look, 1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [look, onChange]);

  return (
    <div id="spot-rolodex" className="spot-rolo mb-6">
      {SPOT_DECKS.map((deck) => (
        <div key={deck.id} className="spot-rolo-deck">
          <p className="spot-rolo-deck-label">
            {deck.label} · {deck.kicker}
          </p>
          <div className="spot-rolo-tabs" role="tablist" aria-label={deck.kicker}>
            {looksInDeck(deck.id).map((l) => {
              const active = l.id === look;
              return (
                <button
                  key={l.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-pressed={active}
                  data-look={l.id}
                  onClick={() => onChange(l.id)}
                  className={cn("spot-rolo-tab", active && "is-active")}
                >
                  {l.name}
                  {l.shipped ? <span className="spot-rolo-live">Live</span> : null}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <article className="spot-rolo-card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="spot-rolo-index">
            LB-{String(index + 1).padStart(2, "0")} / {String(SPOT_LOOKS.length).padStart(2, "0")} ·{" "}
            {current.deck === "surface" ? "surface" : "architecture"}
          </p>
          <div className="flex gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-11"
              onClick={() => onChange(nextLook(look, -1))}
              aria-label="Previous look"
            >
              <ChevronLeft className="size-4" />
              Prev
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-11"
              onClick={() => onChange(nextLook(look, 1))}
              aria-label="Next look"
            >
              Next
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
        <p className="spot-rolo-kicker mt-3">{current.kicker}</p>
        <h2 className="spot-rolo-title">{current.name}</h2>
        <p className="spot-rolo-thesis">{current.thesis}</p>
        <p className="spot-rolo-hint">
          Arrow keys or [ ] to flip the catalog. Copy still copies. Auto-type still aborts. Now is what we
          ship — the rest is curiosity, not a vote.
        </p>
      </article>
    </div>
  );
}
