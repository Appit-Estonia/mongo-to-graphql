import { Resolver } from "graphql-compose";
import { requireSuperAdmin, requirePermissions, requireAuth } from "../permissionsLogic/validate-permission";
import { TResolver } from "./types";
import { getOTC } from "../typeComposerLogic/typeComposerGetter";
import { PERMISSION_VALUES, TOrganisationFeaturePermissionKeys } from "../permissionsLogic/permissions";


// TODO: not in use, must be combined with resolverGetter!
export class ResolverProvider {
  
  private resolver: Resolver;
  private permissionType: keyof typeof PERMISSION_VALUES = "none";

  constructor(queryTableName: string, resolverTypeName: TResolver) {
    const composer = getOTC(queryTableName);
    this.resolver = composer.getResolver(resolverTypeName + queryTableName);
  }

  public get() {
    return this.resolver;
  }

  public getForSuperAdmin() {
    this.resolver.wrapResolve(requireSuperAdmin);
    return this.resolver;
  }

  public getForAuthentication() {
    this.resolver.wrapResolve(requireAuth);
    return this.resolver;
  }

  public forType(type: keyof typeof PERMISSION_VALUES) { 
    this.permissionType = type;
    return this;
  }

  public getForPermissions(...permissions: TOrganisationFeaturePermissionKeys[]) {
    permissions.forEach(p => {
      this.resolver = this.resolver.wrapResolve(requirePermissions(this.permissionType, p));
    });
    return this.resolver;
  }
}
