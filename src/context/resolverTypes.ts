import { isString, schemaComposer } from "graphql-compose";
import { isArray, isEmpty, reduce } from "lodash";
import { getOTC } from "../typeComposerLogic/typeComposerGetter";
import { getFieldValueType, replaceAll } from "./helpers";
import { TField, TResolverType } from "./types/setup";

export const getResolverModelType = (draftType: TResolverType) => {
  if (!isString(draftType)) { throw new Error("Resolver draft custom type must be string"); }

  const arrayType = /\[(.*?)\]/.exec(draftType);
  return !!arrayType ? [getOTC(arrayType[1])] : getOTC(draftType);
}

export const getResolverTypes = (draftType: TResolverType) => {
  if (isString(draftType)) { throw new Error("Resolver draft type must be an object"); }

  const { fields: dFields, name } = draftType;
  const isArrayTypeFields = isArray(dFields);
  const fields = isArrayTypeFields ? (dFields as [TField])[0] : dFields as TField;

  const getModelFields = (fieldKey: string, fieldValue: string) => {
    const mergeFields = fieldValue.startsWith("*");
    const isArray = fieldValue.startsWith("[");
    const split = fieldValue.split(":");
    const otc = getOTC(replaceAll(split[0], ["*", "[", "]", "!"], ""));
    const fieldNames = split[1] ? split[1].split(" ") : [];

    const selectedFields = reduce(fieldNames, (result, value) => {
      return { ...result, ...{ [value]: otc.getField(value) } }
    }, {});

    if (mergeFields) {
      return isEmpty(selectedFields) ? otc.getFields() : selectedFields;
    } else {
      return {
        [fieldKey]: isEmpty(selectedFields)
          ? isArray ? [otc] : otc
          : selectedFields
      }
    }
  }

  const fieldsType = reduce(fields, (result, value, key) => {
    const type = getFieldValueType(value);
    return {
      ...result,
      ...(type === "model" ? getModelFields(key, value) : { [key]: value }),
    };
  }, {});

  const tc = schemaComposer.createObjectTC({ name, fields: fieldsType });

  // hackish, make fields as required
  for (const key in tc.getFields()) {
    const draftField = (isArray(dFields) ? (dFields as TField[])[0] : (dFields as TField))[key];
    if (!!draftField) {
      if (draftField.endsWith("!")) {
        tc.makeFieldNonNull(key)
      }
    }
  }

  return isArrayTypeFields ? [tc] : tc;
}