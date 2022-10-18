import { InputTypeComposerFieldConfigMapDefinition, ObjectTypeComposer, ObjectTypeComposerFieldConfigMapDefinition, SchemaComposer } from "graphql-compose";
import { Document, PopulateOptions } from "mongoose"
import { ObjectTypeComposerWithMongooseResolvers } from "graphql-compose-mongoose";
import { DisplayField, ModelSet } from "../context/types/setup";
import { RequestContent } from "../context/types/request";

export type TMongooseOTC = ObjectTypeComposerWithMongooseResolvers<Document<any, any, any>, any>;

export interface ResolverValidations {
  removalValidation: (req: RequestContent) => Promise<void>;
}

export interface TypeComposerOptions {
  additionalInputFields?: InputTypeComposerFieldConfigMapDefinition;
  additionalOutputFields?: ObjectTypeComposerFieldConfigMapDefinition<Document<any, any, any>, any>;
  populates?: PopulateOptions[];
  removedInputFields?: string[];
  displayFields?: DisplayField[];
  schemaComposer?: SchemaComposer<any>;
  validations?: ResolverValidations;
}

export interface Populate {
  composerType: () => ObjectTypeComposer<any, any> | ObjectTypeComposer<any, any> | ObjectTypeComposerWithMongooseResolvers<Document<any, any, any>, any>;
  options: PopulateOptions
}

export interface PagiantionTypeProps {
  queryModelName: string;
  modelSet?: ModelSet;
}
