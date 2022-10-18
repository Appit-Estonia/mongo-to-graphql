import { CustomError } from "./customError";

// should extend custom error (removed bc circular dependency occurs somewhere)
export class NotAuthorizedError {
  statusCode = 401;
  constructor() {
    // super("error.not_authorized"); // only for server logging

    Object.setPrototypeOf(this, NotAuthorizedError.prototype)
  }

  serializeErrors() {
    return [
      { message: "error.not_authorized" }
    ]
  }
}