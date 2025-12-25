import { ApiError } from "./ApiError";

export class NotFoundError extends ApiError {
  constructor(message: string = "Resource not found", details?: string) {
    super(message, 404, details);
    this.name = "NotFoundError";
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}
