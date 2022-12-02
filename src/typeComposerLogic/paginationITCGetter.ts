import { schemaComposer } from "graphql-compose";
import { capitalizeFirstOnly } from "../context/helpers";
import { ComparisonTypes } from "../context/types/request";
import { PagiantionTypeProps } from "./types";

class PaginationInputTypeCreator {

  private modelName: string;

  constructor(props: PagiantionTypeProps) {
    this.modelName = props.queryModelName;
  }

  public getFilterOTC() {
    return this.getPaginationFilterITC();
  }

  private getPaginationFilterITC() {
    return schemaComposer.createInputTC({
      name: capitalizeFirstOnly(this.modelName) + "PaginationFilterInput",
      fields: {
        and: () => [this.getFilterClauseITC("And")],
        or: () => [this.getFilterClauseITC("Or")],
        definedFilters: () => [this.getDefinedFilterITC()]
      }
    })
  }

  private getFilterClauseITC(type: "And" | "Or") {
    return schemaComposer.createInputTC({
      name: this.modelName + type + "FilterClauseInput",
      description: "Use $ for nested keys, f.ex event$key (event.key)",
      fields: {
        fieldKey: "String!",

        // string inputs
        equals: "String",
        not: "String",
        like: "String",
        in: "[String]",
        notIn: "[String]",
        inLike: "[String]",
        lessThan: "String",
        greaterThan: "String",
        greaterOrEquals: "String",
        lessOrEquals: "String",
        between: () => this.getBetweenITC(type, "String"),

        // number inputs
        numberEquals: "Float",
        numberNot: "Float",
        numberIn: "[Float]",
        numberNotIn: "[Float]",
        numberLessThan: "Float",
        numberGreaterThan: "Float",
        numberGreaterOrEquals: "Float",
        numberLessOrEquals: "Float",
        numberBetween: () => this.getBetweenITC(type, "Number"),

        // boolean inputs
        booleanEquals: "Boolean",
      }
    })
  }

  private getBetweenITC(type: "And" | "Or", scalar: "Number" | "String") {
    const fieldType = scalar === "Number" ? "Int!" : "String!";
    return schemaComposer.createInputTC({
      name: this.modelName + type + scalar + "BetweenFilter",
      fields: {
        from: fieldType,
        to: fieldType,
      }
    })
  }

  private getDefinedFilterITC() {
    return schemaComposer.createInputTC({
      name: this.modelName + "DefinedFilterInput",
      fields: {
        filterKey: "String!",
        optionKey: "String!"
      }
    })
  }
}

export const getPagiantionFilterITC = (queryModelName: string) => {
  return new PaginationInputTypeCreator({ queryModelName }).getFilterOTC();
}