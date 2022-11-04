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
  fieldKey: string;
  value: string;
  comparison?: TComparison;
}

interface DefinedFilterParams {
  filterKey: string;
  optionKey: string;
}
