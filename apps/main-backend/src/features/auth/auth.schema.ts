import { z } from 'zod';

// Roles are fixed in v1 (Module 1). Sign-up creates an Owner; managers and
// attendants are added by the owner/manager from the staff roster.
export const USER_ROLES = ['owner', 'manager', 'attendant'] as const;

export const LoginBody = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
export type LoginBody = z.infer<typeof LoginBody>;

export const RegisterBody = z.object({
  name: z.string().min(2),
  business_name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(10),
  password: z.string().min(8),
});
export type RegisterBody = z.infer<typeof RegisterBody>;

// Phone OTP must be verified before the workspace unlocks.
export const VerifyOtpBody = z.object({
  phone: z.string().min(10),
  code: z.string().length(6),
});
export type VerifyOtpBody = z.infer<typeof VerifyOtpBody>;
