import { ApiError } from "./ApiError";

export class ValidationError extends ApiError {
  constructor(message: string, details?: string) {
    super(message, 400, details);
    this.name = "ValidationError";
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}
