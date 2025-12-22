/**
 * Validation utilities for forms
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validate AT Protocol handle
 */
export function validateHandle(handle: string): ValidationResult {
  const trimmed = handle.trim();

  if (!trimmed) {
    return {
      isValid: false,
      error: "Please enter your handle",
    };
  }

  // Remove @ if user included it
  const cleanHandle = trimmed.startsWith("@") ? trimmed.slice(1) : trimmed;

  // Basic format validation
  if (cleanHandle.length < 3) {
    return {
      isValid: false,
      error: "Handle is too short",
    };
  }

  // Check for valid characters (alphanumeric, dots, hyphens)
  const validFormat = /^[a-zA-Z0-9.-]+$/;
  if (!validFormat.test(cleanHandle)) {
    return {
      isValid: false,
      error: "Handle contains invalid characters",
    };
  }

  // Must contain at least one dot (domain required)
  if (!cleanHandle.includes(".")) {
    return {
      isValid: false,
      error: "Handle must include a domain (e.g., username.bsky.social)",
    };
  }

  // Can't start or end with dot or hyphen
  if (/^[.-]|[.-]$/.test(cleanHandle)) {
    return {
      isValid: false,
      error: "Handle cannot start or end with . or -",
    };
  }

  return { isValid: true };
}

/**
 * Validate email format
 */
export function validateEmail(email: string): ValidationResult {
  const trimmed = email.trim();

  if (!trimmed) {
    return {
      isValid: false,
      error: "Please enter your email",
    };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    return {
      isValid: false,
      error: "Please enter a valid email address",
    };
  }

  return { isValid: true };
}

/**
 * Validate required field
 */
export function validateRequired(
  value: string,
  fieldName: string = "This field",
): ValidationResult {
  const trimmed = value.trim();

  if (!trimmed) {
    return {
      isValid: false,
      error: `${fieldName} is required`,
    };
  }

  return { isValid: true };
}

/**
 * Validate minimum length
 */
export function validateMinLength(
  value: string,
  minLength: number,
  fieldName: string = "This field",
): ValidationResult {
  const trimmed = value.trim();

  if (trimmed.length < minLength) {
    return {
      isValid: false,
      error: `${fieldName} must be at least ${minLength} characters`,
    };
  }

  return { isValid: true };
}

/**
 * Validate maximum length
 */
export function validateMaxLength(
  value: string,
  maxLength: number,
  fieldName: string = "This field",
): ValidationResult {
  if (value.length > maxLength) {
    return {
      isValid: false,
      error: `${fieldName} must be ${maxLength} characters or less`,
    };
  }

  return { isValid: true };
}
