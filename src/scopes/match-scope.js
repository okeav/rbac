/**
 * Wildcard-aware scope matcher.
 *
 * Scope shape: "resource.action" or "resource.action.qualifier". The
 * qualifier convention (e.g. "own" / "any") is a naming convention your app
 * chooses — this matcher only cares about segment count and wildcard `*`
 * placement, not what the segments mean.
 *
 * Granted wildcards:
 *   "*"                  — every scope
 *   "resource.*"         — every action on resource
 *   "resource.action.*"  — every qualifier on a single action (matches a
 *                          2-segment OR 3-segment required scope for that
 *                          resource+action)
 *   "*.action"           — that 2-segment action across every resource
 *   "*.action.*"         — that action with any qualifier across every resource
 *
 * Note: "*.action" deliberately does NOT match a 3-segment
 * "resource.action.qualifier" — a qualified form is treated as more
 * privileged than its unqualified form (this matches the convention where
 * ".any" means cross-tenant access). Use "*.action.*" to span both.
 */
export function matchScope(grantedScopes, requiredScope) {
    if (!requiredScope || !Array.isArray(grantedScopes)) return false;
    if (grantedScopes.includes('*')) return true;
    if (grantedScopes.includes(requiredScope)) return true;

    const parts = requiredScope.split('.');
    if (parts.length < 2) return false;
    const [resource, action] = parts;
    const isQualified = parts.length === 3;

    // resource.* — every action on resource
    if (grantedScopes.includes(`${resource}.*`)) return true;

    if (isQualified) {
        // resource.action.* — both qualified and covers 2-segment lookups too
        if (grantedScopes.includes(`${resource}.${action}.*`)) return true;
        // *.action.* — every qualifier on action across resources
        if (grantedScopes.includes(`*.${action}.*`)) return true;
    } else {
        // *.action — 2-segment global wildcard
        if (grantedScopes.includes(`*.${action}`)) return true;
    }

    return false;
}
