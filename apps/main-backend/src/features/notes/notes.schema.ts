import { z } from 'zod';

export const AddNoteBody = z.object({
  body: z.string({ required_error: 'Write a note' }).min(1, 'Write a note'),
  mentions: z.array(z.string()).optional(),
});
export type AddNoteBody = z.infer<typeof AddNoteBody>;
