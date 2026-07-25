import { hasCapability } from '../../permissions/check.js';
import { defaultGetContext, defaultOnDeny } from './shared.js';

/**
 * Create Express middleware factories that gate on the caller's granted
 * capabilities (feature-area flags — CANDIDATE, JOB_POSTER, whatever your
 * app defines).
 *
 *   const { requireCapability, requireAllCapabilities } = createCapabilityMiddleware();
 *   router.post('/jobs', requireCapability('JOB_POSTER'), createJob);
 *
 * `requireCapability(...caps)` passes if the caller holds ANY of the listed
 * capabilities; `requireAllCapabilities(...caps)` requires ALL of them.
 */
export function createCapabilityMiddleware({ getContext = defaultGetContext, onDeny = defaultOnDeny } = {}) {
    function requireCapability(...requiredCapabilities) {
        return (req, res, next) => {
            const ctx = getContext(req);
            if (!ctx) return onDeny(req, res, next, { reason: 'unauthenticated' });
            const capabilities = ctx.capabilities ?? [];
            const ok = requiredCapabilities.some((c) => hasCapability(capabilities, c));
            if (ok) return next();
            return onDeny(req, res, next, { reason: 'capability', required: requiredCapabilities, granted: capabilities });
        };
    }

    function requireAllCapabilities(...requiredCapabilities) {
        return (req, res, next) => {
            const ctx = getContext(req);
            if (!ctx) return onDeny(req, res, next, { reason: 'unauthenticated' });
            const capabilities = ctx.capabilities ?? [];
            const ok = requiredCapabilities.every((c) => hasCapability(capabilities, c));
            if (ok) return next();
            return onDeny(req, res, next, { reason: 'capability', required: requiredCapabilities, granted: capabilities });
        };
    }

    return { requireCapability, requireAllCapabilities };
}
