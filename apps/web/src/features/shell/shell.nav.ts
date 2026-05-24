import { P, ROUTES, type Permission } from '@dipstick/core';
import {
  IconAudit,
  IconDaybook,
  IconExpense,
  IconFuel,
  IconPrice,
  IconStaff,
  IconTruck,
  type LucideIcon,
} from '@icons';

// Sidebar items — ALL branch-scoped (the sidebar only exists inside a branch). Each builds its
// path from the current branchId. `permission` gates visibility off the auth context's effective
// set. Global destinations (branches list, overview, settings) live outside the shell, not here.
export interface NavItem {
  readonly id: string;
  readonly label: string;
  readonly icon: LucideIcon;
  readonly to: (branchId: string) => string;
  readonly permission?: Permission;
  readonly group: NavGroup;
}

export type NavGroup = 'The day' | 'Branch';

export const NAV_GROUPS: readonly NavGroup[] = ['The day', 'Branch'];

export const NAV_ITEMS: readonly NavItem[] = [
  {
    id: 'daybook',
    label: 'Day-book',
    icon: IconDaybook,
    to: (b) => ROUTES.BRANCH_DAYBOOK(b),
    permission: P.CAN_VIEW_BRANCH,
    group: 'The day',
  },
  {
    id: 'deliveries',
    label: 'Deliveries',
    icon: IconTruck,
    to: (b) => ROUTES.BRANCH_DELIVERIES(b),
    permission: P.CAN_VIEW_BRANCH,
    group: 'The day',
  },
  {
    id: 'expenses',
    label: 'Expenses',
    icon: IconExpense,
    to: (b) => ROUTES.BRANCH_EXPENSES(b),
    permission: P.CAN_VIEW_EXPENSES,
    group: 'The day',
  },
  {
    id: 'pricing',
    label: 'Pricing',
    icon: IconPrice,
    to: (b) => ROUTES.BRANCH_PRICING(b),
    permission: P.CAN_VIEW_BRANCH,
    group: 'Branch',
  },
  {
    id: 'staff',
    label: 'Staff',
    icon: IconStaff,
    to: (b) => ROUTES.BRANCH_STAFF(b),
    permission: P.CAN_VIEW_STAFF,
    group: 'Branch',
  },
  {
    id: 'roster',
    label: 'Roster',
    icon: IconFuel,
    to: (b) => ROUTES.BRANCH_ROSTER(b),
    permission: P.CAN_VIEW_STAFF,
    group: 'Branch',
  },
  {
    id: 'audit',
    label: 'Audit log',
    icon: IconAudit,
    to: (b) => ROUTES.BRANCH_AUDIT(b),
    permission: P.CAN_VIEW_AUDIT,
    group: 'Branch',
  },
];
