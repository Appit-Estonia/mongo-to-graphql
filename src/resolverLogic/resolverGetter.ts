import { Resolver, schemaComposer } from "graphql-compose";
import { toRecord } from "./helpers";
import { IResolveParams as ResolverCreatorProps, TResolver } from "./types";
import { ObjectId } from "../validate-permission";
import { GraphContext, RequestContent } from "../context/types/request";
import { ResolverResolveParams } from "graphql-compose/lib/Resolver";
import { isEmpty } from "lodash";
import { getUserId, isAdminMode, validateUserAccess } from "../permissionsLogic/validate-permission";
import { getPagiantionFilterITC } from "../typeComposerLogic/paginationITCGetter";
import { getPaginationOTC } from "../typeComposerLogic/paginationOTCGetter";
import { PaginationResolveCreator } from "./paginationResolveGetter";
import { ModelSet } from "../context/types/setup";

class ResolverCreator {

  private model: any;
  private props: ResolverCreatorProps;
  private resolverType: TResolver;
  private resolverName: string;
  private resolverProps: any;
  private ignoreUserAccess?: boolean;
  private userRefenceName?: string;
  private resolverWrapper?: (resolver: Resolver) => Resolver;

  constructor(resolverTypeName: TResolver, props: ResolverCreatorProps) {
    this.props = props;
    this.model = props.modelSet.model;
    this.resolverType = resolverTypeName;
    this.resolverName = resolverTypeName + props.queryModelName;
    this.ignoreUserAccess = props.ignoreUserAccess;
    this.userRefenceName = props.userReferenceName;
    this.resolverWrapper = props.resolverWrapper;
    this.resolverProps = this.getResolverProps();
  }

  public getResolver(): Resolver<any, any, any> {

    const r = new Resolver({
      name: this.resolverName,
      description: this.props.description,
      type: this.resolverProps.type,
      args: this.resolverProps.args,
      resolve: this.resolverProps.resolve,
    }, schemaComposer);

    return r
  }

  private getResolverProps() {
    switch (this.resolverType) {
      case "createOne":
        return this.getCreateOne();
      case "findById":
        return this.getFindById();
      case "findMany":
        return this.getFindMany();
      case "findOne":
        return this.getFindOne();
      case "pagination":
        return this.getPagination();
      case "removeById":
        return this.getRemoveById();
      case "updateById":
        return this.getUpdateById();
      default:
        throw new Error(`Base resolver '${this.resolverType}' not found`)
    }
  }

  private getCreateOne() {
    return this.props.typeComposer.mongooseResolvers.createOne({
      record: {
        removeFields: [this.userRefenceName ?? ""]
      }
    }).wrap((r) => this.resolverWrapper ? this.resolverWrapper(r) : r).wrapResolve(() =>
      async (rp: ResolverResolveParams<any, any, any>) => {
        const { args, context } = rp;
        this.validateRequest("createOne", { args, context });
        const newRecord = await this.model.create({ ...args.record, ...this.getUserIdFilter(context), });
        return toRecord(await newRecord.populate(getPopulates(this.props.modelSet)));
      });
  }

  private getFindById() {
    return this.props.typeComposer.mongooseResolvers.findById()
      .wrap((r) => this.resolverWrapper ? this.resolverWrapper(r) : r)
      .wrapResolve(() =>
        async (rp: ResolverResolveParams<any, any, any>) => {
          const { args, context } = rp;
          this.validateRequest("findById", { args, context });
          return await this.model.findOne(this.getWrappedFilter({ _id: args._id }, context))
            .populate(getPopulates(this.props.modelSet));
        });
  }

  /** Find many by id values */
  private getFindMany() {
    return this.props.typeComposer.mongooseResolvers
      .findMany()
      .wrap(r => {
        r.removeArg(["filter", "skip", "limit"]);
        r.addArgs({ ids: ["MongoID"] });

        return this.resolverWrapper ? this.resolverWrapper(r) : r;
      })
      .wrapResolve(() =>
        async (rp: ResolverResolveParams<any, any, any>) => {
          const { args, context } = rp;
          this.validateRequest("findMany", { args, context });
          const ids = rp.args.ids?.map((id: string) => new ObjectId(id));
          return isEmpty(ids) ? [] : await this.model.find(this.getWrappedFilter({ _id: { $in: ids } }, context))
            .populate(getPopulates(this.props.modelSet));
        });
  };

