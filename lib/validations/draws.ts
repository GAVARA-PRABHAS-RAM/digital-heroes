import { z } from "zod";

export const createDrawSchema = z.object({
  draw_month: z
    .string({ required_error: "Draw month/date is required" })
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  draw_type: z.enum(["random", "algorithmic"], {
    required_error: "Draw generation method is required",
  }),
  draw_number: z.string().optional(),
  prize_pool_percentage: z
    .number()
    .min(10, "Prize pool percentage must be at least 10%")
    .max(100, "Prize pool percentage cannot exceed 100%")
    .default(50.0),
});

export const simulateDrawSchema = z.object({
  draw_id: z.string().uuid("Invalid draw ID"),
  draw_type: z.enum(["random", "algorithmic"]),
  prize_pool_percentage: z.number().min(10).max(100).default(50.0),
});

export const publishDrawSchema = z.object({
  draw_id: z.string().uuid("Invalid draw ID"),
});

export const enterDrawSchema = z.object({
  draw_id: z.string().uuid("Invalid draw ID"),
});

export type CreateDrawInput = z.infer<typeof createDrawSchema>;
export type SimulateDrawInput = z.infer<typeof simulateDrawSchema>;
export type PublishDrawInput = z.infer<typeof publishDrawSchema>;
export type EnterDrawInput = z.infer<typeof enterDrawSchema>;
