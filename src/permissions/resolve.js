/**
 * A permission registry is your application's own scope-grant data — this
 * package holds no capability or scope *values* of its own. Shape:
 *
 *   {
 *     scopesByAccountType: {
 *       [accountType]: {
 *         // Either a flat scope list for that role (used when the role's
 *         // grant doesn't vary by userType — e.g. an ADMIN or a platform
 *         // staff role, or a single-occupant account type)...
 *         [role]: string[]
 *
 *         // ...or a map keyed by userType, for roles whose grant depends on
 *         // an org-chart position (e.g. a BUSINESS "MEMBER" role where a
 *         // RECRUITER and a FINANCE member get different base scopes):
 *         [role]: { [userType]: string[] }
 *       }
 *     },
 *     capabilityScopes: {
 *       // Feature-area scopes granted to ANY account user who holds this
 *       // capability, layered on top of their base scopes regardless of
 *       // accountType/role/userType.
 *       [capability]: string[]
 *     }
 *   }
 *
 * Build one with createPermissionRegistry() to get light validation and a
 * frozen, non-mutable structure.
 */
export function createPermissionRegistry({ scopesByAccountType = {}, capabilityScopes = {} } = {}) {
    return Object.freeze({
        scopesByAccountType: Object.freeze(scopesByAccountType),
        capabilityScopes: Object.freeze(capabilityScopes),
    });
}

/**
 * Resolve the effective permission (scope) list for a user.
 *
 * @param {Object} ctx
 * @param {string} ctx.accountType
 * @param {string} ctx.role
 * @param {string} [ctx.userType]
 * @param {string[]} [ctx.capabilities]
 * @param {ReturnType<typeof createPermissionRegistry>} registry
 * @returns {string[]} de-duplicated permission list
 *
 * Returns an empty array when inputs are incomplete rather than throwing —
 * callers should treat "no permissions" as the safe default for unknown
 * users; see the shapes/ module if you want to hard-fail on a structurally
 * invalid (accountType, role, userType) combination before calling this.
 *
 * Capability scopes are always layered on top of the base scopes for the
 * matched (accountType, role[, userType]) entry. If your role already grants
 * a `resource.*` wildcard, layering redundant literal capability scopes on
 * top is harmless — matchScope resolves the wildcard either way.
 */
export function getPermissions(ctx = {}, registry) {
    const { accountType, role, userType, capabilities = [] } = ctx;
    if (!accountType || !role || !registry) return [];

    const entry = registry.scopesByAccountType?.[accountType]?.[role];

    let base;
    if (Array.isArray(entry)) {
        base = entry;
    } else if (entry && typeof entry === 'object') {
        base = entry[userType] ?? [];
    } else {
        base = [];
    }

    const capScopes = (capabilities ?? []).flatMap((c) => registry.capabilityScopes?.[c] ?? []);
    return Array.from(new Set([...base, ...capScopes]));
}
