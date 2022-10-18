import { groupBy, isEmpty } from "lodash";
import { Types } from "mongoose";
import { getPagiantionFilterITC } from "../typeComposerLogic/paginationITCGetter";
import { getPaginationOTC } from "../typeComposerLogic/paginationOTCGetter";
import { ObjectId } from "../permissionsLogic/validate-permission";
import { getSorting } from "./helpers";
import { BadRequestError } from "../errors/badRequestError";
import { IColumnSettings } from "../models/user";
import { PagiantionTypeProps } from "../typeComposerLogic/types";
import { ModelSet } from "../context/types/setup";
import { BaseFilterParams, ComparisonTypes, PaginationFilter, RequestContent, TComparison } from "../context/types/request";


interface DefinedFilterKeyPair {
  filterKey: string;
  optionKey: string;
}

interface QueryTableInfoProps {
  searchableFieldsOnly: boolean;
  userAccountId: string;
}

class PaginationResolverCreator {

  private queryModelName: string;

  constructor(props: PagiantionTypeProps) {
    this.queryModelName = props.queryModelName;
  }

  public getResolver = async (req: RequestContent, modelSet: ModelSet) => {

    const { page, perPage } = req.args;
    const firstPage = 1;
    const per = perPage ?? firstPage;
    const currentPage = page ?? 1;

    // for performance safety
    if (per < 1 || per > 1000) {
      throw new BadRequestError("error.per_page_not_between_1_1000");
    }

    const { model, selectedFields, defaultFields, filters } = await this.getQueryTableInfo({
      userAccountId: req.context.user.accountId,
      searchableFieldsOnly: true,
    },
    modelSet);

    const ands = [
      ...req.args?.paginationFilter?.and ?? [],
      { 
        fieldKey: "userId",
        value: req.context.user.id,
        like: false
      }
    ];

    const paginationFilter = {
      ...req.args?.paginationFilter ?? {},
      ...{ and: ands }
    };

    const filter = await this.getPaginationFilter(paginationFilter, modelSet);
    const selectedFieldsNames = selectedFields.map(s => s.key);
    const count = await model.count(filter).select(selectedFieldsNames);
    const items = await model.find(
      filter,
      null,
      {
        limit: req.args.perPage,
        skip: (currentPage - 1) * req.args.perPage ?? 0,
        sort: req.args.sort ? getSorting(defaultFields.filter(d => !!d.sort).map(d => d.sort!) ?? [], req.args.sort) : {}
      // TODO: fields should be added recursively, meaning populations of populated fields should be also included. 
      // graphql throws error if field of populated field of populated field is selected (_id works only)
      }).select(selectedFieldsNames).populate((modelSet.populates ?? []).map(p => p.options));

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
        const { sort, ...rest } = d;
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
          sortable: !!d.sort
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
      const res: { [x: string]: { [comp: string]: string | RegExp | Types.ObjectId; } }[] = [];
      (filters).forEach(o => {

        // $ is use to as nested key separator, f.ex event$key is converted to event.key
        (o.fieldKey.split("$")).forEach(nested => {
          const value = o.like
            ? new RegExp(".*" + o.value + ".*", "i")
            : isValidObjectId(o.value)
              ? new ObjectId(o.value)
              : o.value;

          const comparison = ComparisonTypes[o.comparison ?? "eq"];
          res.push({ [nested.replaceAll("$", ".")]: { [comparison]: o.value } })
        })
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

export const getPaginationResolver = (queryModelName: string, modelSet: ModelSet) => {
  return {
    name: queryModelName + "PaginationData",
    type: () => getPaginationOTC({ queryModelName, modelSet }),
    args: {
      paginationFilter: () => getPagiantionFilterITC(queryModelName),
      page: {
        type: "Int!",
        defaultValue: 1
      },
      perPage: {
        type: "Int!",
        defaultValue: 20
      },
      sort: {
        type: "[String]",
        description: "Use values columnname_asc or columnname_desc"
      }
    },
    resolve: async (req: RequestContent) => {
      return new PaginationResolverCreator({ queryModelName }).getResolver(req, modelSet);
    }
  }
}

const isValidObjectId = (id: string) => {
  if (ObjectId.isValid(id)) {
    if ((String)(new ObjectId(id)) === id)
      return true;
    return false;
  }
  return false;
}