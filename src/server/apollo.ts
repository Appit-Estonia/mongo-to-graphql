import { ApolloServer } from "apollo-server-express";
import { GraphContext } from "../context/types/request";
import http from "http";
import jwt from "jsonwebtoken";
import { ApolloServerPluginDrainHttpServer } from "apollo-server-core";
import app from "./app";
import { StartupParams } from ".";
import { MongoQL } from "../context";

const getUser = (token: string, jwtSecret: string) => {
  try {
    if (!!jwtSecret && !!token) {
      return jwt.verify(token, jwtSecret);
    }
    return null;
  } catch (error) {
    // console.log(error)
    return null;
  }
};

export async function startApolloServer(params: StartupParams) {

  const { contextSetup, jwtSecret, serverPort } = params;
  const port = serverPort ?? 4001;

  const mql = new MongoQL(contextSetup);

  const httpServer = http.createServer(app);
  const server = new ApolloServer({
    typeDefs: mql.getSchema(),
    resolvers: mql.getResolvers(),
    context: ({ req }) => {
      const token = req.get("Authorization") || "";
      return { user: getUser(token.replace("Bearer ", ""), jwtSecret) } as GraphContext;
    },
    csrfPrevention: true,
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
  });
  await server.start();
  server.applyMiddleware({ app });
  await new Promise<void>((resolve) =>
    httpServer.listen({ port }, resolve)
  );
  console.log(`🚀 Server ready at http://localhost:${port}${server.graphqlPath}`);
}