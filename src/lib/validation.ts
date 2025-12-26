/**
 * Validation utilities for form inputs and debate configuration using Zod
 */

import { z } from "zod";
import { DEBATE_CONFIG, MODEL_OPTIONS } from "./constants";

/**
 * Zod schema for debate form validation
 */
export const debateFormSchema = z.object({
  topic: z
    .string()
    .trim()
    .min(1, "Debate topic is required")
    .max(
      DEBATE_CONFIG.MAX_TOPIC_LENGTH,
      `Topic must be ${DEBATE_CONFIG.MAX_TOPIC_LENGTH} characters or less`
    )
    .transform((val) => val.replace(/[<>]/g, "")), // Remove potential HTML
  yesModel: z
    .string()
    .trim()
    .min(1, "Please select a model for the Yes side")
    .refine((val) => MODEL_OPTIONS.some((model) => model.slug === val), {
      message: "Invalid model selected",
    }),
  noModel: z
    .string()
    .trim()
    .min(1, "Please select a model for the No side")
    .refine((val) => MODEL_OPTIONS.some((model) => model.slug === val), {
      message: "Invalid model selected",
    }),
});

/**
 * Type inferred from the debate form schema
 */
export type DebateFormInput = z.input<typeof debateFormSchema>;
export type DebateFormOutput = z.output<typeof debateFormSchema>;

/**
 * Validation errors for debate form fields (matches Zod error format)
 */
export type DebateFormErrors = {
  topic?: string;
  yesModel?: string;
  noModel?: string;
};

/**
 * Validates debate form fields using Zod
 * @param fields - Form field values
 * @returns Object containing validation errors (empty if valid)
 */
export function validateDebateForm(fields: Partial<DebateFormInput>): DebateFormErrors {
  const result = debateFormSchema.safeParse(fields);

  if (result.success) {
    return {};
  }

  const errors: DebateFormErrors = {};
  const fieldErrors = result.error.flatten().fieldErrors;

  if (fieldErrors.topic?.[0]) {
    errors.topic = fieldErrors.topic[0];
  }
  if (fieldErrors.yesModel?.[0]) {
    errors.yesModel = fieldErrors.yesModel[0];
  }
  if (fieldErrors.noModel?.[0]) {
    errors.noModel = fieldErrors.noModel[0];
  }

  return errors;
}

/**
 * Validates and sanitizes debate form data
 * @param fields - Form field values
 * @returns Validated and sanitized form data, or throws ZodError if invalid
 */
export function parseDebateForm(fields: Partial<DebateFormInput>): DebateFormOutput {
  return debateFormSchema.parse(fields);
}

/**
 * Validates that a model slug is in the allowed list
 * @param slug - Model slug to validate
 * @returns True if the model slug is valid
 */
export function isValidModel(slug: string): boolean {
  return MODEL_OPTIONS.some((model) => model.slug === slug);
}

/**
 * Validates and sanitizes a debate topic
 * @param topic - Raw topic string
 * @returns Sanitized topic string
 */
export function sanitizeTopic(topic: string): string {
  return topic
    .replace(/[<>]/g, "") // Remove potential HTML
    .substring(0, DEBATE_CONFIG.MAX_TOPIC_LENGTH)
    .trim();
}
