import { Document } from "mongoose";
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
