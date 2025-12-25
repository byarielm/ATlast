import { ApiError } from "./ApiError";

export class AuthenticationError extends ApiError {
  constructor(message: string = "Authentication required", details?: string) {
    super(message, 401, details);
    this.name = "AuthenticationError";
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}
