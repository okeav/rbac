// ── Errors ───────────────────────────────────────────────────────────────
export { RbacError, isRbacError, ERROR_CODES } from './errors/rbac-error.js';

// ── Scopes ───────────────────────────────────────────────────────────────
export { matchScope } from './scopes/match-scope.js';
export { buildScopeCatalogue } from './scopes/catalogue.js';

// ── Permissions ──────────────────────────────────────────────────────────
export { createPermissionRegistry, getPermissions } from './permissions/resolve.js';
export {
    hasPermission,
    hasAllPermissions,
    hasAnyPermission,
    hasCapability,
    hasAllCapabilities,
    hasAnyCapability,
} from './permissions/check.js';

// ── Shapes ───────────────────────────────────────────────────────────────
export { createShapeRegistry } from './shapes/shape-registry.js';

// ── Claims adapter (identity-provider integration seam) ─────────────────
export { fromClaims } from './claims/from-claims.js';

// Express middleware lives at the '@okeav/rbac-core/middleware/express'
// subpath (not re-exported here) so this package's default import never pulls
// in an Express type dependency for consumers who only need the pure functions.
