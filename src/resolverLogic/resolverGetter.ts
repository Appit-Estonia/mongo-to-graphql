import { Resolver, schemaComposer } from "graphql-compose";
import { toRecord } from "./helpers";
import { IResolveParams as ResolverCreatorProps, TResolver } from "./types";
import { ObjectId } from "../validate-permission";
import { RequestContent } from "../context/types/request";
import { ResolverResolveParams } from "graphql-compose/lib/Resolver";
import { isEmpty } from "lodash";
import { getUserId, validateUserAccess } from "../permissionsLogic/validate-permission";
import { getPagiantionFilterITC } from "../typeComposerLogic/paginationITCGetter";
import { getPaginationOTC } from "../typeComposerLogic/paginationOTCGetter";
import { PaginationResolveCreator } from "./paginationResolveGetter";
import { getOTC } from "../typeComposerLogic/typeComposerGetter";
import { ModelSet } from "../context/types/setup";

class ResolverCreator {

  private model: any;
  private props: ResolverCreatorProps;
  private resolverType: TResolver;
  private resolverName: string;
  private resolverProps: any;
  private ignoreUserAccess?: boolean;
  private userRefenceName?: string;

  constructor(resolverTypeName: TResolver, props: ResolverCreatorProps) {
    this.props = props;
    this.model = props.modelSet.model;
    this.resolverType = resolverTypeName;
    this.resolverName = resolverTypeName + props.queryModelName;
    this.ignoreUserAccess = props.ignoreUserAccess;
    this.userRefenceName = props.userReferenceName;
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
    }).wrapResolve(() =>
      async (rp: ResolverResolveParams<any, any, any>) => {
        const { args, context } = rp;
        this.validateRequest("createOne", { args, context });
        const newObj = {
          ...args.record,
          ...(this.userRefenceName ? { [this.userRefenceName]: getUserId(context) } : {})
        }
        return toRecord(await this.model.create(newObj).populate(getPopulates(this.props.modelSet)));
      });
  }

  private getFindById() {
    return this.props.typeComposer.mongooseResolvers.findById()
      .wrapResolve(() =>
        async (rp: ResolverResolveParams<any, any, any>) => {
          const { args, context } = rp;
          this.validateRequest("findById", { args, context });
          return await this.model.findOne({ _id: args._id }).populate(getPopulates(this.props.modelSet));
        });
  }

  /** Find many by id values */
  private getFindMany() {
    return this.props.typeComposer.mongooseResolvers
      .findMany()
      .wrap(r => {
        r.removeArg(["filter", "skip", "limit"]);
        r.addArgs({ ids: ["MongoID"] });
        return r;
      })
      .wrapResolve(() =>
        async (rp: ResolverResolveParams<any, any, any>) => {
          const { args, context } = rp;
          this.validateRequest("findMany", { args, context });
          const ids = rp.args.ids?.map((id: string) => new ObjectId(id));
          return isEmpty(ids) ? [] : await this.model.find({ _id: { $in: ids } }).populate(getPopulates(this.props.modelSet));
        });
  };

  private getFindOne() {
    return this.props.typeComposer.mongooseResolvers.findOne()
      .wrapResolve(() =>
        async (rp: ResolverResolveParams<any, any, any>) => {
          const { args, context } = rp;
          this.validateRequest("findOne", { args, context });
          return await this.model.findOne(args).populate(getPopulates(this.props.modelSet));
        });
  }

  private getRemoveById() {
    return this.props.typeComposer.mongooseResolvers.removeById()
      .wrapResolve(() =>
        async (rp: ResolverResolveParams<any, any, any>) => {
          const { args, context } = rp;
          this.validateRequest("removeById", { args, context });
          return toRecord(await this.model.delete(new ObjectId(args.filter._id)).populate(getPopulates(this.props.modelSet)));
        });
  }

  private getUpdateById() {
    return this.props.typeComposer.mongooseResolvers.updateById()
      .wrapResolve(() =>
        async (rp: ResolverResolveParams<any, any, any>) => {
          const { args, context } = rp;
          this.validateRequest("updateById", { args, context });
          return toRecord(await this.model.findOneAndUpdate(args, args.record).populate(getPopulates(this.props.modelSet)));
        });
  }

  private getPagination() {
    const queryModelName = this.props.queryModelName;
    const modelSet = this.props.modelSet;

    return this.props.typeComposer.mongooseResolvers.pagination().wrap(r => {
      r.name = queryModelName + "PaginationData";

      r.setArg("filter", () => getPagiantionFilterITC(queryModelName));
      r.setArg("page", { type: "Int!", defaultValue: 1 });
      r.setArg("perPage", { type: "Int!", defaultValue: 20 });

      const fields = getOTC(queryModelName).getFieldNames().map(f => `${f}_asc ${f}_desc`).join(" ");
      r.setArg("paginationSort", { type: [`enum ${queryModelName}PaginationSort { ${fields} }`] });

      r.setType(getPaginationOTC({ queryModelName, modelSet }))
      return r;
    }).wrapResolve(() =>
      async (rp: ResolverResolveParams<any, any, any>) => {
        const { args, context } = rp;
        this.validateRequest("pagination", { args, context });
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
