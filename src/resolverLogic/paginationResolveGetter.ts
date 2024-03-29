import { groupBy, isEmpty } from "lodash";
import mongoose, { Types } from "mongoose";
import { getUserId, ObjectId } from "../permissionsLogic/validate-permission";
import { getFilterComparison, getSorting } from "./helpers";
import { BadRequestError } from "../errors/badRequestError";
import { PagiantionTypeProps } from "../typeComposerLogic/types";
import { ModelSet } from "../context/types/setup";
import { BaseFilterParams, PaginationFilter, RequestContent } from "../context/types/request";
import { getPopulates } from "./resolverGetter";

type TFilterValue = boolean | string | number | RegExp | Types.ObjectId;
type TFilterValues = string[] | number[] | RegExp[] | Types.ObjectId[];

interface TComparisonType { [key: string]: {[comparison: string]: TFilterValue | TFilterValues} }

interface DefinedFilterKeyPair {
  filterKey: string;
  optionKey: string;
}

interface QueryTableInfoProps {
  searchableFieldsOnly: boolean;
  userId: mongoose.Types.ObjectId | null;
}

export interface IColumnSettings {
  key: string;
  visible?: boolean;
  order?: number;
  width?: number;
}

export class PaginationResolveCreator {

  private queryModelName: string;

  constructor(props: PagiantionTypeProps) {
    this.queryModelName = props.queryModelName;
  }

  public getResolve = async (req: RequestContent, modelSet: ModelSet) => {

    const { page, perPage } = req.args;
    const firstPage = 1;
    const per = perPage ?? firstPage;
    const currentPage = page ?? 1;

    // for performance safety
    if (per < 1 || per > 10000) {
      throw new BadRequestError("error.per_page_not_between_1_10000");
    }

    const { model, selectedFields, defaultFields, filters } = await this.getQueryTableInfo({
      userId: getUserId(req.context),
      searchableFieldsOnly: true,
    }, modelSet);

    const ands = [
      ...req.args?.paginationFilter?.and ?? []
    ];

    const paginationFilter = {
      ...req.args?.paginationFilter ?? {},
      ...{ and: ands }
    };

    const filter = await this.getPaginationFilter(paginationFilter, modelSet);
    const selectedFieldsNames = selectedFields.map(s => s.key);
    const count = await model.count(filter).select(selectedFieldsNames);
    let items = (await model.find(
      filter,
      null,
      {
        limit: req.args.perPage,
        skip: (currentPage - 1) * req.args.perPage ?? 0,
        sort: req.args.paginationSort 
          ? getSorting(defaultFields.filter(d => !!d.paginationSort).map(d => d.paginationSort!) ?? [], req.args.paginationSort) 
          : {}
      }).populate(getPopulates(modelSet)).lean())

    return {
      count,
      items,
      pageInfo: {
        currentPage,
        perPage: per,
        pageCount: Math.ceil(count / per),
        itemCount: Math.min(per, items.length),
        hasPreviousPage: currentPage > firstPage,
        hasNextPage: currentPage * per < count,
      },
      displayFields: defaultFields.map(d => {
        const { paginationSort: sort, ...rest } = d;
        return {
          ...rest,
          ...{ sortable: !!sort }
        }
      }),
      filters
    }
  }

  private getQueryTableInfo = async (props: QueryTableInfoProps, modelSet: ModelSet) => {
    const { searchableFieldsOnly } = props;
    const defaultFields = (modelSet.displayFields ?? [])?.filter(f => !searchableFieldsOnly || !!f.searchable);

    return {
      model: modelSet.model,
      selectedFields: defaultFields?.map(d => {
        return {
          key: d.key.split(".")[0],
          visible: d.visible,
          sortable: !!d.paginationSort
        } as IColumnSettings
      }).filter(d => !!d.visible),
      defaultFields,
      filters: (modelSet.filters ?? []).map(async f => ({
        key: f.key,
        name: f.name,
        options: (await f.getOptions()).map(o => ({
          key: o.key,
          name: o.name
        }))
      }))
    }
  }

  private async getPaginationFilter(paginationFilter: PaginationFilter, modelSet: ModelSet) {
    const getFilters = (filters: BaseFilterParams[]) => {
      const res: TComparisonType[] = [];

      filters.forEach(filter => {
        const comparison = getFilterComparison(filter) as TComparisonType;
        if (comparison) {
          res.push(comparison)
        }
      });
      return res;
    }

    const andFilters = getFilters(paginationFilter?.and ?? []);
    const orFilters = getFilters(paginationFilter?.or ?? []);

    const definedFilters = paginationFilter?.definedFilters
      ? await this.getGroupedDefinedFilters(paginationFilter.definedFilters, modelSet)
      : []

    let filter = {};
    if (!isEmpty(andFilters) || !isEmpty(definedFilters)) {
      filter = { ...filter, ...{ $and: [...andFilters, ...definedFilters] } };
    }

    if (!isEmpty(orFilters)) {
      filter = { ...filter, ...{ $or: orFilters } };
    }

    return filter;
  }

  private async getGroupedDefinedFilters(filters: DefinedFilterKeyPair[], modelSet: ModelSet) {
    const definedFilters: { $or: { [key: string]: any; }[] }[] = [];
    const grouped = groupBy(filters, d => d.filterKey);

    const getDefinedFilter = async (keyPair: DefinedFilterKeyPair) => {
      return (await modelSet.model.filters
        ?.find((f: any) => f.key === keyPair.filterKey)?.getOptions())
        ?.find((o: any) => o.key === keyPair.optionKey)?.filter;
    }

    for (let i = 0; i < Object.keys(grouped).length; i++) {

      const filters = Object.values(grouped)[i].map(async keyPair => {
        const filter = await getDefinedFilter(keyPair);
        if (!filter) {
          throw new Error(`Unknown defined filter "${keyPair.filterKey}: ${keyPair.optionKey}"`)
        }
        return filter;
      })

      definedFilters.push({ $or: await Promise.all(filters) });
    }

    return definedFilters;
  }
}