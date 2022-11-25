import { schemaComposer } from "graphql-compose";
import { composeMongoose } from "graphql-compose-mongoose";
import { capitalize, reduce } from "lodash";
import { getModelSetup, getSetup } from "../context";
import { populateProps } from "../resolverLogic/helpers";
import { getResolverTypes } from "../context/resolverTypes";


export const getOTC = (modelName: string) => {
  if(schemaComposer.isObjectType(modelName)) {
    return schemaComposer.getOTC(modelName);
  }

  const modelSet = getModelSetup(modelName).modelSet;
  const tc = composeMongoose(modelSet.model);

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
            name: modelName + capitalize(k),
            fields: {
              ...(isArray ? [fields] : fields)
            },
          }),
        });
      }
    });
  });
  
  return tc;
}
