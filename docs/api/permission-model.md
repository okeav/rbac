---
title: "Permission Model & Resolution"
package: "@okeav/rbac-core"
category: "api-reference"
tags: ["rbac", "permissions", "authorization"]
description: "The five-axis account model, PermissionContext shape, createPermissionRegistry, and getPermissions resolution."
---

# Permission Model & Resolution

The package resolves permissions from two inputs you own: a **registry** (your scope-grant
tables) and a **context** (the caller's actual accountType/role/userType/capabilities). It ships
no vocabulary of its own — every capability name, scope string, and role value is your
application's data.

## The five axes

```
accountType → accountSubType → role → userType → capabilities[]
```

| Axis | What it means | Who defines the values |
|---|---|---|
| `accountType` | Top-level account category (e.g. business vs. individual vs. platform staff) | Your app |
| `accountSubType` | Subtype within accountType (e.g. business "company" vs. "agency") | Your app |
| `role` | The role assigned within the account (e.g. admin vs. member) | Your app |
| `userType` | Org-chart position for roles that vary by team position | Your app |
| `capabilities` | Extensible array of granular, additive feature flags | Your app |

`accountSubType` isn't consumed directly by `getPermissions` — it exists for your own shape
predicates (see [Shape Validation](shape-validation.md)) and any app-level logic that needs it.

## `createPermissionRegistry(input)`

```ts
createPermissionRegistry({
  scopesByAccountType?: {
    [accountType: string]: {
      // A flat scope list when the role's grant doesn't vary by userType...
      [role: string]: string[]
      // ...or a map keyed by userType, for roles whose grant depends on an
      // org-chart position:
      [role: string]: { [userType: string]: string[] }
    }
  },
  capabilityScopes?: {
    // Feature-area scopes granted to ANY user holding this capability,
    // layered on top of their base scopes regardless of
    // accountType/role/userType.
    [capability: string]: string[]
  }
}) => registry   // frozen, non-mutable
```

```js
import { createPermissionRegistry } from '@okeav/rbac-core';

const registry = createPermissionRegistry({
  scopesByAccountType: {
    PLATFORM: { PLATFORM_ADMIN: ['*'] },
    BUSINESS: {
      ADMIN: ['job.*', 'application.*'],
      MEMBER: {
        RECRUITER: ['job.read', 'application.read.any'],
      },
    },
  },
  capabilityScopes: {
    JOB_POSTER: ['job.create', 'job.publish'],
  },
});
```

## `getPermissions(ctx, registry)`

```ts
getPermissions(
  ctx: { accountType: string; role: string; userType?: string; capabilities?: string[] },
  registry: ReturnType<typeof createPermissionRegistry>,
) => string[]   // de-duplicated
```

Looks up `registry.scopesByAccountType[ctx.accountType][ctx.role]` — if that's an array, it's used
directly as the base scopes; if it's an object, `[ctx.userType]` is looked up inside it (`[]` if
missing). Capability scopes for every capability in `ctx.capabilities` are then flattened and
merged in. **Returns `[]` (never throws) when `accountType`, `role`, or `registry` is missing** —
treat "no permissions" as the safe default for an incomplete/unknown context. Use
[Shape Validation](shape-validation.md) if you want to hard-fail on a structurally invalid
`(accountType, role, userType)` combination *before* calling this, rather than silently resolving
an empty list.

```js
const ctx = { accountType: 'BUSINESS', role: 'MEMBER', userType: 'RECRUITER', capabilities: ['JOB_POSTER'] };
getPermissions(ctx, registry);
// => ['job.read', 'application.read.any', 'job.create', 'job.publish']
```

If a role's base scopes already include a `resource.*` wildcard, layering a redundant literal
capability scope on top is harmless — [scope matching](scope-matching.md) resolves the wildcard
either way at check time, not at resolution time (`getPermissions` itself does no wildcard
expansion — it just unions the literal strings).

## Related

- [Scope Matching](scope-matching.md) — how the returned scope list is actually checked against a
  required permission (`hasPermission`/`matchScope`).
- [Shape Validation](shape-validation.md) — hard-failing on invalid `(accountType, role, userType)`
  combinations.
- [Claims Adapter](claims-adapter.md) — building a `ctx` from an identity provider's token claims.
- [Express Middleware](express-middleware.md) — route-level `requireScope`/`requireCapability`
  built on top of `getPermissions`/`matchScope`/`hasCapability`.
