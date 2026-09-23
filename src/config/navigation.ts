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
    id: 'today',
    label: 'Today',
    href: '/today',
    icon: '🌅',
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
    id: 'goals',
    label: 'Goals',
    href: '/goals',
    icon: '🎯',
  },
  {
    id: 'finance',
    label: 'Finance',
    href: '/finance',
    icon: '💰',
  },
  {
    id: 'reports',
    label: 'Reports',
    href: '/reports',
    icon: '📊',
  },
  {
    id: 'calendar',
    label: 'Calendar',
    href: '/calendar',
    icon: '📅',
  },
  {
    id: 'workspaces',
    label: 'Workspaces',
    href: '/workspaces',
    icon: '🏢',
  },
  {
    id: 'security',
    label: 'Security',
    href: '/security',
    icon: '🔒',
  },
  {
    id: 'work',
    label: 'Work',
    href: '/work',
    icon: '💼',
  },
  {
    id: 'skills',
    label: 'Skills',
    href: '/skills',
    icon: '🧠',
  },
  {
    id: 'journal',
    label: 'Journal',
    href: '/journal',
    icon: '📔',
  },
  {
    id: 'habits',
    label: 'Habits',
    href: '/habits',
    icon: '🔁',
  },
  {
    id: 'archives',
    label: 'Archives',
    href: '/archives',
    icon: '🗄️',
  },
  {
    id: 'export',
    label: 'Export',
    href: '/export',
    icon: '📤',
  },
  {
    id: 'trash',
    label: 'Trash',
    href: '/trash',
    icon: '🗑️',
  },
];
