export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: string; // Emoji / Icon identifier
  badge?: string;
  isPrimary?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Command Center',
    href: '/',
    icon: '⚡',
  },
  {
    id: 'capture',
    label: 'Quick Capture',
    href: '/capture',
    icon: '📥',
  },
  {
    id: 'notes',
    label: 'Notes & Concepts',
    href: '/notes',
    icon: '📝',
  },
  {
    id: 'projects',
    label: 'Projects',
    href: '/projects',
    icon: '📁',
  },
  {
    id: 'tasks',
    label: 'Tasks',
    href: '/tasks',
    icon: '✅',
  },
  {
    id: 'trash',
    label: 'Trash',
    href: '/trash',
    icon: '🗑️',
  },
];
