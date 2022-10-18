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
};
