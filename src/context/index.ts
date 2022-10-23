import { isString, schemaComposer } from "graphql-compose";
import { ObjectTypeComposerWithMongooseResolvers } from "graphql-compose-mongoose";
import { Document } from "mongoose";
import { getBaseResolver } from "../resolverLogic/resolverGetter";
import { getOTC } from "../typeComposerLogic/typeComposerGetter";
import { TResolver } from "../resolverLogic/types";
import { ResolverDefinition, SchemaFields, Setup } from "./types/setup";
import { getResolverArg, getCombinedModelTypedArg } from "./resolverArgsTypes";
import { getResolverCustomType, getResolverTypes } from "./resolverTypes";

let mqSetup: Setup;
export const getSetup = (setupKey: string) => {
  return mqSetup[setupKey];
}

export class MongoQL {

  private setup: Setup;

  constructor(setup: Setup) {
    this.setup = setup;
    let queries = {};
    let mutations = {};
    mqSetup = setup;

    for (const modelKey in this.setup) {
      const setup = this.setup[modelKey];

      (setup.mongoResolvers ?? []).forEach(q => {
        this.addMongooseResolver(modelKey, q);
      });

      (setup.customResolvers ?? []).forEach(r => {
        this.addCustomResolver(modelKey, r);
      });

      queries = {
        ...queries,
        ...this.getSchemaFields(modelKey, setup.queries ?? {})
      }

      mutations = {
        ...mutations,
        ...this.getSchemaFields(modelKey, setup.mutations ?? {})
      }

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
      modelSet: this.setup[modelKey].modelSet,
      queryModelName: modelKey,
      typeComposer: getOTC(modelKey) as ObjectTypeComposerWithMongooseResolvers<Document<any, any, any>, any>
    }));
  }

  private addCustomResolver(modelKey: string, resolver: ResolverDefinition) {

    const { args, name, type: draftType, ...resolverDefinitions } = resolver;
    const isCustomType = isString(draftType);

    let schemaResolver = { ...resolverDefinitions, ...{ name }, };

    if (draftType) {
      schemaResolver = {
        ...schemaResolver,
        ...{ type: isCustomType ? getResolverCustomType(draftType) : getResolverTypes(draftType) }
      }
    }

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

  private getSchemaFields(modelKey: string, schemaFields: SchemaFields) {
    let res = {};
    for (const fieldKey in schemaFields) {
      const field = schemaFields[fieldKey];
      const resolverName = field.mongoResoverName ? field.mongoResoverName + modelKey : field.resolverName;

      const otc = getOTC(modelKey);
      //TODO: population logic should be recursive
      (this.setup[modelKey].modelSet.populates ?? []).forEach(p => {
        otc.removeField(p.options.path);
        otc.addFields({ [p.options.path]: getOTC(p.modelName) });
      });

      res = { ...res, [fieldKey]: otc.getResolver(resolverName!) }
    }

    return res;
  }
}
