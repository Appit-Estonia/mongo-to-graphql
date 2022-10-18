import { CustomError } from "./customError";

export declare class BadRequestError extends CustomError {
  message: string;
  statusCode: number;
  constructor(message: string);
  serializeErrors(): {
    message: string;
  }[];
}