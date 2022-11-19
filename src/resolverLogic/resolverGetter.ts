import { Resolver, schemaComposer } from "graphql-compose";
import { toRecord } from "./helpers";
import { getPaginationResolver } from "./paginationResolverGetter";
import { IResolveParams as ResolverCreatorProps, TResolver } from "./types";
import { ObjectId } from "../validate-permission";
import { RequestContent } from "../context/types/request";
import { ResolverResolveParams, ResolverRpCb } from "graphql-compose/lib/Resolver";
import { isEmpty } from "lodash";
import { getUserId, validateUserAccess } from "../permissionsLogic/validate-permission";

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
      case "u-createOne":
        return this.getCreateOne();
      case "findById":
        return this.getFindById();
      case "findMany":
        return this.getFindMany();
      case "findOne":
        return this.getFindOne();
      case "pagination":
        return getPaginationResolver(this.props.queryModelName, this.props.modelSet);
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
        return toRecord(await this.model.create(newObj));
      });
  }

  private getFindById() {
    return this.props.typeComposer.mongooseResolvers.findById()
      .wrapResolve(() =>
        async (rp: ResolverResolveParams<any, any, any>) => {
          const { args, context } = rp;
          this.validateRequest("findById", { args, context });
          return await this.model.findOne({ _id: args._id });
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
          return isEmpty(ids) ? [] : await this.model.find({ _id: { $in: ids } });
        });
  };

  private getFindOne() {
    return this.props.typeComposer.mongooseResolvers.findOne()
      .wrapResolve(() =>
        async (rp: ResolverResolveParams<any, any, any>) => {
          const { args, context } = rp;
          this.validateRequest("findOne", { args, context });
          return await this.model.findOne(args);
        });
  }

  private getRemoveById() {
    return this.props.typeComposer.mongooseResolvers.removeById()
      .wrapResolve(() =>
        async (rp: ResolverResolveParams<any, any, any>) => {
          const { args, context } = rp;
          this.validateRequest("removeById", { args, context });
          return toRecord(await this.model.delete(new ObjectId(args.filter._id)));
        });
  }

  private getUpdateById() {
    return this.props.typeComposer.mongooseResolvers.updateById()
      .wrapResolve(() =>
        async (rp: ResolverResolveParams<any, any, any>) => {
          const { args, context } = rp;
          this.validateRequest("updateById", { args, context });
          return toRecord(await this.model.findOneAndUpdate(args, args.record));
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
