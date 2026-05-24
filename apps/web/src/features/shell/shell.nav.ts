import { P, ROUTES, type Permission } from '@dipstick/core';
import {
  IconAudit,
  IconBranch,
  IconChart,
  IconDaybook,
  IconExpense,
  IconFuel,
  IconPrice,
  IconSettings,
  IconStaff,
  IconTruck,
  type LucideIcon,
} from '@icons';

// Sidebar items. `scope` decides how the path is built: 'global' uses a static ROUTES value;
// 'branch' builds the path from the current branchId. `permission` gates visibility off the
// auth context's effective set (undefined = always shown to an authed user).
export type NavScope = 'global' | 'branch';

export interface NavItem {
  readonly id: string;
  readonly label: string;
  readonly icon: LucideIcon;
  readonly scope: NavScope;
  readonly to: (branchId: string) => string;
  readonly permission?: Permission;
  readonly group: NavGroup;
}

export type NavGroup = 'Overview' | 'The day' | 'Branch' | 'Admin';

export const NAV_GROUPS: readonly NavGroup[] = ['Overview', 'The day', 'Branch', 'Admin'];

export const NAV_ITEMS: readonly NavItem[] = [
  {
    id: 'rollup',
    label: 'Roll-up',
    icon: IconChart,
    scope: 'global',
    to: () => ROUTES.DASHBOARD,
    permission: P.CAN_VIEW_ROLLUP,
    group: 'Overview',
  },
  {
    id: 'branches',
    label: 'Branches',
    icon: IconBranch,
    scope: 'global',
    to: () => ROUTES.BRANCHES,
    permission: P.CAN_VIEW_BRANCH,
    group: 'Overview',
  },

  {
    id: 'daybook',
    label: 'Day-book',
    icon: IconDaybook,
    scope: 'branch',
    to: (b) => ROUTES.BRANCH_DAYBOOK(b),
    permission: P.CAN_VIEW_BRANCH,
    group: 'The day',
  },
  {
    id: 'deliveries',
    label: 'Deliveries',
    icon: IconTruck,
    scope: 'branch',
    to: (b) => ROUTES.BRANCH_DELIVERIES(b),
    permission: P.CAN_VIEW_BRANCH,
    group: 'The day',
  },
  {
    id: 'expenses',
    label: 'Expenses',
    icon: IconExpense,
    scope: 'branch',
    to: (b) => ROUTES.BRANCH_EXPENSES(b),
    permission: P.CAN_VIEW_EXPENSES,
    group: 'The day',
  },

  {
    id: 'pricing',
    label: 'Pricing',
    icon: IconPrice,
    scope: 'branch',
    to: (b) => ROUTES.BRANCH_PRICING(b),
    permission: P.CAN_VIEW_BRANCH,
    group: 'Branch',
  },
  {
    id: 'staff',
    label: 'Staff',
    icon: IconStaff,
    scope: 'branch',
    to: (b) => ROUTES.BRANCH_STAFF(b),
    permission: P.CAN_VIEW_STAFF,
    group: 'Branch',
  },
  {
    id: 'roster',
    label: 'Roster',
    icon: IconFuel,
    scope: 'branch',
    to: (b) => ROUTES.BRANCH_ROSTER(b),
    permission: P.CAN_VIEW_STAFF,
    group: 'Branch',
  },
  {
    id: 'audit',
    label: 'Audit log',
    icon: IconAudit,
    scope: 'branch',
    to: (b) => ROUTES.BRANCH_AUDIT(b),
    permission: P.CAN_VIEW_AUDIT,
    group: 'Branch',
  },

  {
    id: 'settings',
    label: 'Settings',
    icon: IconSettings,
    scope: 'global',
    to: () => ROUTES.SETTINGS,
    group: 'Admin',
  },
];
