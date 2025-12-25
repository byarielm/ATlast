import { z } from "zod";
import { ValidationError } from "../core/errors";

/**
 * Validation utility schemas using Zod
 * Provides type-safe validation with clear error messages
 */

/**
 * Generic array validation schema factory
 * @param itemSchema - Zod schema for array items
 * @param maxLength - Maximum array length
 * @param fieldName - Name of field for error messages
 */
export function createArraySchema<T extends z.ZodTypeAny>(
  itemSchema: T,
  maxLength: number,
  fieldName: string = "items",
) {
  return z
    .array(itemSchema)
    .min(1, `${fieldName} array is required and must not be empty`)
    .max(maxLength, `Maximum ${maxLength} ${fieldName} per batch`);
}

/**
 * Common validation schemas
 */
export const ValidationSchemas = {
  // DIDs array (max 100)
  didsArray: createArraySchema(z.string(), 100, "DIDs"),

  // Usernames array (max 50)
  usernamesArray: createArraySchema(z.string(), 50, "usernames"),

  // Generic string array with custom max
  stringArray: (maxLength: number, fieldName: string = "items") =>
    createArraySchema(z.string(), maxLength, fieldName),
};

/**
 * Validates input against a Zod schema and throws ValidationError on failure
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Parsed and validated data
 * @throws ValidationError if validation fails
 */
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);

  if (!result.success) {
    // Extract first error message for cleaner API responses
    const firstError = result.error.issues[0];
    const message = firstError.message;
    throw new ValidationError(message);
  }

  return result.data;
}

/**
 * Parses request body and validates array input
 * Common pattern: JSON.parse(body) -> extract array -> validate
 */
export function validateArrayInput<T>(
  body: string | null,
  fieldName: string,
  schema: z.ZodArray<any>,
): T[] {
  const parsed = JSON.parse(body || "{}");
  const data = parsed[fieldName];

  return validateInput(schema, data);
}
