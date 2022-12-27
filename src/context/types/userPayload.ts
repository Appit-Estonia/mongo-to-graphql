import mongoose from "mongoose";

export const userFeatures = Object.fromEntries((process.env.MONGO_TO_GRAPHQL_USER_FEATURES ?? "ADMIN,USER")
  .split(",")
  .map(f => [f.trim()]));

export declare const PERMISSION_VALUES: {
  readonly none: 0;
  readonly read: 1;
  readonly write: 2;
  readonly execute: 3;
};

export declare type TPermissionType = 0 | 1 | 2 | 3;
export declare type TOrganisationFeaturePermissionKeys = string;
export declare type TPermissionsObject = {
  [key in TOrganisationFeaturePermissionKeys]?: TPermissionType;
}

export const ObjectId = mongoose.Types.ObjectId;

export interface CurrentUserPayload {
  id: string;
  accountId: string;
  email: string;
  profileId?: string;
  firstname?: string;
  lastname?: string;
  isAdmin?: boolean;
  isAdminLogin?: boolean;
  organisation: string;
  role: {
    organisation: string;
    isSystem: boolean;
    isAdmin: boolean;
    id: string;
    permissions: {
      [K in keyof typeof userFeatures]: TPermissionType;
    };
  };
  [key: string]: any;
}