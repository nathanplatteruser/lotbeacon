import { cn } from "@/lib/utils";

function toneClass(trend: string) {
  return trend === "up" ? "text-ok" : trend === "down" ? "text-destructive" : "text-warn";
}

function stroke(trend: string) {
  return trend === "up" ? "var(--color-ok)" : trend === "down" ? "var(--color-destructive)" : "var(--color-warn)";
}

export function Sparkline({
  series,
  trend = "flat",
  className,
  nums = false,
  refs = false,
  width = 88,
  height = 28,
  maxPoints = 18,
  slots,
}: {
  series: number[];
  trend?: "up" | "flat" | "down" | string;
  className?: string;
  nums?: boolean;
  refs?: boolean;
  width?: number;
  height?: number;
  maxPoints?: number;
  /** Reserved x-axis length so each Send fills the next tick instead of rescaling. */
  slots?: number;
}) {
  const raw = series.length ? series : [0];
  const cap = Math.max(2, maxPoints);
  const s = raw.slice(-cap);
  const nSlots = Math.max(2, slots && slots > 0 ? Math.min(slots, cap) : s.length, s.length);
  const padT = nums ? 13 : refs ? 8 : 4;
  const padB = refs ? 12 : 6;
  const padX = nums || refs ? 16 : 6;
  const W = width - padX * 2;
  const H = Math.max(8, height - padT - padB);
  const x = (i: number) => padX + (i * W) / (nSlots - 1);
  const y = (v: number) => padT + H - (Math.max(0, Math.min(100, v)) / 100) * H;
  const n = s.length;
  const pts = s.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const lastX = x(Math.max(0, n - 1));
  const area = n
    ? `${x(0).toFixed(1)},${(padT + H).toFixed(1)} ${pts} ${lastX.toFixed(1)},${(padT + H).toFixed(1)}`
    : "";
  const col = stroke(trend);
  const labelEvery = n > 8 ? Math.ceil(n / 6) : 1;
  const last = n - 1;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={cn("sparkline shrink-0", className)}
      role="img"
      aria-label={s.join(" → ")}
    >
      <title>{s.join(" → ")}</title>
      {refs ? (
        <>
          <line x1={padX} y1={padT} x2={width - padX} y2={padT} stroke="currentColor" className="text-muted-foreground/40" strokeWidth="1" />
          <line x1={padX} y1={padT + H} x2={width - padX} y2={padT + H} stroke="currentColor" className="text-muted-foreground/35" strokeWidth="1" />
          <text x="2" y={padT + 3} fontSize="7" className="fill-muted-foreground">
            100
          </text>
          <text x="2" y={padT + H + 3} fontSize="7" className="fill-muted-foreground">
            0
          </text>
        </>
      ) : (
        <line x1={padX} y1={padT + H} x2={width - padX} y2={padT + H} stroke="currentColor" className="text-muted-foreground/25" strokeWidth="1" />
      )}
      {n > 1 ? <polygon fill={col} fillOpacity="0.16" points={area} /> : null}
      {n > 1 ? (
        <polyline fill="none" stroke={col} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" points={pts} />
      ) : null}
      {s.map((v, i) => {
        const showNum = nums && (i === last || i === 0 || i % labelEvery === 0);
        const isLast = i === last;
        return (
          <g key={`pt-${i}-${v}`}>
            <circle
              cx={x(i)}
              cy={y(v)}
              r={isLast ? 3.4 : nums ? 2.6 : 2.1}
              fill={col}
              className={isLast ? "spark-last" : undefined}
            />
            {showNum ? (
              <text
                x={x(i)}
                y={Math.max(9, y(v) - 6)}
                textAnchor="middle"
                fontSize="8"
                fontWeight="700"
                fill={col}
              >
                {v}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

export function SparkRail({
  series,
  trend = "flat",
  score,
  label,
  slots,
  delta,
}: {
  series: number[];
  trend?: "up" | "flat" | "down" | string;
  score: number;
  label: string;
  slots?: number;
  delta?: number;
}) {
  return (
    <span className={cn("mt-1 flex items-end gap-2", toneClass(trend))}>
      <Sparkline series={series} trend={trend} nums refs width={200} height={60} maxPoints={18} slots={slots} />
      <span className="pb-1 text-[11px] leading-tight">
        <span className="block tabular font-medium">{score}% show</span>
        {typeof delta === "number" && delta !== 0 ? (
          <span className="block tabular">
            {delta > 0 ? `+${delta}` : delta} this exchange
          </span>
        ) : null}
        <span className="block text-muted-foreground">{label}</span>
      </span>
    </span>
  );
}
