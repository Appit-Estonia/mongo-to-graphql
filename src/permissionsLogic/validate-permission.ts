import { ResolverResolveParams, ResolverRpCb } from "graphql-compose";
import { get } from "lodash";
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
  return new ObjectId(getUserContextValue(context, "id"));
}

export const isAdminMode = (context: any) => {
  return getUserContextValue(context, "hasAdminMode");
}

const getUserContextValue = (context: any, valueOf: "id" | "hasAdminMode") => {

  if(!getSetup().userContextPaths) { return null; }

  const path = getSetup().userContextPaths![valueOf];
  const value = path ? get(context, path) : undefined;

  return value;
}

export const validateUserAccess = (context: any, ignore?: boolean) => {
  if(!ignore && !!getSetup().userContextPaths?.id && !getUserId(context)) {
    throw new BadRequestError("error.no_access");
  }
}