import { schemaComposer } from "graphql-compose";
import { getOTC } from "./typeComposerGetter";
import { PagiantionTypeProps } from "./types";

class PaginationOutputTypeCreator {

  private queryModelName: string;

  constructor(props: PagiantionTypeProps) {
    this.queryModelName = props.queryModelName;
    if (!props.modelSet) {
      throw new Error("Model set is missing for pagination OTC creator")
    }
  }

  public get() {
    return this.getPaginationType();
  }

  private getPaginationType() {
    return schemaComposer.createObjectTC({
      name: this.queryModelName + "PaginationType",
      fields: {
        count: "Int!",
        displayFields: () => [this.getPaginationDisplayFieldType()],
        items: [schemaComposer.createObjectTC({
          name: this.queryModelName + "PaginationItems",
          fields: getOTC(this.queryModelName).getFields()
        })],
        filters: () => [this.getFilterType()],
        pageInfo: () => this.getPaginationInfoType(),
      }
    });
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
