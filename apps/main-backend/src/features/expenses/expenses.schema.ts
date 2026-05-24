import { z } from 'zod';

export const CreateExpenseBody = z.object({
  business_date: z
    .string({ required_error: 'A business date is required' })
    .min(10, 'Enter a valid business date'),
  category: z
    .string({ required_error: 'A category is required' })
    .min(1, 'Choose a category for this expense'),
  description: z
    .string({ required_error: 'A description is required' })
    .min(1, 'Describe what this expense was for'),
  amount_kobo: z
    .number({ required_error: 'An amount is required' })
    .int('Amount must be in whole kobo')
    .positive('Amount must be greater than zero'),
  witness: z.string().min(1, 'Enter the witness name').optional(),
});
export type CreateExpenseBody = z.infer<typeof CreateExpenseBody>;
