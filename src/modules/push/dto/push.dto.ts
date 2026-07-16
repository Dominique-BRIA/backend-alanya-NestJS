import { z } from 'zod';

export const registerDeviceSchema = z.object({
  token: z.string().min(1),
  platform: z.enum(['android', 'ios', 'web']),
});

export type RegisterDeviceDto = z.infer<typeof registerDeviceSchema>;

export const deviceParamsSchema = z.object({
  deviceId: z.string().uuid(),
});

export type DeviceParamsDto = z.infer<typeof deviceParamsSchema>;