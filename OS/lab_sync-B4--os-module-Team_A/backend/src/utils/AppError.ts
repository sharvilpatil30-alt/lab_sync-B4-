export class AppError extends Error {
  public statusCode: number;
  public errors: string[];

  constructor(message: string, statusCode: number = 400, errors: string[] = []) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}
