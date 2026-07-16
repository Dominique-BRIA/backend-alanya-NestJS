import { z } from 'zod';

export const blockUserSchema = z.object({
  targetUserId: z.string().uuid(),
});

export type BlockUserDto = z.infer<typeof blockUserSchema>;

export const blockedParamsSchema = z.object({
  blockedId: z.string().uuid(),
});

export type BlockedParamsDto = z.infer<typeof blockedParamsSchema>;