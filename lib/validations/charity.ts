import { z } from "zod";

export const userCharitySchema = z.object({
  charityId: z.string().uuid("Please select a valid charity"),
  contributionPercentage: z
    .number({
      required_error: "Contribution percentage is required",
      invalid_type_error: "Contribution percentage must be a number",
    })
    .int("Percentage must be a whole number")
    .min(10, "Minimum charity contribution is 10% (as required by platform rules)")
    .max(100, "Maximum charity contribution is 100%"),
});

export type UserCharityInput = z.infer<typeof userCharitySchema>;
