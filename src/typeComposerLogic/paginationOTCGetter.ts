import { schemaComposer } from "graphql-compose";
import { ModelSet } from "../context/types/setup";
import { getOTC } from "./typeComposerGetter";
import { PagiantionTypeProps } from "./types";
import { capitalize, reduce } from "lodash";
import { getModelSetup } from "../context";
import { getResolverTypes } from "../context/resolverTypes";

class PaginationOutputTypeCreator {

  private queryModelName: string;
  private modelSet: ModelSet;

  constructor(props: PagiantionTypeProps) {
    this.queryModelName = props.queryModelName;
    if (!props.modelSet) {
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
        items: () => {

          const populates = getModelSetup(this.queryModelName).modelSet.paginationOptions?.populates;
          const otc = schemaComposer.createObjectTC({
            name: this.queryModelName + "PaginationTypeItems",
            fields: getOTC(this.queryModelName).getFields()
          });

          populates?.forEach(p => {
            let propPath: string[] = [];
            p.key.split(".").forEach(k => {

              propPath = [...propPath, k];
              const prop = propPath.join(".");

              if (p.fields && p.fields[k]) {
                otc.removeField(prop);
                otc.addNestedFields({
                  [prop]: getResolverTypes({
                    name: this.queryModelName + "PaginationTypeItem" + capitalize(k),
                    fields: reduce(p.fields, (result, value, key) => ({ ...result, ...{ [key]: `*${value}` } }), {})
                  })
                });
              }
            });
          });

          return [otc]
        },
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
