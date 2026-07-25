// ─── Core model types ─────────────────────────────────────────────────────
// This package fixes the AXES of the model (accountType, accountSubType,
// role, userType, capabilities) but not the VALUES — those are your
// application's enums. Plain strings keep the package usable with any
// account taxonomy; use string-literal unions in your own app for stricter
// typing if you want it.

export interface PermissionContext {
    accountType: string;
    accountSubType?: string | null;
    role: string;
    userType?: string | null;
    capabilities?: readonly string[];
}

// ─── Errors ───────────────────────────────────────────────────────────────

export type RbacErrorCode =
    | 'UNAUTHENTICATED'
    | 'INSUFFICIENT_SCOPE'
    | 'INSUFFICIENT_CAPABILITY'
    | 'INSUFFICIENT_ROLE'
    | 'INVALID_ACCOUNT_TYPE'
    | 'INVALID_SHAPE'
    | 'UNKNOWN_SCOPE'
    | 'INTERNAL_ERROR';

export declare const ERROR_CODES: Readonly<Record<string, RbacErrorCode>>;

export declare class RbacError extends Error {
    code: RbacErrorCode | string;
    httpStatus: number;
    cause?: unknown;
    constructor(input?: { code?: string; httpStatus?: number; message?: string; cause?: unknown });
}

export declare function isRbacError(err: unknown): err is RbacError;

// ─── Scopes ───────────────────────────────────────────────────────────────

/**
 * Wildcard-aware scope matcher. Returns true when `requiredScope` is granted
 * by `grantedScopes`, honouring "*", "resource.*", "resource.action.*",
 * "*.action", and "*.action.*".
 */
export declare function matchScope(grantedScopes: readonly string[] | undefined, requiredScope: string): boolean;

export interface ScopeCatalogue {
    resourceScopes: Readonly<Record<string, readonly string[]>>;
    allScopes: readonly string[];
    isKnownScope: (scope: unknown) => boolean;
}

/** Build a validated, flattened scope catalogue from a resource→actions map. */
export declare function buildScopeCatalogue(resourceScopes: Record<string, readonly string[]>): ScopeCatalogue;

// ─── Permission registry ──────────────────────────────────────────────────

export type ScopesByRole = readonly string[] | Readonly<Record<string, readonly string[]>>;

export interface PermissionRegistryInput {
    scopesByAccountType?: Readonly<Record<string, Record<string, ScopesByRole>>>;
    capabilityScopes?: Readonly<Record<string, readonly string[]>>;
}

export interface PermissionRegistry {
    scopesByAccountType: Readonly<Record<string, Record<string, ScopesByRole>>>;
    capabilityScopes: Readonly<Record<string, readonly string[]>>;
}

export declare function createPermissionRegistry(input?: PermissionRegistryInput): PermissionRegistry;

/** Resolve the effective, de-duplicated permission (scope) list for a user. */
export declare function getPermissions(ctx: PermissionContext | undefined, registry: PermissionRegistry): string[];

// ─── Check helpers ────────────────────────────────────────────────────────

export declare function hasPermission(ctx: PermissionContext, permission: string, registry: PermissionRegistry): boolean;
export declare function hasAllPermissions(ctx: PermissionContext, required: readonly string[] | undefined, registry: PermissionRegistry): boolean;
export declare function hasAnyPermission(ctx: PermissionContext, required: readonly string[] | undefined, registry: PermissionRegistry): boolean;

export declare function hasCapability(capabilities: readonly string[] | undefined, capability: string): boolean;
export declare function hasAllCapabilities(capabilities: readonly string[] | undefined, required?: readonly string[]): boolean;
export declare function hasAnyCapability(capabilities: readonly string[] | undefined, required?: readonly string[]): boolean;

// ─── Shapes (configurable valid accountType/role/userType combinations) ───

export type ShapePredicate = (ctx: PermissionContext) => boolean;

export interface ShapeRegistry {
    isValid: (ctx: PermissionContext) => boolean;
    assertValid: (ctx: PermissionContext, options?: { message?: string }) => void;
}

export declare function createShapeRegistry(shapes: readonly ShapePredicate[]): ShapeRegistry;

// ─── Claims adapter ───────────────────────────────────────────────────────

export interface FromClaimsKeyMap {
    accountType?: string;
    accountSubType?: string;
    role?: string;
    userType?: string;
    capabilities?: string;
}

export declare function fromClaims(
    claims: Record<string, unknown>,
    options?: { keys?: FromClaimsKeyMap },
): PermissionContext;
