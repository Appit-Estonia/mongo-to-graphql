import { InputTypeComposerFieldConfigMap, isString, ObjectTypeComposerArgumentConfigAsObjectDefinition, ObjectTypeComposerArgumentConfigDefinition, ObjectTypeComposerArgumentConfigMapDefinition, schemaComposer } from "graphql-compose";
import { getOTC } from "../typeComposerLogic/typeComposerGetter";
import { getFieldValueType, isShort, TArgField } from "./helpers";
import { CombinedFields } from "./types/setup";

export const getScalarTypedArg = (field: TArgField) => {
  return field as ObjectTypeComposerArgumentConfigDefinition;
}

export const getModelTypedArg = (field: TArgField) => {

  if (isShort(field)) {
    const splitted = field.split(":");

    const fields = reducedFields({
      otcFields: getOTC(splitted[0]).getInputTypeComposer().getFields(),
      selectedFields: splitted.length > 1 ? splitted[1].split(" ").map(s => s.trim()) : []
    });

    const itc = getOTC(splitted[0]).getInputTypeComposer();
    itc.setFields(fields);

    return itc;
  }

  return field;

}

export const getEnumTypedArg = (field: TArgField) => {

  const getenumtc = (type: string) => {
    const splitted = type.split(" ");
    const enumName = splitted[0].split(":")[1];
    const enumValues = splitted.slice(1).map(s => ({ [s]: { value: s } }));

    return schemaComposer.isEnumType(enumName)
      ? schemaComposer.getETC(enumName)
      : schemaComposer.createEnumTC({
        name: enumName,
        values: enumValues.reduce((a, v) => ({ ...a, ...v }), {})

      })
  }

  if (isString(field)) {
    return getenumtc(field);
  } else {
    const fieldAsTC = field as ObjectTypeComposerArgumentConfigAsObjectDefinition;
    const typeName = fieldAsTC.type.toString();
    fieldAsTC.type = () => getenumtc(typeName);
    return fieldAsTC;
  }

}

export const getCombinedModelTypedArg = (draftArgs: CombinedFields) => {

  let args = {};
  for (const argName in draftArgs) {
    const { modelName, fieldName, additionalFields, includedFields } = draftArgs[argName];

    const fieldsInitial =  getOTC(modelName).getInputTypeComposer().getFields();
    let fields = {};

    // add included fields
    for (const key in fieldsInitial) {
      if (includedFields?.includes(key)) {
        fields = { ...fields, ...{ [key]: fieldsInitial[key] } }
      }
    }

    // add additional fields
    for (const key in additionalFields ?? {}) {
      if (!additionalFields) continue
      const fieldValue = additionalFields[key].toString();
      if (getFieldValueType(fieldValue) === "enum") {
        additionalFields[key] = getEnumTypedArg(fieldValue);
      }
      fields = { ...fields, ...{ [key]: additionalFields[key] } }
    }

    args = {
      ...args,
      ...{
        [argName]: schemaComposer.createInputTC({
          name: fieldName,
          fields
        })
      }
    }
  }

  return args;
}

const reducedFields = (params: { otcFields: InputTypeComposerFieldConfigMap, selectedFields: string[] }) => {

  const { otcFields, selectedFields } = params

  if(selectedFields.length === 0) {
    return otcFields;
  }

  let fields = {}
  for (const key in otcFields) {
    if (selectedFields.includes(key)) {
      fields = { ...fields, ...otcFields[key] }
    }
  }
  return fields as InputTypeComposerFieldConfigMap;;
}


export const getResolverArg = (fields: ObjectTypeComposerArgumentConfigMapDefinition) => {
  let args = {};

  for (const key in fields) {
    const field = fields[key]
    const type = getFieldValueType(field);

    if (type === "enum") {
      args = { ...args, ...{ [key]: getEnumTypedArg(field) } };
    } else if (type === "model") {
      args = { ...args, ...{ [key]: getModelTypedArg(field) } };
    } else if (type === "scalar") {
      args = { ...args, ...{ [key]: getScalarTypedArg(field) } };
    } else {
      throw new Error(`Unknown args type '${type}'`)
    }
  }

  return args;
}