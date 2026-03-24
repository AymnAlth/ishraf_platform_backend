import { z } from "zod";

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, "Identifier is required"),
  password: z.string().min(1, "Password is required")
});

export const forgotPasswordSchema = z.object({
  identifier: z.string().trim().min(1, "Identifier is required")
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().trim().min(1, "Refresh token is required")
});

export const logoutSchema = z.object({
  refreshToken: z.string().trim().min(1, "Refresh token is required")
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters")
      .max(72, "New password must be at most 72 characters")
  })
  .refine((payload) => payload.currentPassword !== payload.newPassword, {
    path: ["newPassword"],
    message: "New password must be different from the current password"
  });

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(1, "Reset token is required"),
  newPassword: z
    .string()
    .min(8, "New password must be at least 8 characters")
    .max(72, "New password must be at most 72 characters")
});
