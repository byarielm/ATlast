import { ApiError } from "./ApiError";

export class DatabaseError extends ApiError {
  constructor(message: string = "Database operation failed", details?: string) {
    super(message, 500, details);
    this.name = "DatabaseError";
    Object.setPrototypeOf(this, DatabaseError.prototype);
  }
}
