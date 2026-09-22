import { z } from "zod";

export const profileUpdateSchema = z.object({
  fullName: z
    .string({
      required_error: "Full name is required",
    })
    .trim()
    .min(2, "Full name must be at least 2 characters")
    .max(100, "Full name cannot exceed 100 characters"),
  phone: z
    .string()
    .trim()
    .max(30, "Phone number cannot exceed 30 characters")
    .optional()
    .nullable()
    .transform((val) => (val === "" ? null : val)),
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
