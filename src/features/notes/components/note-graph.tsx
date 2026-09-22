'use client';

import Link from 'next/link';

export interface GraphNeighbor {
  key: string;
  label: string;
  kind: 'note' | 'project' | 'skill' | 'work' | 'task' | 'capture';
  href: string | null;
}

interface NoteGraphProps {
  centerLabel: string;
  neighbors: GraphNeighbor[];
}

const KIND_ICON: Record<GraphNeighbor['kind'], string> = {
  note: '📝',
  project: '📁',
  skill: '🧠',
  work: '💼',
  task: '✅',
  capture: '📥',
};

const W = 560;
const H = 320;
const CX = W / 2;
const CY = H / 2;
const R = 118;

/**
 * Minimal one-hop relationship graph (pure SVG, no dependencies).
 * Shows the current note at the center with its directly linked entities
 * around it. Deeper traversal is intentionally out of scope.
 */
export function NoteGraph({ centerLabel, neighbors }: NoteGraphProps) {
  const shown = neighbors.slice(0, 10);

  if (shown.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        No relationships yet. Link notes, skills, projects, or workplaces to grow this graph.
      </p>
    );
  }

  const angle = (i: number) => (2 * Math.PI * i) / shown.length - Math.PI / 2;
  const pos = (i: number) => ({ x: CX + R * Math.cos(angle(i)), y: CY + R * Math.sin(angle(i)) });

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`Relationship graph for ${centerLabel}`}
      className="w-full max-w-[560px] rounded-xl border border-border bg-card"
    >
      {shown.map((n, i) => {
        const p = pos(i);
        return <line key={`e-${n.key}`} x1={CX} y1={CY} x2={p.x} y2={p.y} stroke="currentColor" className="text-border" strokeWidth={1.5} />;
      })}
      {shown.map((n, i) => {
        const p = pos(i);
        const short = n.label.length > 14 ? `${n.label.slice(0, 14)}…` : n.label;
        const node = (
          <g key={n.key}>
            <circle cx={p.x} cy={p.y} r={22} className="fill-muted stroke-border" strokeWidth={1.5} />
            <text x={p.x} y={p.y + 1} textAnchor="middle" dominantBaseline="central" fontSize={15}>
              {KIND_ICON[n.kind]}
            </text>
            <text x={p.x} y={p.y + 34} textAnchor="middle" fontSize={10} className="fill-muted-foreground">
              {short}
            </text>
          </g>
        );
        return n.href ? (
          <Link key={n.key} href={n.href}>
            {node}
          </Link>
        ) : (
          node
        );
      })}
      <circle cx={CX} cy={CY} r={30} className="fill-primary" />
      <text x={CX} y={CY + 1} textAnchor="middle" dominantBaseline="central" fontSize={18}>
        📝
      </text>
      <text x={CX} y={CY + 44} textAnchor="middle" fontSize={11} fontWeight={600} className="fill-foreground">
        {centerLabel.length > 24 ? `${centerLabel.slice(0, 24)}…` : centerLabel}
      </text>
    </svg>
  );
}
