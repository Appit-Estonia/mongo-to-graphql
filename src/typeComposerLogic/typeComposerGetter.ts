import { schemaComposer } from "graphql-compose";
import { composeMongoose, ObjectTypeComposerWithMongooseResolvers } from "graphql-compose-mongoose";
import { Document } from "mongoose"
import { getSetup } from "../context";
import { ModelSet } from "../context/types/setup";

class TypeComposerCreator {

  private typeComposer: ObjectTypeComposerWithMongooseResolvers<Document<any, any, any>, any>;
  private modelSet: ModelSet;

  constructor(modelSet: ModelSet) {
    this.modelSet = modelSet;
    this.typeComposer = composeMongoose(this.modelSet.model);
  }

  public getOTC() {
    this.typeComposer.getInputTypeComposer().removeField([
      ...["version", "createdAt", "updatedAt"]
    ]);
    return this.typeComposer;
  }
}

export const getOTC = (queryTable: string) => {
  return schemaComposer.isObjectType(queryTable)
    ? schemaComposer.getOTC(queryTable)
    : new TypeComposerCreator(getSetup(queryTable).modelSet).getOTC();
}
