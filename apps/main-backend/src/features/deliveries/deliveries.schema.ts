import { z } from 'zod';

const product = z.enum(['PMS', 'AGO', 'DPK'], {
  errorMap: () => ({ message: 'Product must be PMS, AGO or DPK' }),
});

// Record an inbound tanker. Stage starts at 'arrived'; the dips and sign come via PATCH.
export const CreateDeliveryBody = z.object({
  tank_id: z.string({ required_error: 'Tank is required' }).min(1, 'Choose a tank'),
  product,
  waybill_number: z.string({ required_error: 'Waybill number is required' }).min(1, 'Enter the waybill number'),
  supplier: z.string({ required_error: 'Supplier is required' }).min(1, 'Enter the supplier'),
  driver_name: z.string({ required_error: 'Driver name is required' }).min(1, 'Enter the driver name'),
  truck_plate: z.string({ required_error: 'Truck plate is required' }).min(1, 'Enter the truck plate'),
  witness: z.string().min(1).nullable().optional(),
  waybill_litres: z.number({ required_error: 'Waybill litres is required' }).positive('Litres must be greater than zero'),
  cost_per_litre_kobo: z.number({ required_error: 'Cost per litre is required' }).int('Cost must be in whole kobo').positive('Cost must be greater than zero'),
});
export type CreateDeliveryBody = z.infer<typeof CreateDeliveryBody>;

// Step the offload: record dip-before, dip-after, advance the stage.
export const UpdateDeliveryBody = z.object({
  stage: z.enum(['arrived', 'dip_before', 'offloaded', 'signed']).optional(),
  dip_before_litres: z.number().nonnegative('Litres cannot be negative').optional(),
  dip_after_litres: z.number().nonnegative('Litres cannot be negative').optional(),
  witness: z.string().min(1).nullable().optional(),
});
export type UpdateDeliveryBody = z.infer<typeof UpdateDeliveryBody>;

export const SignDeliveryBody = z.object({
  witness: z.string({ required_error: 'A witness is required to sign' }).min(1, 'Enter the witness'),
});
export type SignDeliveryBody = z.infer<typeof SignDeliveryBody>;
