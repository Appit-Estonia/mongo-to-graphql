import { CustomError } from "./customError";

export class NotAuthenticatedError {
  statusCode = 401;
  constructor() {
    // super("error.not_authenticated");

    Object.setPrototypeOf(this, NotAuthenticatedError.prototype)
  }

  serializeErrors() {
    return [
      { message: "error.not_authenticated" }
    ]
  }
}