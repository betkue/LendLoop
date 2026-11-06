import { z } from "zod";
import {
  CATEGORIES,
  CONDITIONS,
  TOOL_DESCRIPTION_MAX,
  TOOL_NAME_MAX,
} from "@/convex/shared/constants";

type Translate = (key: "nameRequired" | "nameTooLong" | "descriptionTooLong") => string;

/**
 * Validation for the listing form, mirroring the Convex limits; messages come
 * from the active language (t is scoped to tools.form.errors).
 */
export function makeToolFormSchema(t: Translate) {
  return z.object({
    name: z.string().trim().min(1, t("nameRequired")).max(TOOL_NAME_MAX, t("nameTooLong")),
    category: z.enum(CATEGORIES),
    condition: z.enum(CONDITIONS),
    description: z.string().trim().max(TOOL_DESCRIPTION_MAX, t("descriptionTooLong")),
  });
}

export type ToolFormValues = z.infer<ReturnType<typeof makeToolFormSchema>>;
