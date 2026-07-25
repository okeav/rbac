import { RbacError, ERROR_CODES } from '../errors/rbac-error.js';

/**
 * Build a validated scope catalogue from a consumer-supplied resource→actions
 * map, e.g.:
 *
 *   buildScopeCatalogue({
 *     job:         ['create', 'read', 'update', 'publish'],
 *     application: ['create', 'read.own', 'read.any', 'update'],
 *   })
 *
 * This package does not ship any resource/action vocabulary of its own —
 * that's your application's domain (job, candidate, invoice, whatever it
 * is). What you get back:
 *
 *   allScopes    — flat, frozen list of every "resource.action" string
 *   isKnownScope — true if a scope string is present in the catalogue;
 *                  use this in route-guard tests so a typo'd scope string
 *                  fails loudly instead of silently always-denying
 *   resourceScopes — the (frozen) input map, echoed back for convenience
 */
export function buildScopeCatalogue(resourceScopes = {}) {
    if (!resourceScopes || typeof resourceScopes !== 'object') {
        throw new RbacError({
            code: ERROR_CODES.UNKNOWN_SCOPE,
            httpStatus: 500,
            message: 'buildScopeCatalogue requires a { resource: string[] } map.',
        });
    }

    const allScopes = Object.freeze(
        Object.entries(resourceScopes).flatMap(([resource, actions]) =>
            (actions ?? []).map((action) => `${resource}.${action}`),
        ),
    );

    const allScopesSet = new Set(allScopes);

    return Object.freeze({
        resourceScopes: Object.freeze({ ...resourceScopes }),
        allScopes,
        isKnownScope: (scope) => typeof scope === 'string' && allScopesSet.has(scope),
    });
}
