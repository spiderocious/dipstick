import { z } from 'zod';

const product = z.enum(['PMS', 'AGO', 'DPK'], {
  errorMap: () => ({ message: 'Product must be PMS, AGO or DPK' }),
});

const tankInput = z.object({
  product,
  capacity_litres: z.number({ required_error: 'Tank capacity is required' }).positive('Capacity must be greater than zero'),
  reorder_threshold_litres: z.number({ required_error: 'Reorder threshold is required' }).nonnegative('Threshold cannot be negative'),
});

const pumpInput = z.object({
  product,
  label: z.string({ required_error: 'Pump label is required' }).min(1, 'Enter a pump label'),
});

export const CreateBranchBody = z.object({
  name: z.string({ required_error: 'Branch name is required' }).min(2, 'Enter a branch name'),
  city: z.string({ required_error: 'City is required' }).min(2, 'Enter a city'),
  state: z.string({ required_error: 'State is required' }).min(2, 'Enter a state'),
  tanks: z.array(tankInput).max(3, 'A branch has at most three tanks').optional(),
  pumps: z.array(pumpInput).optional(),
});
export type CreateBranchBody = z.infer<typeof CreateBranchBody>;

const settingsInput = z.object({
  require_closing_dip: z.boolean().optional(),
  variance_flag_kobo: z.number().nonnegative('Variance flag cannot be negative').optional(),
  manager_may_set_price: z.boolean().optional(),
  delivery_tolerance_litres: z.number().nonnegative('Tolerance cannot be negative').optional(),
});

export const UpdateBranchBody = z.object({
  name: z.string().min(2, 'Enter a branch name').optional(),
  city: z.string().min(2, 'Enter a city').optional(),
  state: z.string().min(2, 'Enter a state').optional(),
  settings: settingsInput.optional(),
});
export type UpdateBranchBody = z.infer<typeof UpdateBranchBody>;

export const CreateTankBody = tankInput;
export type CreateTankBody = z.infer<typeof CreateTankBody>;

export const UpdateTankBody = z.object({
  capacity_litres: z.number().positive('Capacity must be greater than zero').optional(),
  reorder_threshold_litres: z.number().nonnegative('Threshold cannot be negative').optional(),
});
export type UpdateTankBody = z.infer<typeof UpdateTankBody>;

export const CreatePumpBody = pumpInput;
export type CreatePumpBody = z.infer<typeof CreatePumpBody>;

export const UpdatePumpBody = z.object({
  label: z.string().min(1, 'Enter a pump label').optional(),
  state: z.enum(['idle', 'live', 'offline']).optional(),
  fault_note: z.string().max(280, 'Fault note is too long').nullable().optional(),
});
export type UpdatePumpBody = z.infer<typeof UpdatePumpBody>;
