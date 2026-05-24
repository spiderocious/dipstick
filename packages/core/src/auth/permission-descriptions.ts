import { P, type Permission } from './permissions.js';

// One human-readable line per permission, keyed by the permission VALUE. Powers the
// role-builder UI (a checklist of "Allows a user to …"). Kept exhaustive by the
// Record<Permission, string> type — adding a permission without a description fails to
// typecheck.
export const PERMISSION_DESCRIPTIONS: Record<Permission, string> = {
  [P.CAN_MANAGE_ORG]: 'Edit the business name and the wordmark on printed reports.',
  [P.CAN_CREATE_BRANCH]: 'Create a new branch with its tanks and pumps.',
  [P.CAN_EDIT_BRANCH]: 'Edit a branch and its per-branch settings.',
  [P.CAN_ARCHIVE_BRANCH]: 'Archive a branch so it stops accepting new entries.',
  [P.CAN_VIEW_BRANCH]: 'View a branch, its day-book and its records.',
  [P.CAN_MANAGE_TANKS]: 'Add and edit the underground tanks at a branch.',
  [P.CAN_MANAGE_PUMPS]: 'Add and edit pumps, including marking one offline with a fault note.',

  [P.CAN_VIEW_STAFF]: 'View the staff directory, roster and variance track-record.',
  [P.CAN_MANAGE_STAFF]: 'Add, assign and deactivate staff.',
  [P.CAN_MANAGE_ROSTER]: 'Build and edit the weekly roster.',
  [P.CAN_MANAGE_ROLES]: 'Create and edit roles and the permissions they carry.',
  [P.CAN_ASSIGN_ROLES]: 'Assign a role to a staff member at a branch.',

  [P.CAN_RECORD_DIP]: 'Record opening and closing tank dips.',
  [P.CAN_OPEN_SHIFT]: 'Open a shift and assign attendants to pumps.',
  [P.CAN_CLOSE_OWN_SHIFT]: 'Close your own pump and declare your cash.',
  [P.CAN_CLOSE_ANY_SHIFT]: 'Close any attendant’s pump at the branch.',
  [P.CAN_POST_SHIFT]: 'Post (sign off) a shift, making it final.',
  [P.CAN_VOID_SHIFT]: 'Void a posted shift through the critical VOID confirmation.',
  [P.CAN_EDIT_POSTED]: 'Edit a posted entry, leaving an audit-trail entry.',
  [P.CAN_VIEW_RECONCILIATION]: 'View the per-pump reconciliation and variance.',

  [P.CAN_RECORD_DELIVERY]: 'Record an inbound tanker delivery and step its offload.',
  [P.CAN_SIGN_DELIVERY]: 'Sign off a delivery with the witness present.',

  [P.CAN_SET_PRICE]: 'Set a new pump price per product, with an effective time and reason.',
  [P.CAN_VIEW_PRICE_HISTORY]: 'View the full price-change history per product.',

  [P.CAN_RECORD_EXPENSE]: 'Record a cash expense paid from the till.',
  [P.CAN_VIEW_EXPENSES]: 'View expenses rolled up by day, week and month.',

  [P.CAN_VIEW_ROLLUP]: 'View the multi-branch owner roll-up across all branches.',
  [P.CAN_EXPORT_REPORTS]: 'Export or print day-books, summaries and ledgers as PDF.',

  [P.CAN_ADD_NOTE]: 'Attach a note thread to a shift, expense or delivery.',
  [P.CAN_VIEW_AUDIT]: 'View the full audit trail for a branch or record.',
};
