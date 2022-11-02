import { isString, schemaComposer } from "graphql-compose";
import { ObjectTypeComposerWithMongooseResolvers } from "graphql-compose-mongoose";
import { Document } from "mongoose";
import { getBaseResolver } from "../resolverLogic/resolverGetter";
import { getOTC } from "../typeComposerLogic/typeComposerGetter";
import { TResolver } from "../resolverLogic/types";
import { ResolverDefinition, SchemaField, Setup } from "./types/setup";
import { getResolverArg, getCombinedModelTypedArg } from "./resolverArgsTypes";
import { getResolverModelType, getResolverTypes } from "./resolverTypes";

let mqSetup: Setup;
export const getModelSetup = (setupKey: string) => {
  return mqSetup.models[setupKey];
}

export const getSetup = () => {
  return mqSetup;
}

export class MongoQL {

  private setup: Setup;

  constructor(setup: Setup) {
    this.setup = setup;
    let queries = {};
    let mutations = {};
    mqSetup = setup;

    for (const modelKey in this.setup.models) {
      const setup = this.setup.models[modelKey];

      setup.queries?.forEach(q => {
        queries = { ...queries, ...this.getSchemaFields(modelKey, q) }
      });
      
      setup.mutations?.forEach(m => {
        mutations = { ...mutations, ...this.getSchemaFields(modelKey, m) }
      });

      if (Object.keys(queries).length > 0) {
        schemaComposer.Query.addFields(queries);
      }

      if (Object.keys(mutations).length > 0) {
        schemaComposer.Mutation.addFields(mutations);
      }
    }
  }

  public getSchema() {
    return schemaComposer.buildSchema();
  }

  public getResolvers() {
    return schemaComposer.getResolveMethods();
  }

  private addMongooseResolver(modelKey: string, resolver: TResolver) {
    getOTC(modelKey).addResolver(getBaseResolver(resolver, {
      modelSet: this.setup.models[modelKey].modelSet,
      queryModelName: modelKey,
      typeComposer: getOTC(modelKey) as ObjectTypeComposerWithMongooseResolvers<Document<any, any, any>, any>
    }));
  }

  private addCustomResolver(modelKey: string, resolver: ResolverDefinition) {

    const { args, name, type: draftType, ...resolverDefinitions } = resolver;
    const isModelType = isString(draftType);

    let schemaResolver = { ...resolverDefinitions, ...{ name }, };

    // add types to schema
    if (draftType) {
      schemaResolver = {
        ...schemaResolver,
        ...{ type: isModelType ? getResolverModelType(draftType) : getResolverTypes(draftType) }
      }
    }

    // add args to schema
    if (args) {
      schemaResolver = {
        ...schemaResolver,
        ...{
          args: {
            ...(args.fields ? getResolverArg(args.fields) : {}),
            ...(args.combinedFields ? getCombinedModelTypedArg(args.combinedFields) : {}),
          }
        }
      }
    }

    getOTC(modelKey).addResolver(schemaResolver);
  }

  private getSchemaFields(modelKey: string, field: SchemaField) {
    let res = {};

    if (field.mongooseResolver) {
      this.addMongooseResolver(modelKey, field.mongooseResolver);
    }
    if (field.resolver) {
      this.addCustomResolver(modelKey, field.resolver);
    }

    const resolverName = field.resolver ? field.resolver.name : field.mongooseResolver + modelKey;
    const otc = getOTC(modelKey);

    // TODO: population logic should be recursive
    (this.setup.models[modelKey].modelSet.populates ?? []).forEach(p => {
      otc.removeField(p.options.path);
      otc.addFields({ [p.options.path]: getOTC(p.modelName) });
    });

    return { [field.name]: otc.getResolver(resolverName!) }
  }
}
