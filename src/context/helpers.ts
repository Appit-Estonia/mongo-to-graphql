import { isObject, isString, ObjectTypeComposerArgumentConfigAsObjectDefinition, ObjectTypeComposerArgumentConfigDefinition } from "graphql-compose";

export type TArgField = string | ObjectTypeComposerArgumentConfigDefinition;

const COMPOSER_SCALARS = ["String", "Float", "Int", "Boolean", "ID", "Date", "JSON", "MongoID"];

export const isShort = (field: TArgField): field is string => isString(field);

export const getFieldValueType = (field: TArgField) => {

  const fieldValue = isShort(field) ? field : (field as ObjectTypeComposerArgumentConfigAsObjectDefinition).type;

  if (isObject(fieldValue)) {
    return "object";
  } else if (fieldValue.startsWith("enum:")) {
    return "enum";
  } else if (getComposerScalars().includes(fieldValue)) {
    return "scalar";
  } else {
    return "model";
  }
}

const getComposerScalars = () => {
  return [
    ...COMPOSER_SCALARS,
    ...COMPOSER_SCALARS.map(s => `${s}!`),
    ...COMPOSER_SCALARS.map(s => `[${s}]`),
    ...COMPOSER_SCALARS.map(s => `[${s}]!`),
  ]
}