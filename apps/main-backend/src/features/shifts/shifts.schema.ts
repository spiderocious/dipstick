import { z } from 'zod';

const product = z.enum(['PMS', 'AGO', 'DPK'], {
  errorMap: () => ({ message: 'Product must be PMS, AGO or DPK' }),
});

// Opening or closing dip per tank.
export const RecordDipBody = z.object({
  tank_id: z.string({ required_error: 'Tank is required' }).min(1, 'Choose a tank'),
  kind: z.enum(['opening', 'closing'], { errorMap: () => ({ message: 'Dip must be opening or closing' }) }),
  litres: z.number({ required_error: 'Litres is required' }).nonnegative('Litres cannot be negative'),
  business_date: z.string({ required_error: 'Business date is required' }).min(10, 'Enter the business date'),
});
export type RecordDipBody = z.infer<typeof RecordDipBody>;

export const OpenShiftBody = z.object({
  pump_id: z.string({ required_error: 'Pump is required' }).min(1, 'Choose a pump'),
  attendant_id: z.string({ required_error: 'Attendant is required' }).min(1, 'Choose an attendant'),
  window: z.enum(['morning', 'evening'], { errorMap: () => ({ message: 'Shift is morning or evening' }) }),
  business_date: z.string({ required_error: 'Business date is required' }).min(10, 'Enter the business date'),
  opening_meter: z.number({ required_error: 'Opening meter is required' }).nonnegative('Meter cannot be negative'),
  // Optional per-shift price override (with reason), else pinned from the price log.
  price_per_litre_kobo: z.number().int().positive('Price must be greater than zero').optional(),
  price_override_reason: z.string().min(3, 'Give a reason for the override').optional(),
  product: product.optional(),
});
export type OpenShiftBody = z.infer<typeof OpenShiftBody>;

export const CloseShiftBody = z.object({
  closing_meter: z.number({ required_error: 'Closing meter is required' }).nonnegative('Meter cannot be negative'),
  cash_declared_kobo: z.number({ required_error: 'Cash declared is required' }).int('Cash must be in whole kobo').nonnegative('Cash cannot be negative'),
});
export type CloseShiftBody = z.infer<typeof CloseShiftBody>;

// Void: the critical idiom. Reason required AND the literal word VOID typed to confirm.
export const VoidShiftBody = z.object({
  reason: z.string({ required_error: 'A reason is required' }).min(3, 'Give a reason for the void'),
  confirm: z.string({ required_error: 'Type VOID to confirm' }),
});
export type VoidShiftBody = z.infer<typeof VoidShiftBody>;

export const PostBalancedBody = z.object({
  business_date: z.string({ required_error: 'Business date is required' }).min(10, 'Enter the business date'),
});
export type PostBalancedBody = z.infer<typeof PostBalancedBody>;
