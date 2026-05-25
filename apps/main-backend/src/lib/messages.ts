// Message registry. Response strings live here, keyed — never hardcoded inline in a
// service or controller. Services return a MessageKey; the controller resolves it through
// messages.get(). Centralising makes copy review and (later) i18n a single-file change.

export const MESSAGES = {
  // Auth
  invalid_credentials: 'Email or password is incorrect',
  account_inactive: 'This account has been deactivated',
  otp_invalid: 'The verification code is incorrect',
  otp_expired: 'The verification code has expired',
  otp_not_found: 'No verification code on record — request a new one',
  otp_too_many: 'Too many attempts. Request a new code',
  account_unverified: 'Verify your account to continue',
  phone_unverified: 'Verify your phone number to continue',
  email_unverified: 'Verify your email to continue',
  already_verified: 'This is already verified',
  phone_already_verified: 'This phone number is already verified',
  channel_not_on_account: 'That contact is not on this account',
  token_invalid: 'Your session is invalid. Please sign in again',
  token_expired: 'Your session has expired. Please sign in again',
  email_taken: 'An account with that email already exists',
  phone_taken: 'An account with that phone number already exists',

  // Authorization
  forbidden: 'You do not have permission to do that',
  not_a_member: 'You are not a member of this branch',

  // Roles
  role_not_found: 'Role not found',
  role_name_taken: 'A role with that name already exists',
  role_system_undeletable: 'System roles cannot be deleted',
  role_in_use: 'This role is assigned to staff and cannot be deleted',
  last_owner: 'At least one person must keep full ownership of this business',
  unknown_permission: 'One or more permissions are not recognised',

  // Org / branches
  org_not_found: 'Business not found',
  branch_not_found: 'Branch not found',
  branch_archived: 'This branch is archived and cannot accept new entries',
  tank_not_found: 'Tank not found',
  tank_product_exists: 'A tank for this product already exists at this branch',
  pump_not_found: 'Pump not found',

  // Staff
  staff_not_found: 'Staff member not found',
  membership_not_found: 'Assignment not found',
  already_member: 'This person is already assigned to that branch',
  account_email_taken: 'Another account already uses that email',
  account_phone_taken: 'Another account already uses that phone number',

  // Shifts / dips
  shift_not_found: 'Shift not found',
  shift_not_open: 'This shift is not open',
  shift_already_posted: 'This shift is already posted',
  shift_not_posted: 'Only a posted shift can be voided',
  shift_already_voided: 'This shift is already voided',
  shift_not_closed: 'Close every pump before posting',
  closing_below_opening: 'Closing meter cannot be lower than the opening meter',
  branch_rule_unmet: 'A closing dip is required before this shift can be posted',
  void_word_mismatch: 'Type the word VOID to confirm',
  void_reason_required: 'A reason is required to void a shift',
  dip_not_found: 'Dip reading not found',

  // Pricing
  price_not_found: 'Price not found',
  price_reason_required: 'A reason is required to change the price',
  price_manager_not_permitted: 'This branch does not permit managers to set the price',

  // Deliveries
  delivery_not_found: 'Delivery not found',
  delivery_already_signed: 'This delivery is already signed',
  delivery_stage_invalid: 'That delivery step is not valid right now',
  delivery_dips_required: 'Record the dip before and after before signing',

  // Expenses
  expense_not_found: 'Expense not found',

  // Notes / audit
  note_target_invalid: 'That record cannot take notes',
  entity_not_found: 'Record not found',

  // Generic
  validation_failed: 'Please check the highlighted field',
  conflict: 'That action conflicts with the current state',
  internal: 'An unexpected error occurred',
} as const;

export type MessageKey = keyof typeof MESSAGES;

export const messages = {
  get(key: MessageKey): string {
    return MESSAGES[key];
  },
};
