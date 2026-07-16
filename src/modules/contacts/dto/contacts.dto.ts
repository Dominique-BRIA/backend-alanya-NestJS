import { z } from 'zod';

export const addContactSchema = z.object({
  contactPublicNumber: z.string().length(6).regex(/^\d{6}$/),
  alias: z.string().max(100).optional(),
});

export type AddContactDto = z.infer<typeof addContactSchema>;

export const updateContactSchema = z.object({
  alias: z.string().max(100).optional().nullable(),
  isBlocked: z.boolean().optional(),
});

export type UpdateContactDto = z.infer<typeof updateContactSchema>;

export const contactParamsSchema = z.object({
  contactId: z.string().uuid(),
});

export type ContactParamsDto = z.infer<typeof contactParamsSchema>;