import { z } from 'zod';

export const chatSchema = z.object({
  message: z.string().max(4000),
  threadId: z.string().uuid().optional(),
  systemPrompt: z.string().max(2000).optional(),
});

export type ChatDto = z.infer<typeof chatSchema>;

export const threadParamsSchema = z.object({
  threadId: z.string().uuid(),
});

export type ThreadParamsDto = z.infer<typeof threadParamsSchema>;

export const createThreadSchema = z.object({
  title: z.string().max(200).optional(),
});

export type CreateThreadDto = z.infer<typeof createThreadSchema>;