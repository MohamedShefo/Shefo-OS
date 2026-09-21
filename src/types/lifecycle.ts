/**
 * Standardized lifecycle states for Shefo OS entities.
 * Default soft-deletion retention is 30 days before permanent deletion capability.
 */
export type EntityLifecycleState =
  | 'active'
  | 'archived'
  | 'trash'
  | 'restored'
  | 'deleted';

export const TRASH_RETENTION_DAYS = 30;

export interface LifecycleMetadata {
  deleted_at: string | null;
  is_archived?: boolean;
}

/**
 * Determines current lifecycle state based on deleted_at timestamp and entity status.
 */
export function getLifecycleState(
  deletedAt: string | null,
  status?: string | null
): EntityLifecycleState {
  if (deletedAt !== null) {
    return 'trash';
  }
  if (status === 'archived') {
    return 'archived';
  }
  return 'active';
}
