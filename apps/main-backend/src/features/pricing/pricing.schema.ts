import { z } from 'zod';

const product = z.enum(['PMS', 'AGO', 'DPK'], {
  errorMap: () => ({ message: 'Product must be PMS, AGO or DPK' }),
});

export const SetPriceBody = z.object({
  product,
  price_per_litre_kobo: z
    .number({ required_error: 'Price is required' })
    .int('Price must be in whole kobo')
    .positive('Price must be greater than zero'),
  effective_at: z.string({ required_error: 'Effective time is required' }).datetime('Enter a valid date and time'),
  reason: z.string({ required_error: 'A reason is required' }).min(3, 'Give a reason for the change'),
});
export type SetPriceBody = z.infer<typeof SetPriceBody>;

export const PreviewPriceBody = z.object({
  product,
  price_per_litre_kobo: z.number().int().positive('Price must be greater than zero'),
});
export type PreviewPriceBody = z.infer<typeof PreviewPriceBody>;
