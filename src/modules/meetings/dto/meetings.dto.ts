import { z } from 'zod';

export const createMeetingSchema = z.object({
  startTime: z.string().datetime(),
  duree: z.number().int().positive(),
  objet: z.string().max(200),
  room: z.string().max(200),
  typeMedia: z.enum(['audio', 'video']),
  participantIds: z.array(z.string().uuid()).min(1),
});

export type CreateMeetingDto = z.infer<typeof createMeetingSchema>;

export const updateMeetingSchema = z.object({
  startTime: z.string().datetime().optional(),
  duree: z.number().int().positive().optional(),
  objet: z.string().max(200).optional(),
  room: z.string().max(200).optional(),
  typeMedia: z.enum(['audio', 'video']).optional(),
  isEnd: z.boolean().optional(),
});

export type UpdateMeetingDto = z.infer<typeof updateMeetingSchema>;

export const meetingParamsSchema = z.object({
  meetingId: z.coerce.number().int().positive(),
});

export type MeetingParamsDto = z.infer<typeof meetingParamsSchema>;

export const participantActionSchema = z.object({
  participantId: z.string().uuid(),
  status: z.enum(['invite', 'accepted', 'declined']),
});

export type ParticipantActionDto = z.infer<typeof participantActionSchema>;