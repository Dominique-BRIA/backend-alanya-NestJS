import { z } from 'zod';

export const uploadMediaSchema = z.object({
  filename: z.string().max(255),
  mimeType: z.string().max(100),
  size: z.number().int().positive(),
  conversationId: z.string().uuid().optional(),
});

export type UploadMediaDto = z.infer<typeof uploadMediaSchema>;

export const mediaParamsSchema = z.object({
  mediaId: z.string().uuid(),
});

export type MediaParamsDto = z.infer<typeof mediaParamsSchema>;

export const presignUploadSchema = z.object({
  filename: z.string().max(255),
  mimeType: z.string().max(100),
  size: z.number().int().positive(),
});

export type PresignUploadDto = z.infer<typeof presignUploadSchema>;