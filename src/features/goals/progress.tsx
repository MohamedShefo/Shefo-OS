import type { Goal, GoalMilestone } from '@/types/database';

/**
 * Manual progress semantics (no AI):
 * - measurable goal (target_value > 0): current / target, clamped 0–100.
 * - otherwise milestones ratio when milestones exist.
 * - otherwise status-derived (completed/archived = 100, else 0).
 */
export function goalProgress(goal: Goal, milestones: GoalMilestone[]): number {
  const target = Number(goal.target_value);
  if (Number.isFinite(target) && target > 0) {
    const current = Number(goal.current_value) || 0;
    return Math.max(0, Math.min(100, Math.round((current / target) * 100)));
  }
  if (milestones.length > 0) {
    const done = milestones.filter((m) => m.is_done).length;
    return Math.round((done / milestones.length) * 100);
  }
  return goal.status === 'completed' || goal.status === 'archived' ? 100 : 0;
}

export function ProgressBar({ value, label }: { value: number; label?: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      className="h-2 overflow-hidden rounded-full bg-muted"
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? `Progress ${pct} percent`}
    >
      <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${pct}%` }} />
    </div>
  );
}
