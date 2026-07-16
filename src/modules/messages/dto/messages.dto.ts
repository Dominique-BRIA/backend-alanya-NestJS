import { z } from 'zod';

export const sendMessageSchema = z.object({
  content: z.string().max(4000).optional(),
  type: z.enum(['text', 'image', 'video', 'audio', 'file', 'location', 'contact']).default('text'),
  mediaId: z.string().uuid().optional(),
  replyToId: z.string().uuid().optional(),
});

export type SendMessageDto = z.infer<typeof sendMessageSchema>;

export const messageParamsSchema = z.object({
  messageId: z.string().uuid(),
});

export type MessageParamsDto = z.infer<typeof messageParamsSchema>;

export const getMessagesSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().uuid().optional(),
  before: z.string().datetime().optional(),
});

export type GetMessagesDto = z.infer<typeof getMessagesSchema>;

export const markReadSchema = z.object({
  messageId: z.string().uuid(),
});

export type MarkReadDto = z.infer<typeof markReadSchema>;