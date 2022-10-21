import { isString, schemaComposer } from "graphql-compose";
import { ObjectTypeComposerWithMongooseResolvers } from "graphql-compose-mongoose";
import { Document } from "mongoose";
import { getBaseResolver } from "../resolverLogic/resolverGetter";
import { getOTC } from "../typeComposerLogic/typeComposerGetter";
import { TResolver } from "../resolverLogic/types";
import { ResolverDefinition, SchemaFields, Setup, ResolverArgs, TResolverType } from "./types/setup";

const composerScalars = ["String", "Float", "Int", "Boolean", "ID", "Date", "JSON"];

export class MongoQL {

  private setup: Setup;

  constructor(setup: Setup) {
    this.setup = setup;
    let queries = {};
    let mutations = {};

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
    this.getOTC(modelKey).addResolver(getBaseResolver(resolver, {
      modelSet: this.setup[modelKey].modelSet,
      queryModelName: modelKey,
      typeComposer: this.getOTC(modelKey) as ObjectTypeComposerWithMongooseResolvers<Document<any, any, any>, any>
    }));
  }

  private addCustomResolver(modelKey: string, resolver: ResolverDefinition) {

    const { args, name, type: draftType, ...resolverDefinitions } = resolver;
    const isCustomType = isString(draftType);

    let schemaResolver = { ...resolverDefinitions, ...{ name }, };

    if (draftType) {
      schemaResolver = {
        ...schemaResolver,
        ...{ type: isCustomType ? this.getResolverCustomType(draftType) : this.getResolverTypes(draftType) }
      }
    }

    if (args) {
      schemaResolver = {
        ...schemaResolver,
        ...{ args: args.combined ? this.getResolverCombinedArgs(args) : args.fields }
      }
    }

    this.getOTC(modelKey).addResolver(schemaResolver);
  }

  private getResolverCustomType(draftType: TResolverType) {
    if (!isString(draftType)) { throw new Error("Resolver draft custom type must be string"); }

    const arrayType = /\[(.*?)\]/.exec(draftType);
    return !!arrayType ? [this.getOTC(arrayType[1])] : this.getOTC(draftType);
  }

  private getResolverTypes(draftType: TResolverType) {
    if (isString(draftType)) { throw new Error("Resolver draft type must be an object"); }

    const otc = (fieldValue: string) => {
      const type = this.getFieldValueType(fieldValue);
      switch (type) {
        case "enum": return this.getOrCreateEnumOTC(fieldValue);
        case "model": return this.getOTC(fieldValue);
        default: return fieldValue;
      }
    }

    let fields = {};
    for (const fieldKey in draftType.fields) {
      fields = {
        ...fields,
        ...{
          [fieldKey]: otc(draftType.fields[fieldKey])
        }
      }
    }

    return schemaComposer.createObjectTC({ name: draftType.name, fields });
  }

  private getResolverCombinedArgs(draftArgs: ResolverArgs) {
    const { modelName, argName, fieldName, additionalFields, includedFields } = draftArgs.combined!;
    const otc = this.getOTC(modelName).getInputTypeComposer();

    otc.removeOtherFields(includedFields ?? []);
    if (additionalFields) {
      otc.addFields(additionalFields)
    }

    return {
      [fieldName]: schemaComposer.createInputTC({
        name: argName,
        fields: () => otc.getFields()
      })
    }
  }

  private getFieldValueType(fieldValue: string) {
    if (fieldValue.startsWith("enum:")) {
      return "enum";
    } else if (getComposerScalars().includes(fieldValue)) {
      return "scalar";
    } else {
      return "model";
    }
  }

  /**
 * Get OTC from string "{modelName}: {selectedField1} {selectedField2} ..."
 */
  private getOTC(fieldValue: string) {
    const splitted = fieldValue.split(":");
    const modelName = splitted[0];
    const selectedFields = splitted.length > 1 ? splitted[1].split(" ").map(s => s.trim()) : [];

    const otc = getOTC(modelName, this.getModelSet(modelName));

    if (selectedFields.length > 0) {
      otc.removeOtherFields(selectedFields)
    }
    return otc;
  }

  /**
   * Get or create enum OTC from string "enum:{enumName} {value1} {value2} ..."
   */
  private getOrCreateEnumOTC(fieldType: string) {
    const splitted = fieldType.split(" ");
    const enumName = splitted[0].split(":")[1];
    const enumValues = splitted.slice(1);

    return schemaComposer.isEnumType(enumName)
      ? schemaComposer.getETC(enumName)
      : schemaComposer.createEnumTC(`enum ${enumName} {${enumValues.join(" ")}}`);
  }

  private getModelSet(modelKey: string) {
    const modelSet = this.setup[modelKey].modelSet;
    if (modelSet) { return modelSet; }
    throw new Error(`Unknown query model ${modelKey}`);
  }

  private getSchemaFields(modelKey: string, schemaFields: SchemaFields) {
    let res = {};
    for (const fieldKey in schemaFields) {
      const field = schemaFields[fieldKey];
      const resolverName = field.mongoResoverName ? field.mongoResoverName + modelKey : field.resolverName;

      const otc = this.getOTC(modelKey);
      //TODO: population logic should be recursive
      (this.setup[modelKey].modelSet.populates ?? []).forEach(p => {
        otc.removeField(p.options.path);
        otc.addFields({ [p.options.path]: this.getOTC(p.modelName) });
      });

      res = { ...res, [fieldKey]: otc.getResolver(resolverName!) }
    }

    return res;
  }
}

const getComposerScalars = () => {
  return [
    ...composerScalars,
    ...composerScalars.map(s => `${s}!`),
    ...composerScalars.map(s => `[${s}]`),
    ...composerScalars.map(s => `[${s}]!`),
  ]
}
