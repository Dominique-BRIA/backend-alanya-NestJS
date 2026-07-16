import { z } from 'zod';

export const createCountrySchema = z.object({
  libelle: z.string().min(1).max(200),
  prefix: z.string().min(1).max(10).regex(/^\+\d+$/),
  timeZone: z.string().min(1).max(200),
  decalageHoraire: z.number().int(),
});

export type CreateCountryDto = z.infer<typeof createCountrySchema>;

export const updateCountrySchema = createCountrySchema.partial();

export type UpdateCountryDto = z.infer<typeof updateCountrySchema>;