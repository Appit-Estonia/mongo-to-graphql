import { CustomError } from "./customError";

export class NotAuthorizedError extends CustomError {
  statusCode = 401;
  constructor() {
    super('error.not_authorized'); // only for server logging

    Object.setPrototypeOf(this, NotAuthorizedError.prototype)
  }

  serializeErrors() {
    return [
      { message: 'error.not_authorized' }
    ]
  }
}