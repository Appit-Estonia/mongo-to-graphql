import { ResolverResolveParams, ResolverRpCb } from "graphql-compose";
import mongoose from "mongoose";
import { BadRequestError, getSetup } from "..";
import { NotAuthorizedError } from "../errors/notAuthorized";
import { PERMISSION_VALUES, TOrganisationFeaturePermissionKeys } from "./permissions";

const calculatePermission = (permissionValue = 0, expectedPermission = 0) => {
  return permissionValue / expectedPermission <= 1;
};

export const ObjectId = mongoose.Types.ObjectId;

export const requireSuperAdmin =
  (next: ResolverRpCb<any, any, any>) =>
    (rp: ResolverResolveParams<any, any, any>) => {
      if (rp.context.user && rp.context.user.isAdmin) {
        return next(rp);
      }
      return null;
    };

export const requireAuth =
  (next: ResolverRpCb<any, any, any>) =>
    (rp: ResolverResolveParams<any, any, any>) => {
      if (rp.context.user) {
        return next(rp);
      }
      throw new NotAuthorizedError();
    };

export const requirePermissions =
  (
    permissionType: keyof typeof PERMISSION_VALUES,
    feature: TOrganisationFeaturePermissionKeys
  ) =>
    (next: ResolverRpCb<any, any, any>) =>
      (rp: ResolverResolveParams<any, any, any>) => {
        const { user } = rp.context;
        if (!user) {
          throw new NotAuthorizedError();
        }

        rp.args = getRequestArgs(rp);
        return next(rp);
      };


const getRequestArgs = (rp: ResolverResolveParams<any, any, any>) => {

  let filter = {
    ...(rp.args?.filter || {}),
    organisation: new ObjectId(rp.context.user.organisation),
  };

  if (rp.args?._id) {
    filter = { ...filter, ...{ _id: rp.args._id } };
    delete rp.args._id;
  }
  
  return {
    ...(rp.args || {}),
    filter,
  };
}

export const getUserId = (context: any) => {
  const path = getSetup().userIdPathInContext?.split(".");
  if(!path) { return null; }

  const userIdProp = path.pop()!;
  const last = path.reduce((_, p) => {
    return context[p];
  }, {}) as any;

  if(!last) {
    throw new Error(`User id is missing in context path '${getSetup().userIdPathInContext}'`)
  }
  return new ObjectId(last[userIdProp]);
}

export const validateUserAccess = (context: any, ignore?: boolean) => {
  if(!ignore && !!getSetup().userIdPathInContext && !getUserId(context)) {
    throw new BadRequestError("error.no_access");
  }
}