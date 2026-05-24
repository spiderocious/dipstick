import { z } from 'zod';

import { isPermission } from '@dipstick/core';

// A permission list must contain only known permission keys. We validate membership against
// the central catalogue so a typo can't silently create a dead permission.
const permissionList = z
  .array(z.string(), { required_error: 'Select at least one permission' })
  .min(1, 'Select at least one permission')
  .refine((arr) => arr.every(isPermission), { message: 'One or more permissions are not recognised' });

export const CreateRoleBody = z.object({
  name: z.string({ required_error: 'Role name is required' }).min(2, 'Enter a role name').max(40, 'Role name is too long'),
  permissions: permissionList,
});
export type CreateRoleBody = z.infer<typeof CreateRoleBody>;

export const UpdateRoleBody = z.object({
  name: z.string().min(2, 'Enter a role name').max(40, 'Role name is too long').optional(),
  permissions: permissionList.optional(),
});
export type UpdateRoleBody = z.infer<typeof UpdateRoleBody>;
