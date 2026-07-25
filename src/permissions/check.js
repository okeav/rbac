import { matchScope } from '../scopes/match-scope.js';
import { getPermissions } from './resolve.js';

// ─── Permission (scope) helpers ──────────────────────────────────────────────

export function hasPermission(ctx, permission, registry) {
    const permissions = getPermissions(ctx, registry);
    return matchScope(permissions, permission);
}

export function hasAllPermissions(ctx, required = [], registry) {
    const permissions = getPermissions(ctx, registry);
    return required.every((p) => matchScope(permissions, p));
}

export function hasAnyPermission(ctx, required = [], registry) {
    const permissions = getPermissions(ctx, registry);
    return required.some((p) => matchScope(permissions, p));
}

// ─── Capability helpers ───────────────────────────────────────────────────────
// Capabilities are a flat "does this user have this feature-flag" check —
// no registry needed, just the user's own capabilities array.

export function hasCapability(capabilities = [], capability) {
    return Array.isArray(capabilities) && capabilities.includes(capability);
}

export function hasAllCapabilities(capabilities = [], required = []) {
    return required.every((c) => hasCapability(capabilities, c));
}

export function hasAnyCapability(capabilities = [], required = []) {
    return required.some((c) => hasCapability(capabilities, c));
}
