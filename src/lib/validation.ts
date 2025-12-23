/**
 * Validation utilities using Zod schemas
 */
import { z } from "zod";

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Helper to convert Zod validation to ValidationResult
 */
function validateWithZod<T>(
  schema: z.ZodSchema<T>,
  value: unknown,
): ValidationResult {
  const result = schema.safeParse(value);
  if (result.success) {
    return { isValid: true };
  }
  return {
    isValid: false,
    error: result.error.errors[0]?.message || "Validation failed",
  };
}

/**
 * Zod Schemas
 */
const handleSchema = z
  .string()
  .trim()
  .min(1, "Please enter your handle")
  .transform((val) => (val.startsWith("@") ? val.slice(1) : val))
  .pipe(
    z
      .string()
      .min(3, "Handle is too short")
      .regex(/^[a-zA-Z0-9.-]+$/, "Handle contains invalid characters")
      .refine((val) => val.includes("."), {
        message: "Handle must include a domain (e.g., username.bsky.social)",
      })
      .refine((val) => !/^[.-]|[.-]$/.test(val), {
        message: "Handle cannot start or end with . or -",
      }),
  );

const emailSchema = z
  .string()
  .trim()
  .min(1, "Please enter your email")
  .email("Please enter a valid email address");

/**
 * Validate AT Protocol handle
 */
export function validateHandle(handle: string): ValidationResult {
  return validateWithZod(handleSchema, handle);
}

/**
 * Validate email format
 */
export function validateEmail(email: string): ValidationResult {
  return validateWithZod(emailSchema, email);
}

/**
 * Validate required field
 */
export function validateRequired(
  value: string,
  fieldName: string = "This field",
): ValidationResult {
  const schema = z.string().trim().min(1, `${fieldName} is required`);
  return validateWithZod(schema, value);
}

/**
 * Validate minimum length
 */
export function validateMinLength(
  value: string,
  minLength: number,
  fieldName: string = "This field",
): ValidationResult {
  const schema = z
    .string()
    .trim()
    .min(minLength, `${fieldName} must be at least ${minLength} characters`);
  return validateWithZod(schema, value);
}

/**
 * Validate maximum length
 */
export function validateMaxLength(
  value: string,
  maxLength: number,
  fieldName: string = "This field",
): ValidationResult {
  const schema = z
    .string()
    .max(maxLength, `${fieldName} must be ${maxLength} characters or less`);
  return validateWithZod(schema, value);
}

/**
 * Export schemas for advanced usage
 */
export const schemas = {
  handle: handleSchema,
  email: emailSchema,
};
