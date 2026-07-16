import { z } from 'zod';

export const createStatusSchema = z.object({
  content: z.string().max(500).optional(),
  mediaId: z.string().uuid().optional(),
  type: z.enum(['text', 'image', 'video']).default('text'),
  backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

export type CreateStatusDto = z.infer<typeof createStatusSchema>;

export const statusParamsSchema = z.object({
  statusId: z.string().uuid(),
});

export type StatusParamsDto = z.infer<typeof statusParamsSchema>;

export const getStatusesSchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().uuid().optional(),
});

export type GetStatusesDto = z.infer<typeof getStatusesSchema>;