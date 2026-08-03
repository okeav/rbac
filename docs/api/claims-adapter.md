---
title: "Claims Adapter (Identity Provider Integration)"
package: "@okeav/rbac-core"
category: "api-reference"
tags: ["rbac", "identity-provider", "claims"]
description: "fromClaims — adapting an identity provider's token claims or session object into a PermissionContext, with key remapping."
---

# Claims Adapter (Identity Provider Integration)

This package has no dependency on any specific identity provider or token format — including
`@adaptive-edge/idp-core`. An identity provider authenticates *who* is calling; this package
answers *what they're allowed to do*, given claims that carry your RBAC fields somewhere in the
payload. `fromClaims` adapts whatever claim shape your identity layer produces into a
`PermissionContext`.

## `fromClaims(claims, options?)`

```ts
fromClaims(
  claims: Record<string, unknown>,
  options?: { keys?: { accountType?: string; accountSubType?: string; role?: string; userType?: string; capabilities?: string } },
) => {
  accountType: string;
  accountSubType: string | null;
  role: string;
  userType: string | null;
  capabilities: string[];
}
```

Default claim key names: `accountType`, `accountSubType`, `role`, `userType`, `capabilities`.
`accountSubType`/`userType` default to `null` if absent; `capabilities` defaults to `[]` if the
claim value isn't an array (not just if it's missing).

```js
import { fromClaims, getPermissions } from '@okeav/rbac-core';

const ctx = fromClaims(jwtPayload);

// Remap keys if your provider names them differently — e.g. a payload that
// puts the role under `userRole`:
const ctx2 = fromClaims(jwtPayload, { keys: { role: 'userRole' } });

getPermissions(ctx2, registry);
```

This keeps the package usable whether your claims come from `@adaptive-edge/idp-core`, a
hand-rolled auth service, an external IdP, or a plain session object — as long as the RBAC fields
are present somewhere in the payload under *some* key name, which `keys` tells `fromClaims` how to
find.

Note this is a **pure mapping function** — it doesn't verify a token's signature or check
expiry; call it *after* your identity layer has already authenticated the request and handed you
verified claims.

## Related

- [Permission Model & Resolution](permission-model.md) — `getPermissions(ctx, registry)` is what
  you call next with the object `fromClaims` returns.
- [Express Middleware](express-middleware.md) — `defaultGetContext` reads `req.auth` directly
  rather than calling `fromClaims` itself; wiring an upstream auth middleware to populate
  `req.auth` from `fromClaims`'s output (plus a resolved `scopes` list) is the intended pattern —
  see that page's default-context shape.
