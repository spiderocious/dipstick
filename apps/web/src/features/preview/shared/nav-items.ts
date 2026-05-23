export type NavGroup = 'Foundation' | 'Primitives' | 'Domain Patterns';

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

  // Domain patterns
  { label: 'Variance', id: 'variance', group: 'Domain Patterns' },
];

export const NAV_GROUPS: readonly NavGroup[] = ['Foundation', 'Primitives', 'Domain Patterns'];
