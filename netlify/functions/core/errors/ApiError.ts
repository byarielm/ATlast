export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public details?: string,
  ) {
    super(message);
    this.name = "ApiError";
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}
