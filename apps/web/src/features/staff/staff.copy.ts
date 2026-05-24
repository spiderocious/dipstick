export const STAFF_COPY = {
  overline: 'Staff',
  title: 'The people on the forecourt.',
  add: 'Add staff',
  emptyTitle: 'No staff yet.',
  emptyBody: 'Add a manager or attendant to this branch.',
  role: 'Role',
  shifts30d: '30-day shifts',
  variance30d: '30-day variance',
  leaderboardHeading: 'Variance leaderboard · 30 days',
  addedMark: '✓ STAFF ADDED',
  nameLabel: 'Full name',
  emailLabel: 'Email',
  phoneLabel: 'Phone',
  passwordLabel: 'Temporary password',
  save: 'Add staff',
} as const;

export const ROSTER_COPY = {
  overline: 'Roster',
  title: 'This week’s shifts.',
  weekOf: 'Week of',
  save: 'Save roster',
  savedMark: '✓ ROSTER SAVED',
  days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
} as const;

export const ROLES_COPY = {
  overline: 'Roles & permissions',
  title: 'Who can do what.',
  newRole: 'New role',
  systemRole: 'System',
  permissionsHeading: 'Permissions',
  nameLabel: 'Role name',
  save: 'Save role',
  savedMark: '✓ ROLE SAVED',
  deletedMark: '✓ ROLE DELETED',
  deleteTitle: 'Delete this role?',
  deleteBody: 'Staff assigned to this role must be reassigned first.',
} as const;
