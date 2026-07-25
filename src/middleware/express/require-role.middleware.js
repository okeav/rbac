import { defaultGetContext, defaultOnDeny } from './shared.js';

/**
 * Create Express middleware that gates on the caller's role.
 *
 *   const requireRole = createRequireRole();
 *   router.delete('/accounts/:id', requireRole('PLATFORM_ADMIN'), deleteAccount);
 */
export function createRequireRole({ getContext = defaultGetContext, onDeny = defaultOnDeny } = {}) {
    return function requireRole(...allowedRoles) {
        return (req, res, next) => {
            const ctx = getContext(req);
            if (!ctx) return onDeny(req, res, next, { reason: 'unauthenticated' });
            if (allowedRoles.includes(ctx.role)) return next();
            return onDeny(req, res, next, { reason: 'role', required: allowedRoles, granted: ctx.role });
        };
    };
}
