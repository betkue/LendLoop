import { z } from "zod";
import { isDay, today } from "@/convex/shared/dates";

type Translate = (key: "datesRequired" | "datesInvalid") => string;

/**
 * Validation for the request form, mirroring Convex: both days present, end on
 * or after start, start not in the past (t is scoped to loans.request.errors).
 */
export function makeLoanRequestSchema(t: Translate) {
  return z
    .object(
      {
        startDate: z.string().refine(isDay),
        endDate: z.string().refine(isDay),
      },
      { error: t("datesRequired") },
    )
    .refine((range) => range.endDate >= range.startDate && range.startDate >= today(), {
      error: t("datesInvalid"),
    });
}

export type LoanRequestValues = z.infer<ReturnType<typeof makeLoanRequestSchema>>;
