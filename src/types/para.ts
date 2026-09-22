import type { EntityType } from './domain';

/**
 * PARA-style organization buckets for Shefo OS.
 *
 * - `inbox`: unprocessed captures awaiting triage (staging, NOT storage).
 * - `projects`: outcome-oriented initiatives with active effort.
 * - `resources`: reference knowledge (notes) available on demand.
 * - `archives`: completed/paused work kept for reference, still restorable.
 *
 * Trash is intentionally NOT a bucket: deletion state is governed exclusively
 * by `deleted_at` semantics in `src/types/lifecycle.ts`. Archive ≠ Trash.
 */
export type ParaBucket = 'inbox' | 'projects' | 'resources' | 'archives';

export type ParaPlacement = ParaBucket | 'trash';

export interface ParaBucketMeta {
  id: ParaBucket;
  label: string;
  description: string;
  icon: string;
}

export const PARA_BUCKETS: ParaBucketMeta[] = [
  {
    id: 'inbox',
    label: 'Inbox',
    description: 'Unprocessed captures awaiting triage into projects or resources.',
    icon: '📥',
  },
  {
    id: 'projects',
    label: 'Projects',
    description: 'Active initiatives with outcomes and linked actions.',
    icon: '📁',
  },
  {
    id: 'resources',
    label: 'Resources',
    description: 'Notes and concepts available on demand.',
    icon: '📝',
  },
  {
    id: 'archives',
    label: 'Archives',
    description: 'Paused or completed work kept for reference. Restorable, never auto-deleted.',
    icon: '🗄️',
  },
];

/**
 * Classifies an entity into its PARA placement.
 * Any soft-deleted entity (`deletedAt !== null`) is `trash`, regardless of
 * status — archival state and deletion state never mix.
 */
export function classifyPara(
  entityType: EntityType,
  status: string | null | undefined,
  deletedAt: string | null
): ParaPlacement {
  if (deletedAt !== null) {
    return 'trash';
  }
  if (status === 'archived' || status === 'paused') {
    return 'archives';
  }
  switch (entityType) {
    case 'capture':
      return status === 'processed' ? 'resources' : 'inbox';
    case 'project':
      return 'projects';
    case 'note':
    case 'learning':
      return 'resources';
    case 'task':
    case 'goal':
      return 'projects';
  }
}
