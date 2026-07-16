import { z } from 'zod';

export const initiateCallSchema = z.object({
  conversationId: z.string().uuid(),
  type: z.enum(['audio', 'video']),
  targetUserId: z.string().uuid(),
});

export type InitiateCallDto = z.infer<typeof initiateCallSchema>;

export const callActionSchema = z.object({
  callId: z.string().uuid(),
  action: z.enum(['accept', 'decline', 'end']),
  sdp: z.string().optional(),
  iceCandidates: z.array(z.any()).optional(),
});

export type CallActionDto = z.infer<typeof callActionSchema>;

export const callParamsSchema = z.object({
  callId: z.string().uuid(),
});

export type CallParamsDto = z.infer<typeof callParamsSchema>;