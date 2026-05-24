import { z } from 'zod';

// Zod messages double as the user-facing validation copy (the one-field validator surfaces
// `issue.message`). Order of keys matters: the validator reports the offending field that
// appears earliest in the submitted body, so declare fields in the order a form presents them.

const email = z.string({ required_error: 'Email is required' }).email('Enter a valid email address');
const phone = z
  .string({ required_error: 'Phone number is required' })
  .min(10, 'Enter a valid phone number')
  .max(20, 'Enter a valid phone number');
const password = z
  .string({ required_error: 'Password is required' })
  .min(8, 'Password must be at least 8 characters');
const name = z.string({ required_error: 'Name is required' }).min(2, 'Enter your full name');

export const RegisterBody = z.object({
  name,
  business_name: z.string({ required_error: 'Business name is required' }).min(2, 'Enter your business name'),
  email,
  phone,
  password,
});
export type RegisterBody = z.infer<typeof RegisterBody>;

export const VerifyOtpBody = z.object({
  phone,
  code: z.string({ required_error: 'Enter the 6-digit code' }).length(6, 'The code is 6 digits'),
});
export type VerifyOtpBody = z.infer<typeof VerifyOtpBody>;

export const ResendOtpBody = z.object({ phone });
export type ResendOtpBody = z.infer<typeof ResendOtpBody>;

export const LoginBody = z.object({ email, password });
export type LoginBody = z.infer<typeof LoginBody>;

export const RefreshBody = z.object({
  refresh_token: z.string({ required_error: 'Refresh token is required' }).min(10, 'Invalid refresh token'),
});
export type RefreshBody = z.infer<typeof RefreshBody>;

export const UpdateOrgBody = z.object({
  name: z.string().min(2, 'Enter your business name').optional(),
  wordmark: z.string().max(120, 'Wordmark is too long').nullable().optional(),
});
export type UpdateOrgBody = z.infer<typeof UpdateOrgBody>;