  private getFindOne() {
    return this.props.typeComposer.mongooseResolvers.findOne()
      .wrap((r) => this.resolverWrapper ? this.resolverWrapper(r) : r)
      .wrapResolve(() =>
        async (rp: ResolverResolveParams<any, any, any>) => {
          const { args, context } = rp;
          this.validateRequest("findOne", { args, context });
          return await this.model.findOne(this.getWrappedFilter(args, context))
            .populate(getPopulates(this.props.modelSet));
        });
  }

  private getRemoveById() {
    return this.props.typeComposer.mongooseResolvers.removeById()
      .wrap((r) => this.resolverWrapper ? this.resolverWrapper(r) : r)
      .wrapResolve(() =>
        async (rp: ResolverResolveParams<any, any, any>) => {
          const { args, context } = rp;
          this.validateRequest("removeById", { args, context });
          return toRecord(await this.model.findByIdAndDelete(args._id)
            .populate(getPopulates(this.props.modelSet)));
        });
  }

  private getUpdateById() {
    return this.props.typeComposer.mongooseResolvers.updateById()
      .wrap((r) => this.resolverWrapper ? this.resolverWrapper(r) : r)
      .wrapResolve(() =>
        async (rp: ResolverResolveParams<any, any, any>) => {
          const { args, context } = rp;
          this.validateRequest("updateById", { args, context });
          return toRecord(await this.model.findOneAndUpdate(this.getWrappedFilter(args, context), args.record)
            .populate(getPopulates(this.props.modelSet)));
        });
  }

  private getPagination() {
    const queryModelName = this.props.queryModelName;
    const modelSet = this.props.modelSet;

    return this.props.typeComposer.mongooseResolvers.pagination().wrap(r => {
      r.name = queryModelName + "PaginationData";

      r.removeArg("filter")
      r.setArg("paginationFilter", () => getPagiantionFilterITC(queryModelName));
      r.setArg("page", { type: "Int!", defaultValue: 1 });
      r.setArg("perPage", { type: "Int!", defaultValue: 20 });

      // TODO: default sort should be removed, conflict with findMany sort
      r.setArg("paginationSort", {
        type: "[String]",
        description: "Use values columnname_asc or columnname_desc"
      });

      r.setType(getPaginationOTC({ queryModelName, modelSet }))

      return this.resolverWrapper ? this.resolverWrapper(r) : r;
    }).wrapResolve(() =>
      async (rp: ResolverResolveParams<any, any, any>) => {
        const { args, context } = rp;
        this.validateRequest("pagination", { args, context });
        if (!isAdminMode(context) && this.userRefenceName) {
          if (!args.paginationFilter) { args.paginationFilter = {}; }
          args.paginationFilter = this.getWrappedPaginationFilter(args.paginationFilter, context);
        }
        return new PaginationResolveCreator({ queryModelName }).getResolve({ args, context }, modelSet);
      });
  }

  private validateRequest(resolverType: TResolver, req: RequestContent) {
    validateUserAccess(req.context, this.ignoreUserAccess)
    const validations = this.props.modelSet.requestValidations
      ? this.props.modelSet.requestValidations[resolverType] ?? []
      : [];

    validations.forEach((v: any) => v(req));
  }

  private getUserIdFilter(context: GraphContext) {
    return this.userRefenceName ? { [this.userRefenceName]: getUserId(context) } : {}
  }

  private getWrappedFilter(filter: any, context: GraphContext) {
    return { ...filter, ...(isAdminMode(context) ? {} : this.getUserIdFilter(context)), };
  }

  private getWrappedPaginationFilter(paginationFilter: any, context: GraphContext) {

    if (isAdminMode(context)) { return paginationFilter; }

    const userFilter = { fieldKey: this.userRefenceName, equals: getUserId(context) };
    const and = paginationFilter.and ? [...paginationFilter.and, userFilter] : [userFilter];

    return { ...paginationFilter ?? {}, ...{ and } };
  }
}

export const getBaseResolver = (resolverTypeName: TResolver, props: ResolverCreatorProps) => {
  return new ResolverCreator(resolverTypeName, props).getResolver();
}

export const getPopulates = (modelSet: ModelSet) => {
  return modelSet?.populates?.map(p => {
    return Object.values(p.fields ?? {}).map(f => {
      const fields = f.split(":")[1];
      return {
        path: p.key.replace("[", "").replace("]", ""),
        select: fields ? fields.split(" ") : undefined
      }
    })
  }) ?? []
}
