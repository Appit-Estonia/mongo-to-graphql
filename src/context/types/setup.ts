import { ObjectTypeComposerArgumentConfigMapDefinition, ResolverDefinition as ResolverDefinitionBase } from "graphql-compose";
import { resolverFactory } from "graphql-compose-mongoose";
import { PopulateOptions } from "mongoose";
import { RequestContent } from "./request";


export interface Setup {
  models: {
    [modelName: string]: {
      modelSet: ModelSet;
      queries?: SchemaField[];
      mutations?: SchemaField[];
    };
  };
  readonlyFields?: string[];
}

export interface ModelSet {
  /** Mongoose model */
  model: any;
  /** Parameters for displaying data */
  displayFields?: DisplayField[];
  /** Query filters */
  filters?: Filter[];
  /** Query population parameters */
  populates?: {
    modelName: string;
    options: PopulateOptions
  }[];
  /** Validations before executing query */
  requestValidations?: {
    [key: string]: ((requestContent: RequestContent) => void)[];
  };
}

export interface ResolverDefinition extends Omit<ResolverDefinitionBase<any, any, any>, "type" | "args"> {
  type?: TResolverType;
  args?: ResolverArgs;
}

export type TField = { [key: string]: string; };

export type TResolverType = string | {
  name: string;
  fields: TField | [TField];
}

export interface ResolverArgs {
  combinedFields?: CombinedFields;
  fields?: ObjectTypeComposerArgumentConfigMapDefinition<any>;
}

export interface CombinedFields {
  [argName: string]: {
    modelName: string;
    fieldName: string;
    includedFields?: string[];
    additionalFields?: ObjectTypeComposerArgumentConfigMapDefinition<any>;
  }
}

export type TResolver = keyof typeof resolverFactory;

export interface SchemaField {
  name: string;
  permission: "none" | "read" | "write" | "execute";
  mongooseResolver?: TResolver
  resolver?: ResolverDefinition;
}

export interface DisplayField {
  key: string;
  name: string;
  visible: boolean;
  sort?: Sorting;
  searchable?: boolean;
}

export interface Filter {
  key: string,
  name: string,
  getOptions: () => Promise<{
    key: string,
    name: string,
    filter: {}
  }[]>
}

export interface Sorting {
  fieldName: string;
  asc?: any;
  desc?: any;
}