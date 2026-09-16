import { useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  ROLODEX_CARDS,
  ROLODEX_DECKS,
  cardById,
  cardsInDeck,
  nextCard,
  type RolodexId,
} from "@/lib/design-rolodex";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function DesignRolodex({
  card,
  onChange,
}: {
  card: RolodexId;
  onChange: (id: RolodexId) => void;
}) {
  const current = cardById(card);
  const index = ROLODEX_CARDS.findIndex((c) => c.id === card);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "TEXTAREA" || tag === "INPUT" || tag === "SELECT") return;
      if (e.key === "ArrowLeft" || e.key === "[") {
        e.preventDefault();
        onChange(nextCard(card, -1));
      }
      if (e.key === "ArrowRight" || e.key === "]") {
        e.preventDefault();
        onChange(nextCard(card, 1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [card, onChange]);

  return (
    <div id="design-rolodex" className="spot-rolo mb-6">
      {ROLODEX_DECKS.map((deck) => (
        <div key={deck.id} className="spot-rolo-deck">
          <p className="spot-rolo-deck-label">
            {deck.label} · {deck.kicker} · {deck.method}
          </p>
          <div className="spot-rolo-tabs" role="tablist" aria-label={deck.kicker}>
            {cardsInDeck(deck.id).map((c) => {
              const active = c.id === card;
              return (
                <button
                  key={c.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-pressed={active}
                  data-card={c.id}
                  onClick={() => onChange(c.id)}
                  className={cn("spot-rolo-tab", active && "is-active")}
                >
                  {c.name}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <article className="spot-rolo-card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="spot-rolo-index">
            DR-{String(index + 1).padStart(2, "0")} / {String(ROLODEX_CARDS.length).padStart(2, "0")} ·{" "}
            {current.deck}
          </p>
          <div className="flex gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-11"
              onClick={() => onChange(nextCard(card, -1))}
              aria-label="Previous card"
            >
              <ChevronLeft className="size-4" />
              Prev
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-11"
              onClick={() => onChange(nextCard(card, 1))}
              aria-label="Next card"
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
          Arrow keys or [ ] to flip. Home and the Now sidecar stay what we ship — these are structurally
          different ways to show the same desk, not a vote.
        </p>
      </article>
    </div>
  );
}
