import { schemaComposer } from "graphql-compose";
import { ComparisonTypes } from "../context/types/request";
import { PagiantionTypeProps } from "./types";

class PaginationInputTypeCreator {

  private queryModel: string;

  constructor(props: PagiantionTypeProps) {
    this.queryModel = (props.queryModelName as string).toLowerCase();
  }

  public getFilterOTC() {
    return this.getPaginationFilterITC();
  }

  private getPaginationFilterITC() {
    return schemaComposer.createInputTC({
      name: this.queryModel + "PaginationFilterInput",
      fields: {
        and: () => [this.getFilterClauseITC("And")],
        or: () => [this.getFilterClauseITC("Or")],
        definedFilters: () => [this.getDefinedFilterITC()]
      }
    })
  }

  private getFilterClauseITC(type: "And" | "Or") {
    return schemaComposer.createInputTC({
      name: this.queryModel + type + "FilterClauseInput",
      description: "Use $ for nested keys, f.ex event$key (event.key)",
      fields: {
        fieldKey: "String!",
        value: "String!",
        like: "Boolean",
        comparison: () => this.getComparisonTC()
      }
    })
  }

  private getDefinedFilterITC() {
    return schemaComposer.createInputTC({
      name: this.queryModel + "DefinedFilterInput",
      fields: {
        filterKey: "String!",
        optionKey: "String!"
      }
    })
  }

  private getComparisonTC() {
    return schemaComposer.createEnumTC(`enum Comparison { ${Object.keys(ComparisonTypes).join(" ")} }`);
  }
}

export const getPagiantionFilterITC = (queryModelName: string) => {
  return new PaginationInputTypeCreator({ queryModelName }).getFilterOTC();
}