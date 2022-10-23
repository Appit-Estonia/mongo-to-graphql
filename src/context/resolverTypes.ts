import { isString, schemaComposer } from "graphql-compose";
import { getOTC } from "../typeComposerLogic/typeComposerGetter";
import { getFieldValueType } from "./helpers";
import { TResolverType } from "./types/setup";

export const getResolverCustomType = (draftType: TResolverType) => {
  if (!isString(draftType)) { throw new Error("Resolver draft custom type must be string"); }

  const arrayType = /\[(.*?)\]/.exec(draftType);
  return !!arrayType ? [getOTC(arrayType[1])] : getOTC(draftType);
}

export const getResolverTypes = (draftType: TResolverType) => {
  if (isString(draftType)) { throw new Error("Resolver draft type must be an object"); }

  const otc = (fieldValue: string) => {
    const type = getFieldValueType(fieldValue);
    switch (type) {
      case "model": return getOTC(fieldValue);
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