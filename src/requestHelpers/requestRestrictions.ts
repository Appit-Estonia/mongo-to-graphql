import { RequestContent } from "../context/types/request";
import { NotAuthenticatedError } from "../errors/notAuthenticated";

export const authenticationCheck = (requestContent: RequestContent) => {
  if (!requestContent.context.user) {
    throw new NotAuthenticatedError();
  }
}
