import { Document } from "mongoose";
import { ObjectId } from "..";
import { BaseFilterParams } from "../context/types/request";
import { Sorting } from "../context/types/setup";
import { TResolver } from "./types";


export const getSorting = (sortables: Sorting[], sortNames: string[]) => {
  let sortRes = {};

  sortNames.forEach(sortName => {
    let sortPart = {};
    const name = sortName.split("_")[0];
    const isDesc = sortName.split("_")[1] === "desc";

    const sortLogic = sortables.find(s => s.fieldName === name);
    if (isDesc) {
      sortPart = sortLogic?.desc ?? { [name]: -1 };
    } else {
      sortPart = sortLogic?.asc ?? { [name]: 1 };
    }
    sortRes = { ...sortRes, ...sortPart };
  });

  return sortRes;
}

export const toRecord = (doc: Document | undefined | null) => {
  return {
    recordId: doc?._id,
    record: doc,
    error: {
      message: "None"
    }
  }
}

export const getResolverName = (resolverType: TResolver, queryModelName: string) => resolverType + queryModelName;

export const populateProps = (pathKey: string) => {
  const clean = (p: string) => p.replaceAll("[", "").replace("]", "")
  return {
    key: clean(pathKey),
    root: clean(pathKey.split(".")[0]),
    isArray: pathKey.startsWith("["),
  }
}


const filterComparisonMap = {
  equals: "eq",
  like: "regex",
  not: "ne",
  greaterThan: "gt",
  lessThan: "lt",
  greaterOrEquals: "gte",
  lessOrEquals: "lte",
  in: "in",
  inLike: "in",
  notIn: "nin",
  numberEquals: "eq",
  numberNot: "ne",
  numberGreaterThan: "gt",
  numberLessThan: "lt",
  numberGreaterOrEquals: "gte",
  numberLessOrEquals: "lte",
  numberIn: "in",
  numberNotIn: "nin",
  booleanEquals: "eq",
}

const isValidObjectId = (id: string) => {
  return ObjectId.isValid(id) && (String)(new ObjectId(id)) === id;
}

const getLikeRegex = (value: string) => new RegExp(".*" + value + ".*", "i");
const getValue = (value: any) => isValidObjectId(value) ? new ObjectId(value) : value;

export const getFilterComparison = (filter: BaseFilterParams) => {
  // Get comparison key from filter object. As there shoudn't be more filter clauses per filter then by default first comparison clause will be used
  const {fieldKey, ...rest} = filter;
  const comparisonKey = Object.keys(rest)?.[0] as keyof Omit<BaseFilterParams, 'fieldKey'>;

  if (!comparisonKey) return undefined;

  // Handle cases where value is not always string or number. 
  switch (comparisonKey) {
    case "between":
      return { [fieldKey]: { "$gte": getValue(filter.between?.from), "$lte": getValue(filter.between?.to) } }
    case "numberBetween":
      return { [fieldKey]: { "$gte": getValue(filter.numberBetween?.from), "$lte": getValue(filter.numberBetween?.to) } }
    case "inLike":
      return {[fieldKey]: { "$in": getValue(filter.inLike?.map(i => getLikeRegex(i)))}}
    default:
      return {[fieldKey]: {[`$${filterComparisonMap[comparisonKey]}`]: getValue(filter[comparisonKey])}}
  }
};