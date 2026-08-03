---
title: "Scope Matching & Catalogues"
package: "@okeav/rbac-core"
category: "api-reference"
tags: ["rbac", "scopes", "wildcard"]
description: "matchScope's wildcard grammar, hasPermission/hasAllPermissions/hasAnyPermission, and buildScopeCatalogue."
---

# Scope Matching & Catalogues

Scopes follow a `resource.action` or `resource.action.qualifier` grammar. The qualifier convention
(e.g. `.own` / `.any`) is your naming choice, not enforced by the package — `matchScope` only cares
about segment count and wildcard `*` placement.

## `matchScope(grantedScopes, requiredScope)`

```ts
matchScope(grantedScopes: string[], requiredScope: string) => boolean
```

Granted-side wildcards:

| Granted | Matches |
|---|---|
| `*` | every scope |
| `resource.*` | every action on `resource` |
| `resource.action.*` | every qualifier on `resource.action` (matches both the 2-segment and any 3-segment required form) |
| `*.action` | that 2-segment action across every resource |
| `*.action.*` | that action with any qualifier across every resource |

```js
import { matchScope } from '@okeav/rbac-core';

matchScope(['job.*'], 'job.read');                          // true  — resource wildcard
matchScope(['*'], 'anything.at.all');                       // true  — global wildcard
matchScope(['application.read.*'], 'application.read.own'); // true  — qualifier wildcard
matchScope(['*.read'], 'job.read');                         // true  — action wildcard, unqualified only
matchScope(['*.read'], 'application.read.own');              // false — qualified form needs '*.read.*'
matchScope(['*.read.*'], 'application.read.own');            // true
```

**`*.action` deliberately does not match a 3-segment `resource.action.qualifier` required scope** —
a qualified form is treated as more privileged than its unqualified form (matching a convention
where e.g. `.any` means cross-tenant access). Use `*.action.*` to span both segment lengths.
Returns `false` if `requiredScope` is falsy or `grantedScopes` isn't an array (never throws).

## `hasPermission` / `hasAllPermissions` / `hasAnyPermission`

```ts
hasPermission(ctx, permission: string, registry) => boolean
hasAllPermissions(ctx, required: string[], registry) => boolean
hasAnyPermission(ctx, required: string[], registry) => boolean
```

Thin wrappers that call [`getPermissions(ctx, registry)`](permission-model.md) once, then check the
result with `matchScope` — `hasAllPermissions`/`hasAnyPermission` are `.every`/`.some` over the
required list.

```js
import { hasPermission } from '@okeav/rbac-core';

hasPermission(ctx, 'job.publish', registry); // => true
```

## `buildScopeCatalogue(resourceScopes)`

```ts
buildScopeCatalogue(resourceScopes: { [resource: string]: string[] }) => {
  resourceScopes: typeof resourceScopes;  // frozen, echoed back
  allScopes: string[];                    // frozen, flat "resource.action" list
  isKnownScope: (scope: string) => boolean;
}
```

Builds a validated, frozen catalogue from your own resource→actions vocabulary — this package
ships none of its own. `isKnownScope` is meant for route-guard tests, so a typo'd scope string
fails loudly instead of silently always-denying.

```js
import { buildScopeCatalogue } from '@okeav/rbac-core';

const catalogue = buildScopeCatalogue({
  job:         ['create', 'read', 'update', 'publish'],
  application: ['create', 'read.own', 'read.any'],
});
catalogue.allScopes;               // ['job.create', 'job.read', ..., 'application.read.any']
catalogue.isKnownScope('job.read'); // true
```

Throws `RbacError({ code: 'UNKNOWN_SCOPE', httpStatus: 500 })` if `resourceScopes` isn't a plain
object at all (not a runtime scope-lookup failure — a misuse-of-the-API guard at catalogue build
time).

## Related

- [Permission Model & Resolution](permission-model.md) — where the `grantedScopes`/`ctx` inputs to
  this page's functions come from.
- [Express Middleware](express-middleware.md) — `requireScope`/`requireAllScopes` built on
  `matchScope`.
