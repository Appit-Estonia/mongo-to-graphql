import { ObjectTypeComposerArgumentConfigMapDefinition, ObjectTypeComposerDefinition, ResolverDefinition as ResolverDefinitionBase } from "graphql-compose";
import { PopulateOptions } from "mongoose";
import { TResolver } from "../../resolverLogic/types";
import { RequestContent } from "./request";


export interface Setup {
  models: {
    [modelName: string]: {
      modelSet: ModelSet;
      queries?: SchemaField[];
      mutations?: SchemaField[];
    };
  };
  userContextPaths?: {
    id?: string;
    hasAdminMode?: string;
  };
  readonlyFields?: string[];
  // TODO: type should be reconsidered
  nonModelTypeComposers?: TResolverType[];
  userRequestValidation?: () => boolean;
}

export interface PopulateOption {
  key: string;
  displayName?: string;
  options?: PopulateOptions;
  fields: { [key: string]: string };
}

export interface ModelSet {
  /** Mongoose model */
  model: any;
  populates?: PopulateOption[];
  /** Parameters for displaying data */
  displayFields?: DisplayField[];
  /** Query filters */
  filters?: Filter[];
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

export interface SchemaField {
  name: string;
  permission: "none" | "read" | "write" | "execute";
  ignoreUserAccess?: boolean;
  userReferenceName?: string;
  mongooseResolver?: TResolver
  resolver?: ResolverDefinition;
}

export interface DisplayField {
  key: string;
  name: string;
  visible: boolean;
  paginationSort?: Sorting;
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