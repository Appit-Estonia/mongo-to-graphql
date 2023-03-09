// @ts-nocheck
import { ApolloServer} from "apollo-server-express";
import { GraphContext } from "../context/types/request";
import http from "http";
import jwt from "jsonwebtoken";
import { ApolloServerPluginDrainHttpServer } from "apollo-server-core";
import app from "./app";
import { StartupParams } from ".";
import { MongoQL } from "../context";
import {ApolloLogPlugin} from 'apollo-log';

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

  const { contextSetup, jwtSecret } = params;
  const port = process.env.PORT ?? 4001;

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
    introspection: !!process.env.ENABLE_SCHEMA_INTROSPECTION || process.env.NODE_ENV !== 'production',
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      process.env.NODE_ENV === "production" ? ApolloLogPlugin({
        timestamp: true,
        events: {
          didEncounterErrors: true,
          didResolveOperation: false,
          executionDidStart: false,
          parsingDidStart: false,
          responseForOperation: false,
          validationDidStart: false,
          willSendResponse: false
        },
        mutate: (data) => {
          return {
            error: data.context.errors,
            request: data.context.request,
            source: data.context.source
          }
        }
      }) : {}
    ],
  });
  await server.start();
  server.applyMiddleware({ app });

  await new Promise<void>((resolve) =>
    httpServer.listen({ port }, resolve)
  );
  console.log(`🚀 Server ready at http://localhost:${port}${server.graphqlPath}`);
}