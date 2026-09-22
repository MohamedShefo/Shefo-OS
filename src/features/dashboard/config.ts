export const DASHBOARD_WIDGET_IDS = [
  'tasks',
  'projects',
  'notes',
  'captures',
  'habits',
  'journal',
  'timer',
  'goals',
  'finance',
  'activity',
] as const;

export type DashboardWidgetId = (typeof DASHBOARD_WIDGET_IDS)[number];
