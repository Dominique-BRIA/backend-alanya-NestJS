import { z } from 'zod';

// Register
export const registerSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
  idPays: z.number().int().positive('Pays invalide').optional(),
  nom: z.string().max(100).optional(),
});

export type RegisterDto = z.infer<typeof registerSchema>;

// Login
export const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
});

export type LoginDto = z.infer<typeof loginSchema>;

// Verify OTP
export const verifySchema = z.object({
  email: z.string().email('Email invalide'),
  code: z.string().length(6, 'Le code doit contenir 6 chiffres'),
});

export type VerifyDto = z.infer<typeof verifySchema>;

// Setup (pseudo + password after email verification)
export const setupSchema = z.object({
  pseudo: z.string().min(3, 'Le pseudo doit contenir au moins 3 caractères').max(100),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
});

export type SetupDto = z.infer<typeof setupSchema>;

// Forgot password
export const forgotPasswordSchema = z.object({
  email: z.string().email('Email invalide'),
});

export type ForgotPasswordDto = z.infer<typeof forgotPasswordSchema>;

// Reset password
export const resetPasswordSchema = z.object({
  email: z.string().email('Email invalide'),
  code: z.string().length(6, 'Le code doit contenir 6 chiffres'),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
});

export type ResetPasswordDto = z.infer<typeof resetPasswordSchema>;

// Refresh token
export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token requis'),
});

export type RefreshDto = z.infer<typeof refreshSchema>;