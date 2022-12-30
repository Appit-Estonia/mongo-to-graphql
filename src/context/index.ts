import { isString, ResolverResolveParams, ResolverRpCb, schemaComposer } from "graphql-compose";
import { ObjectTypeComposerWithMongooseResolvers } from "graphql-compose-mongoose";
import { Document } from "mongoose";
import { getBaseResolver } from "../resolverLogic/resolverGetter";
import { getOTC } from "../typeComposerLogic/typeComposerGetter";
import { SchemaField, Setup } from "./types/setup";
import { getResolverArg, getCombinedModelTypedArg } from "./resolverArgsTypes";
import { getResolverModelType, getResolverTypes } from "./resolverTypes";
import { validateUserAccess } from "../permissionsLogic/validate-permission";

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

    setup.nonModelTypeComposers?.forEach(t => {
      const isModelType = isString(t);
      const c = isModelType ? getResolverModelType(t) : getResolverTypes(t)
      schemaComposer.add(c);
    });

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

  private addMongooseResolver(modelKey: string, schemaField: SchemaField) {
    const { ignoreUserAccess, mongooseResolver, name, userReferenceName } = schemaField;

    if (!mongooseResolver) {
      throw new Error(`Missing resolver for field '${name}'`)
    }

    getOTC(modelKey).addResolver(getBaseResolver(mongooseResolver, {
      modelSet: this.setup.models[modelKey].modelSet,
      queryModelName: modelKey,
      ignoreUserAccess,
      userReferenceName,
      typeComposer: getOTC(modelKey) as ObjectTypeComposerWithMongooseResolvers<Document<any, any, any>, any>
    }));
  }

  private addCustomResolver(modelKey: string, field: SchemaField) {

    const { ignoreUserAccess, resolver } = field;
    const { args, name, type: draftType, ...resolverDefinitions } = resolver!;
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

    getOTC(modelKey).addResolver(schemaResolver).wrapResolverResolve(name!,
      (next: ResolverRpCb<any, any, any>) => (rp: ResolverResolveParams<any, any, any>) => {
        const { context } = rp;
        validateUserAccess(context, ignoreUserAccess);
        return next(rp);
      });
  }

  private getSchemaFields(modelKey: string, field: SchemaField) {
    if (field.mongooseResolver) {
      this.addMongooseResolver(modelKey, field);
    }
    if (field.resolver) {
      this.addCustomResolver(modelKey, field);
    }

    const resolverName = field.resolver ? field.resolver.name : field.mongooseResolver + modelKey;
    const otc = getOTC(modelKey);

    return { [field.name]: otc.getResolver(resolverName!).withMiddlewares(field.middlewares || []) }
  }
}
