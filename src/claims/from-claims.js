/**
 * Adapt an arbitrary identity-token payload (JWT claims, session object,
 * whatever your identity provider hands you) into a PermissionContext this
 * package's functions understand.
 *
 * This is the integration seam with an identity layer like
 * @adaptive-edge/idp-core: idp-core (and most identity providers) know
 * nothing about accountType/role/capabilities — those are your
 * application's RBAC model, carried as custom claims. `fromClaims` just
 * needs to know which claim keys hold which piece of your model; it does
 * not assume any particular identity provider populated them.
 *
 * Default key names match a conventional claim set. Pass `keys` to remap
 * when your claims use different names — e.g. Okeav's current auth-service
 * puts the role under `userRole`, not `role`:
 *
 *   fromClaims(jwtPayload, { keys: { role: 'userRole' } });
 *
 * @param {Record<string, unknown>} claims
 * @param {Object} [options]
 * @param {Object} [options.keys] - override claim key names
 * @returns {{accountType: string, accountSubType: string|null, role: string, userType: string|null, capabilities: string[]}}
 */
export function fromClaims(claims = {}, { keys = {} } = {}) {
    const {
        accountType: accountTypeKey = 'accountType',
        accountSubType: accountSubTypeKey = 'accountSubType',
        role: roleKey = 'role',
        userType: userTypeKey = 'userType',
        capabilities: capabilitiesKey = 'capabilities',
    } = keys;

    return {
        accountType: claims[accountTypeKey],
        accountSubType: claims[accountSubTypeKey] ?? null,
        role: claims[roleKey],
        userType: claims[userTypeKey] ?? null,
        capabilities: Array.isArray(claims[capabilitiesKey]) ? claims[capabilitiesKey] : [],
    };
}
