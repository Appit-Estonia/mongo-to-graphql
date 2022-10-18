import { Setup } from "../context/types/setup";
import { startApolloServer } from "./apollo";

require("dotenv").config();

export interface StartupParams {
  serverPort?: number;
  jwtSecret: string;
  contextSetup: Setup;
}

export const startMongoQL = async (params: StartupParams) => {
  await startApolloServer(params);
};
