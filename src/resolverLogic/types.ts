import { ObjectTypeComposerWithMongooseResolvers, resolverFactory } from "graphql-compose-mongoose";
import { Document } from "mongoose";
import { ObjectTypeComposer, Resolver } from "graphql-compose";
import { RequestContent } from "../context/types/request";
import { ModelSet } from "../context/types/setup";

export type TResolver = keyof typeof resolverFactory;

export interface ResolverProps {
  name: string;
  type: () => ObjectTypeComposer<any, any> | [ObjectTypeComposer<any, any>];
  args: any;
  resolve: ((req: RequestContent) => Promise<any>) | undefined;
}

export interface IResolveParams {
  queryModelName: string;
  description?: string;
  modelSet: ModelSet;
  ignoreUserAccess?: boolean;
  userReferenceName?: string;
  resolverWrapper?: (resolver: Resolver) => Resolver;
  typeComposer: ObjectTypeComposerWithMongooseResolvers<Document<any, any, any>, any>;
}

export interface ISorting {
  fieldName: string;
  asc?: any;
  desc?: any;
}
