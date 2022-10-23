import { schemaComposer } from "graphql-compose";
import { ModelSet } from "../context/types/setup";
import { getOTC } from "./typeComposerGetter";
import { PagiantionTypeProps } from "./types";

class PaginationOutputTypeCreator {

  private queryModelName: string;
  private modelSet: ModelSet;

  constructor(props: PagiantionTypeProps) {
    this.queryModelName = props.queryModelName;
    if(!props.modelSet) {
      throw new Error("Model set is missing for pagination OTC creator")
    }
    this.modelSet = props.modelSet;
  }

  public get() {
    return this.getPaginationType();
  }

  private getPaginationType() {
    return schemaComposer.createObjectTC({
      name: this.queryModelName + "PaginationType",
      fields: {
        count: "Int!",
        items: () => [getOTC(this.queryModelName)],
        pageInfo: () => this.getPaginationInfoType(),
        displayFields: () => [this.getPaginationDisplayFieldType()],
        filters: () => [this.getFilterType()]
      }
    })
  }

  private getPaginationInfoType() {
    return schemaComposer.createObjectTC({
      name: this.queryModelName + "PaginationInfo",
      fields: {
        currentPage: "Int!",
        perPage: "Int!",
        pageCount: "Int",
        itemCount: "Int",
        hasNextPage: "Boolean",
        hasPreviousPage: "Boolean"
      }
    })
  }

  private getPaginationDisplayFieldType() {
    return schemaComposer.createObjectTC({
      name: this.queryModelName + "DisplayField",
      fields: {
        key: "String!",
        name: "String!",
        visible: "Boolean!",
        sortable: "Boolean!",
        order: "Int",
        width: "Int",
      }
    })
  }

  private getFilterOptionType() {
    return schemaComposer.createObjectTC({
      name: this.queryModelName + "FilterOption",
      fields: {
        key: "String!",
        name: "String!"
      }
    })
  }

  private getFilterType() {
    return schemaComposer.createObjectTC({
      name: this.queryModelName + "Filter",
      fields: {
        key: "String!",
        name: "String!",
        options: () => [this.getFilterOptionType()]!
      }
    })
  }
}

export const getPaginationOTC = (props: PagiantionTypeProps) => new PaginationOutputTypeCreator(props).get();
