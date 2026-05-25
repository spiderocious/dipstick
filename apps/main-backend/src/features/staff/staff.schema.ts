import { z } from 'zod';

const phone = z.string({ required_error: 'Phone number is required' }).min(10, 'Enter a valid phone number');
const window = z.enum(['morning', 'evening', 'off']);

// Add staff: either an existing user (by email) or a new one. roleId assigns their role at
// this branch. A new user gets a temporary password they reset via OTP/login later.
export const AddStaffBody = z.object({
  name: z.string({ required_error: 'Name is required' }).min(2, 'Enter the staff member’s name'),
  email: z.string({ required_error: 'Email is required' }).email('Enter a valid email address'),
  phone,
  role_id: z.string({ required_error: 'Role is required' }).min(1, 'Choose a role'),
  default_pump_id: z.string().nullable().optional(),
  password: z.string().min(8, 'Temporary password must be at least 8 characters').optional(),
});
export type AddStaffBody = z.infer<typeof AddStaffBody>;

export const UpdateStaffBody = z.object({
  role_id: z.string().min(1, 'Choose a role').optional(),
  default_pump_id: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
});
export type UpdateStaffBody = z.infer<typeof UpdateStaffBody>;

// Assign an existing staff member to another branch with a role from THAT branch.
export const AssignBranchBody = z.object({
  role_id: z.string({ required_error: 'Role is required' }).min(1, 'Choose a role'),
});
export type AssignBranchBody = z.infer<typeof AssignBranchBody>;

// Edit the staff member's account (the user record, not a branch membership).
export const EditAccountBody = z.object({
  name: z.string().min(2, 'Enter the staff member’s name').optional(),
  email: z.string().email('Enter a valid email address').optional(),
  phone: z.string().min(10, 'Enter a valid phone number').nullable().optional(),
});
export type EditAccountBody = z.infer<typeof EditAccountBody>;

// Roster: per-attendant array of 7 windows (Mon..Sun).
export const SetRosterBody = z.object({
  week_start: z.string({ required_error: 'Week start is required' }).min(10, 'Enter the week start date'),
  assignments: z.record(
    z.string(),
    z.array(window).length(7, 'Each attendant needs 7 days'),
  ),
});
export type SetRosterBody = z.infer<typeof SetRosterBody>;
