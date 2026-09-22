export type EntityType =
  | 'capture'
  | 'note'
  | 'project'
  | 'task'
  | 'goal'
  | 'learning'
  | 'work'
  | 'skill'
  | 'journal'
  | 'habit';

export type EntityRef = {
  entityType: EntityType;
  entityId: string;
};

export interface CoreMetadata {
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}
