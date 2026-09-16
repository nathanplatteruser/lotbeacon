import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { OM_PIPELINE, OM_SHOTS } from "@/lib/design-rolodex";
import { cn } from "@/lib/utils";

export function OpenMontageReel() {
  const [shot, setShot] = useState<(typeof OM_SHOTS)[number]["id"]>("lot");
  const videoRef = useRef<HTMLVideoElement>(null);
  const current = OM_SHOTS.find((s) => s.id === shot) ?? OM_SHOTS[0];

  useEffect(() => {
    if (shot === "draft") {
      videoRef.current?.play().catch(() => undefined);
    }
  }, [shot]);

  function select(id: (typeof OM_SHOTS)[number]["id"]) {
    setShot(id);
    requestAnimationFrame(() => {
      videoRef.current?.play().catch(() => undefined);
    });
  }

  function playReel() {
    const start = () => {
      const el = videoRef.current;
      if (!el) return;
      const onEnded = () => {
        el.removeEventListener("ended", onEnded);
        setShot("draft");
      };
      el.addEventListener("ended", onEnded);
      el.currentTime = 0;
      el.play().catch(() => undefined);
    };
    if (shot !== "lot") {
      setShot("lot");
      window.setTimeout(start, 160);
      return;
    }
    start();
  }

  return (
    <article className="om-reel" data-pipeline="cinematic">
      <header className="om-head">
        <p className="om-kicker">OpenMontage · cinematic · VO none · palette: lot-light / paper / ink</p>
        <h2 className="om-title">A person still sends</h2>
        <ol className="om-pipe" aria-label="Production pipeline">
          {OM_PIPELINE.map((s) => (
            <li key={s}>{s.replaceAll("_", " ")}</li>
          ))}
        </ol>
      </header>

      <figure className="om-stage">
        <video
          key={current.src}
          ref={videoRef}
          className="om-video"
          poster={current.poster}
          controls
          playsInline
          preload="metadata"
          aria-label={`${current.title} · ${current.dur}`}
        >
          <source src={current.src} type="video/mp4" />
        </video>
        <figcaption>
          Shot {current.n} · {current.title} · {current.dur}. {current.slate}
        </figcaption>
      </figure>

      <div className="om-shots">
        {OM_SHOTS.map((s) => (
          <button
            key={s.id}
            type="button"
            data-shot={s.id}
            className={cn("om-shot", shot === s.id && "is-on")}
            onClick={() => select(s.id)}
          >
            <img src={s.poster} alt="" width={320} height={180} />
            <span>
              {s.n} · {s.title}
            </span>
            <em>{s.dur}</em>
          </button>
        ))}
      </div>

      <div className="om-slate">
        <p>
          <strong>Director notes.</strong> No trailer grammar. No neon. Hands, not faces. The paper is the
          source of truth; the phone is only Send. Title cards instead of voiceover.
        </p>
        <Button type="button" size="sm" onClick={playReel} id="om-play-reel">
          Play the reel
        </Button>
      </div>
    </article>
  );
}
