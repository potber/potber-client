export class ApiError extends Error {
  public statusCode: number;
  public messages: string[];
  public error?: string;

  constructor(statusCode: number, error: string, message: string | string[]) {
    super(JSON.stringify(message));
    this.statusCode = statusCode;
    let messages: string[] = [];
    if (Array.isArray(message)) messages = message;
    else messages.push(message);
    this.messages = messages;
    this.error = error ?? this.message;

    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

/**
 * Thrown when a successful API response does not match the expected payload shape.
 * The message names the failing paths only, so post content and user data stay out of error reports.
 */
export class PayloadValidationError extends Error {
  public issues: string[];

  constructor(path: string, issues: string[]) {
    super(`Unexpected API payload for ${path}: ${issues.join('; ')}`);
    this.name = 'PayloadValidationError';
    this.issues = issues;
    Object.setPrototypeOf(this, PayloadValidationError.prototype);
  }
}
