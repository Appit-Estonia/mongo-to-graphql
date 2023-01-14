import { ObjectTypeComposer, schemaComposer } from "graphql-compose";
import { composeMongoose, ObjectTypeComposerWithMongooseResolvers } from "graphql-compose-mongoose";
import { reduce } from "lodash";
import { getModelSetup, getSetup } from "../context";
import { populateProps } from "../resolverLogic/helpers";
import { getResolverTypes } from "../context/resolverTypes";
import { capitalizeFirstOnly } from "../context/helpers";


export const getOTC = (modelName: string) => {
  if (schemaComposer.isObjectType(modelName)) {
    return schemaComposer.getOTC(modelName);
  }

  const modelSet = getModelSetup(modelName).modelSet;

  let tc: ObjectTypeComposer<any, any> | ObjectTypeComposerWithMongooseResolvers<any, any>;

  // if not model based (mongoose) model, set composer name as setup key
  const isModelTyped = !!modelSet.model.name;
  if (isModelTyped) {
    tc = composeMongoose(modelSet.model);
  } else {
    modelSet.model.name = modelName;
    tc = schemaComposer.createObjectTC(modelSet.model);
  }

  tc.getInputTypeComposer().removeField(getSetup().readonlyFields ?? []);

  getModelSetup(modelName).modelSet?.populates?.forEach(p => {
    let propPath: string[] = [];

    p.key.split(".").forEach(k => {

      const { isArray, key } = populateProps(k);
      propPath = [...propPath, key];
      const prop = propPath.join(".");
      const fields = reduce(p.fields, (result, value, key) => ({ ...result, ...{ [key]: `*${value}` } }), {});

      if (p.fields && p.fields[key]) {
        tc.addNestedFields({
          [prop]: getResolverTypes({
            name: modelName + capitalizeFirstOnly(p.displayName || k),
            fields: isArray ? [fields] : fields
          }),
        });
      }
    });
  });
  
  return tc;
}
