export type NavGroup = 'Foundation' | 'Primitives' | 'Display' | 'Feedback' | 'Domain Patterns';

export interface NavItem {
  readonly label: string;
  readonly id: string;
  readonly group: NavGroup;
}

// Each id maps to a lazy-loaded part in preview-screen.tsx.
export const NAV_ITEMS: readonly NavItem[] = [
  // Foundation
  { label: 'Palette', id: 'palette', group: 'Foundation' },
  { label: 'Typography', id: 'type', group: 'Foundation' },
  { label: 'Figures', id: 'figures', group: 'Foundation' },
  { label: 'Icons', id: 'icons', group: 'Foundation' },

  // Primitives
  { label: 'Buttons', id: 'buttons', group: 'Primitives' },
  { label: 'Text', id: 'text', group: 'Primitives' },
  { label: 'Fields', id: 'fields', group: 'Primitives' },
  { label: 'Checkbox', id: 'checkbox', group: 'Primitives' },
  { label: 'Radio', id: 'radio', group: 'Primitives' },
  { label: 'Switch', id: 'switch', group: 'Primitives' },
  { label: 'Segmented', id: 'segmented', group: 'Primitives' },
  { label: 'Select', id: 'select', group: 'Primitives' },

  // Display
  { label: 'Pill', id: 'pill', group: 'Display' },
  { label: 'Flag', id: 'flag', group: 'Display' },
  { label: 'Avatar', id: 'avatar', group: 'Display' },
  { label: 'Product mark', id: 'product-mark', group: 'Display' },
  { label: 'Sheet', id: 'sheet', group: 'Display' },
  { label: 'Figure', id: 'figure', group: 'Display' },
  { label: 'Table', id: 'table', group: 'Display' },
  { label: 'Progress', id: 'progress', group: 'Display' },
  { label: 'Skeleton & empty', id: 'skeleton', group: 'Display' },
  { label: 'Tooltip', id: 'tooltip', group: 'Display' },

  // Feedback
  { label: 'Modal', id: 'modal', group: 'Feedback' },
  { label: 'Toasts & banners', id: 'alerts', group: 'Feedback' },
  { label: 'DrawerService', id: 'drawer', group: 'Feedback' },

  // Domain patterns
  { label: 'Variance', id: 'variance', group: 'Domain Patterns' },
];

export const NAV_GROUPS: readonly NavGroup[] = [
  'Foundation',
  'Primitives',
  'Display',
  'Feedback',
  'Domain Patterns',
];
