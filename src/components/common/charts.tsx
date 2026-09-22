'use client';

export interface BarDatum {
  label: string;
  value: number;
}

function niceMax(value: number): number {
  if (value <= 0) return 1;
  const mag = 10 ** Math.floor(Math.log10(value));
  const norm = value / mag;
  if (norm <= 1) return mag;
  if (norm <= 2) return 2 * mag;
  if (norm <= 5) return 5 * mag;
  return 10 * mag;
}

/** Minimal responsive bar chart (pure SVG). Values may be negative (net flow). */
export function BarChart({
  data,
  height = 160,
  ariaLabel,
}: {
  data: BarDatum[];
  height?: number;
  ariaLabel: string;
}) {
  const W = 560;
  const H = height;
  const PAD = 8;
  const maxPos = niceMax(Math.max(0, ...data.map((d) => d.value)));
  const maxNeg = niceMax(Math.max(0, ...data.map((d) => -Math.min(0, d.value))));
  const total = maxPos + maxNeg;
  const zeroY = PAD + ((H - PAD * 2) * maxPos) / total;
  const n = Math.max(1, data.length);
  const slot = (W - PAD * 2) / n;
  const barW = Math.min(28, slot * 0.55);

  if (data.every((d) => d.value === 0)) {
    return (
      <p className="text-xs text-muted-foreground py-6 text-center" role="img" aria-label={ariaLabel}>
        No data in this period.
      </p>
    );
  }

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={ariaLabel}
      className="w-full"
      style={{ height }}
    >
      <line x1={PAD} y1={zeroY} x2={W - PAD} y2={zeroY} stroke="currentColor" className="text-border" strokeWidth={1} />
      {data.map((d, i) => {
        const h = (Math.abs(d.value) / total) * (H - PAD * 2);
        const x = PAD + slot * i + (slot - barW) / 2;
        const y = d.value >= 0 ? zeroY - h : zeroY;
        const positive = d.value >= 0;
        return (
          <g key={`${d.label}-${i}`}>
            <title>{`${d.label}: ${d.value}`}</title>
            <rect
              x={x}
              y={y}
              width={barW}
              height={Math.max(1.5, h)}
              rx={3}
              className={positive ? 'fill-primary' : 'fill-destructive'}
              opacity={0.85}
            />
            {n <= 14 && (
              <text x={x + barW / 2} y={H - 1} textAnchor="middle" fontSize={8.5} className="fill-muted-foreground">
                {d.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export interface DonutDatum {
  label: string;
  value: number;
}

const DONUT_COLORS = [
  'var(--primary)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'var(--warning)',
  'var(--success)',
];

/** Minimal donut with legend (pure SVG). */
export function DonutChart({
  data,
  ariaLabel,
}: {
  data: DonutDatum[];
  ariaLabel: string;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total <= 0) {
    return (
      <p className="text-xs text-muted-foreground py-6 text-center" role="img" aria-label={ariaLabel}>
        No data in this period.
      </p>
    );
  }
  const R = 54;
  const C = 2 * Math.PI * R;
  const segments = data.reduce<
    Array<{ label: string; frac: number; dash: string; rot: number; color: string }>
  >(
    (acc, d, i) => {
      const frac = total > 0 ? d.value / total : 0;
      const consumed = acc.reduce((s, s2) => s + s2.frac, 0);
      return [
        ...acc,
        {
          label: d.label,
          frac,
          dash: `${Math.max(0, frac * C - 2)} ${C}`,
          rot: consumed * 360,
          color: DONUT_COLORS[i % DONUT_COLORS.length],
        },
      ];
    },
    []
  );

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      <svg viewBox="0 0 140 140" role="img" aria-label={ariaLabel} className="h-32 w-32 shrink-0">
        {segments.map((s) => (
          <circle
            key={s.label}
            cx={70}
            cy={70}
            r={R}
            fill="none"
            stroke={s.color}
            strokeWidth={16}
            strokeDasharray={s.dash}
            transform={`rotate(${s.rot - 90} 70 70)`}
          >
            <title>{`${s.label}: ${Math.round(s.frac * 100)}%`}</title>
          </circle>
        ))}
        <text x={70} y={70} textAnchor="middle" dominantBaseline="central" fontSize={15} fontWeight={700} className="fill-foreground">
          {data.length}
        </text>
      </svg>
      <ul className="space-y-1 text-xs min-w-0">
        {data.slice(0, 7).map((d, i) => (
          <li key={d.label} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 rounded-sm shrink-0"
              style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }}
            />
            <span className="text-muted-foreground truncate">{d.label}</span>
            <span className="ms-auto font-medium text-foreground tabular-nums ps-2">
              {Math.round((d.value / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
