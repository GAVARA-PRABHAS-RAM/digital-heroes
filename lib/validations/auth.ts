import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const signupSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(8, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export type SignupInput = z.infer<typeof signupSchema>;

export const scoreSubmissionSchema = z.object({
  courseName: z.string().min(2, "Course name is required"),
  playedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be a valid date (YYYY-MM-DD)"),
  grossScore: z.number().int().min(50).max(160, "Gross score must be realistic (50-160)"),
  courseRating: z.number().min(55).max(85, "Course rating must be valid (55-85)"),
  slopeRating: z.number().int().min(55).max(155, "Slope rating must be valid (55-155)"),
  differential: z.number().optional(),
});

export type ScoreSubmissionInput = z.infer<typeof scoreSubmissionSchema>;
