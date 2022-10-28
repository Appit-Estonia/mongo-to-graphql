import { Resolver, schemaComposer } from "graphql-compose";
import { toRecord } from "./helpers";
import { getPaginationResolver } from "./paginationResolverGetter";
import { IResolveParams as ResolverCreatorProps, ResolverProps, TResolver } from "./types";
import { ObjectId } from "../validate-permission";
import { ModelSet } from "../context/types/setup";
import { RequestContent } from "../context/types/request";

class ResolverCreator {

  private model: any;
  private modelSet: ModelSet;
  private props: ResolverCreatorProps;
  private resolverType: TResolver;
  private resolverName: string;
  private resolverProps: ResolverProps;

  constructor(resolverTypeName: TResolver, props: ResolverCreatorProps) {
    this.props = props;
    this.modelSet = props.modelSet;
    this.model = props.modelSet.model;
    this.resolverType = resolverTypeName;
    this.resolverName = resolverTypeName + props.queryModelName;
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
        return getPaginationResolver(this.props.queryModelName, this.props.modelSet);
      case "removeById":
        return this.getRemoveById();
      case "updateById":
        return this.getUpdateById();
      default:
        throw new Error(`Base resolver '${this.resolverType}' not found`)
    }
  }

  private getCreateOne = (): ResolverProps => {
    return this.getResolverObject({
      resolver: this.props.typeComposer.mongooseResolvers.createOne({
        record: {
          removeFields: ["userId"]
        }
      }),
      resolve: async (req: RequestContent) => {
        this.validateRequest("createOne", req);
        console.log(req.context)
        const newObj = {
          ...req.args.record,
          ...{ userId: new ObjectId(req.context.user.id) }
        }
        return toRecord(await this.model.create(newObj));
      }
    });
  }

  private getFindById(): ResolverProps {
    return this.getResolverObject({
      resolver: this.props.typeComposer.mongooseResolvers.findById(),
      resolve: async (req: RequestContent) => {
        this.validateRequest("findById", req);
        const res = await this.model.findOne({ _id: req.args._id });
        return await this.model.findOne({ _id: req.args._id })
          .populate(this.modelSet.populates?.map(p => p.options) ?? []);
      }
    });
  }

  /** Find many by id values */
  private getFindMany(): ResolverProps {

    const resolver = this.props.typeComposer.mongooseResolvers.findMany();

    // TODO: sort argument must be customized
    resolver.removeArg(["filter", "skip", "limit"]);
    resolver.addArgs({ ids: ["MongoID"] });

    return {
      name: this.resolverName,
      type: () => [resolver.getOTC()],
      args: resolver.getArgs(),
      resolve: async (req: RequestContent) => {
        this.validateRequest("findMany", req);
        return await this.model.find({ _id: { $in: req.args.ids} })
          .populate(this.modelSet.populates?.map(p => p.options) ?? []);
      }
    }
  }

  private getFindOne(): ResolverProps {
    return this.getResolverObject({
      resolver: this.props.typeComposer.mongooseResolvers.findOne(),
      resolve: async (req: RequestContent) => {
        this.validateRequest("findOne", req);
        return await this.model.findOne(req.args)
          .populate(this.modelSet.populates?.map(p => p.options) ?? []);
      }
    });
  }

  private getRemoveById(): ResolverProps {
    return this.getResolverObject({
      resolver: this.props.typeComposer.mongooseResolvers.removeById(),
      resolve: async (req: RequestContent) => {
        this.validateRequest("removeById", req);
        return toRecord(await this.model.delete(req.args.filter._id));
      }
    });
  }

  private getUpdateById(): ResolverProps {
    return this.getResolverObject({
      resolver: this.props.typeComposer.mongooseResolvers.updateById(),
      resolve: async (req: RequestContent) => {
        this.validateRequest("updateById", req);
        return toRecord(await this.model.findOneAndUpdate(req.args, req.args.record));
      }
    });
  }

  private getResolverObject(resolverBase:
    {
      resolver: Resolver<any, any, any>;
      resolve: (req: RequestContent) => Promise<any>
    }): ResolverProps {
    return {
      name: this.resolverName,
      args: resolverBase.resolver.args,
      type: () => resolverBase.resolver.getOTC(),
      resolve: resolverBase.resolve
    }
  }

  private validateRequest(resolverType: TResolver, req: RequestContent) {
    const validations = this.props.modelSet.requestValidations
      ? this.props.modelSet.requestValidations[resolverType] ?? []
      : [];

    validations.forEach((v: any) => v(req));
  }
}

export const getBaseResolver = (resolverTypeName: TResolver, props: ResolverCreatorProps) => {
  return new ResolverCreator(resolverTypeName, props).getResolver();
}
