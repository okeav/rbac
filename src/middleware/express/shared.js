import { RbacError, ERROR_CODES } from '../../errors/rbac-error.js';

/**
 * Default context extraction assumes an upstream auth middleware (e.g.
 * @adaptive-edge/idp-core's authContextMiddleware, or your own) has already
 * populated `req.auth` from verified token claims. Returns null when there is
 * no auth context at all, so callers can distinguish "unauthenticated" from
 * "authenticated with zero grants". Override `getContext` in any factory
 * below if your app stores it elsewhere (req.user, req.session, …).
 */
export function defaultGetContext(req) {
    const auth = req.auth;
    if (!auth) return null;
    return {
        accountType: auth.accountType,
        role: auth.role ?? auth.userRole,
        userType: auth.userType ?? null,
        scopes: auth.scopes ?? [],
        capabilities: auth.capabilities ?? [],
    };
}

export function defaultOnDeny(_req, _res, next, { reason, required, granted } = {}) {
    const codeByReason = {
        unauthenticated: ERROR_CODES.UNAUTHENTICATED,
        scope: ERROR_CODES.INSUFFICIENT_SCOPE,
        capability: ERROR_CODES.INSUFFICIENT_CAPABILITY,
        role: ERROR_CODES.INSUFFICIENT_ROLE,
        accountType: ERROR_CODES.INVALID_ACCOUNT_TYPE,
    };
    const httpStatusByReason = {
        unauthenticated: 401,
        scope: 403,
        capability: 403,
        role: 403,
        accountType: 403,
    };
    next(new RbacError({
        code: codeByReason[reason] ?? ERROR_CODES.INSUFFICIENT_SCOPE,
        httpStatus: httpStatusByReason[reason] ?? 403,
        message: reason === 'unauthenticated'
            ? 'Authentication required.'
            : `Access denied — required: ${JSON.stringify(required)}, granted: ${JSON.stringify(granted)}.`,
    }));
}
