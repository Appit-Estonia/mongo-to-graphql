import { isString, schemaComposer } from "graphql-compose";
import { isEmpty, reduce } from "lodash";
import { getOTC } from "../typeComposerLogic/typeComposerGetter";
import { getFieldValueType } from "./helpers";
import { TResolverType } from "./types/setup";

export const getResolverModelType = (draftType: TResolverType) => {
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

  const getModelFields = (fieldKey: string, fieldValue: string) => {
    const split = fieldValue.split("*");
    const modelName = split[0];
    const mergeFields = split.length > 1;

    if (mergeFields) {
      const fields = split[1].split(" ");
      if (fields.filter(f => !!f).length === 0) {
        return getOTC(modelName).getFields();
      } else {
        return reduce(fields, (result, value, key) =>
          ({ ...result, ...{ [value]: getOTC(split[0]).getField(value) } })
          , {})
      }
    }

    return { [fieldKey]: getOTC(fieldValue) };
  }
  
  const fields = reduce(draftType.fields, (result, value, key) => {
    const type = getFieldValueType(value);
    return {
      ...result,
      ...(type === "model" ? getModelFields(key, value) : { [key]: value })
    };
  }, {})

  return schemaComposer.createObjectTC({ name: draftType.name, fields });
}