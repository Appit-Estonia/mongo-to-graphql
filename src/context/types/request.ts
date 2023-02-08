import { Types } from "mongoose";
import { CurrentUserPayload } from "./userPayload";

export interface RequestContent {
  args: RequestArgs;
  context: GraphContext;
}

export interface GraphContext {
  user: CurrentUserPayload;
}

export interface RequestArgs {
  id: string;
  ids: string[];
  page: number;
  perPage: number;
  record: any;
  paginationFilter: PaginationFilter;
  filter: {
    _id: Types.ObjectId;
    organisation: Types.ObjectId;
    [param: string]: any;
  };
  limit: number;
  sort: string[];
  skip: number;
  [arg: string]: any;
  tableName: string;
}

export interface PaginationFilter {
  and?: BaseFilterParams[];
  or?: BaseFilterParams[];
  definedFilters?: DefinedFilterParams[];
}

export const ComparisonTypes = { like: "like", eq: "$eq", gt: "$gt", gte: "$gte", in: "$in", lt: "$lt", lte: "$lte", ne: "$ne", nin: "$nin" }

export type TComparison = keyof typeof ComparisonTypes;

export interface BaseFilterParams {
  fieldKey: "String!",

  // string inputs
  equals?: string;
  not?: string;
  like?: string;
  in?: string[];
  notIn?: string[];
  inLike?: string[];
  lessThan?: string;
  greaterThan?: string;
  greaterOrEquals?: string;
  lessOrEquals?: string;
  between?: {
    from: string;
    to: string;
  };

  // number inputs
  numberEquals?: number;
  numberNot?: number;
  numberIn?: number[],
  numberNotIn?: number[],
  numberLessThan?: number;
  numberGreaterThan?: number;
  numberGreaterOrEquals?: number;
  numberLessOrEquals?: number;
  numberBetween?:  {
    from: number;
    to: number;
  };

  // boolean inputs
  booleanEquals?: boolean;
  query: any,
}

interface DefinedFilterParams {
  filterKey: string;
  optionKey: string;
}
