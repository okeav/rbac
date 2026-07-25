import { matchScope } from '../../scopes/match-scope.js';
import { defaultGetContext, defaultOnDeny } from './shared.js';

/**
 * Create Express middleware factories that gate on the caller's granted
 * scopes, wildcard-aware via matchScope (a stored "job.*" grants "job.read",
 * "*" grants everything, etc.).
 *
 *   const { requireScope, requireAllScopes } = createScopeMiddleware();
 *   router.get('/jobs', requireScope('job.read'), listJobs);
 *   router.post('/jobs/:id/publish', requireAllScopes('job.update', 'job.publish'), publish);
 *
 * @param {Object} [options]
 * @param {(req) => {scopes: string[]}} [options.getContext] - defaults to reading req.auth
 * @param {(req, res, next, info) => void} [options.onDeny] - defaults to next(RbacError)
 */
export function createScopeMiddleware({ getContext = defaultGetContext, onDeny = defaultOnDeny } = {}) {
    function requireScope(...requiredScopes) {
        return (req, res, next) => {
            const ctx = getContext(req);
            if (!ctx) return onDeny(req, res, next, { reason: 'unauthenticated' });
            const scopes = ctx.scopes ?? [];
            const ok = requiredScopes.some((s) => matchScope(scopes, s));
            if (ok) return next();
            return onDeny(req, res, next, { reason: 'scope', required: requiredScopes, granted: scopes });
        };
    }

    function requireAllScopes(...requiredScopes) {
        return (req, res, next) => {
            const ctx = getContext(req);
            if (!ctx) return onDeny(req, res, next, { reason: 'unauthenticated' });
            const scopes = ctx.scopes ?? [];
            const ok = requiredScopes.every((s) => matchScope(scopes, s));
            if (ok) return next();
            return onDeny(req, res, next, { reason: 'scope', required: requiredScopes, granted: scopes });
        };
    }

    return { requireScope, requireAllScopes };
}
