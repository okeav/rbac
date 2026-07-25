import { defaultGetContext, defaultOnDeny } from './shared.js';

/**
 * Create Express middleware that gates on the caller's accountType.
 *
 *   const requireAccountType = createRequireAccountType();
 *   router.get('/team', requireAccountType('BUSINESS'), listTeam);
 */
export function createRequireAccountType({ getContext = defaultGetContext, onDeny = defaultOnDeny } = {}) {
    return function requireAccountType(...allowedAccountTypes) {
        return (req, res, next) => {
            const ctx = getContext(req);
            if (!ctx) return onDeny(req, res, next, { reason: 'unauthenticated' });
            if (allowedAccountTypes.includes(ctx.accountType)) return next();
            return onDeny(req, res, next, { reason: 'accountType', required: allowedAccountTypes, granted: ctx.accountType });
        };
    };
}
