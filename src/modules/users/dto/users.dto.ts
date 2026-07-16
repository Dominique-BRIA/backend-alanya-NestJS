import { z } from 'zod';

export const updateProfileSchema = z.object({
  pseudo: z.string().min(3).max(100).optional(),
  avatarUrl: z.string().url().max(2048).optional().nullable(),
  statusMsg: z.string().max(255).optional().nullable(),
  nom: z.string().max(100).optional().nullable(),
  idPays: z.number().int().positive().optional().nullable(),
});

export type UpdateProfileDto = z.infer<typeof updateProfileSchema>;

export const searchUsersSchema = z.object({
  q: z.string().min(1).max(100).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().uuid().optional(),
});

export type SearchUsersDto = z.infer<typeof searchUsersSchema>;

export const publicNumberSchema = z.object({
  publicNumber: z.string().length(6).regex(/^\d{6}$/),
});

export type PublicNumberDto = z.infer<typeof publicNumberSchema>;