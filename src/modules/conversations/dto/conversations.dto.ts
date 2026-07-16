import { z } from 'zod';

export const createConversationSchema = z.object({
  isGroup: z.boolean().default(false),
  name: z.string().max(150).optional(),
  participantIds: z.array(z.string().uuid()).min(1, 'Au moins un participant requis'),
  avatarUrl: z.string().url().max(2048).optional().nullable(),
});

export type CreateConversationDto = z.infer<typeof createConversationSchema>;

export const updateConversationSchema = z.object({
  name: z.string().max(150).optional().nullable(),
  avatarUrl: z.string().url().max(2048).optional().nullable(),
});

export type UpdateConversationDto = z.infer<typeof updateConversationSchema>;

export const conversationParamsSchema = z.object({
  conversationId: z.string().uuid(),
});

export type ConversationParamsDto = z.infer<typeof conversationParamsSchema>;

export const addParticipantsSchema = z.object({
  participantIds: z.array(z.string().uuid()).min(1),
});

export type AddParticipantsDto = z.infer<typeof addParticipantsSchema>;