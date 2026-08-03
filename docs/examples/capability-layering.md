---
title: "Layering Capabilities Over Roles"
package: "@okeav/rbac-core"
category: "example"
tags: ["rbac", "capabilities", "permissions"]
description: "Granting a feature-area capability to a user whose role wouldn't otherwise include it, without changing their org-chart position."
---

# Layering Capabilities Over Roles

A common real-world need: grant one user a feature-area permission that their role doesn't
normally include, without inventing a new role or moving them to a different `userType`. That's
exactly what `capabilityScopes` in [`createPermissionRegistry`](../api/permission-model.md) is for.

## The scenario

A recruiting app has `job`/`application` resources. `RECRUITER`s can read jobs and applications but
not create or publish jobs — except a handful of trusted recruiters who've also been given
job-posting responsibility, without becoming `ADMIN`s.

```js
import { createPermissionRegistry, buildScopeCatalogue, getPermissions, hasPermission } from '@okeav/rbac-core';

const catalogue = buildScopeCatalogue({
  job:         ['create', 'read', 'update', 'publish'],
  application: ['create', 'read.own', 'read.any'],
});

const registry = createPermissionRegistry({
  scopesByAccountType: {
    BUSINESS: {
      ADMIN: ['job.*', 'application.*'],
      MEMBER: {
        RECRUITER: ['job.read', 'application.read.any'],
      },
    },
  },
  capabilityScopes: {
    // Granted to ANY user holding this capability, regardless of their
    // accountType/role/userType — layered on top of their base scopes.
    JOB_POSTER: ['job.create', 'job.publish'],
  },
});
```

## Resolving for two recruiters

```js
const plainRecruiter = { accountType: 'BUSINESS', role: 'MEMBER', userType: 'RECRUITER', capabilities: [] };
const trustedRecruiter = { accountType: 'BUSINESS', role: 'MEMBER', userType: 'RECRUITER', capabilities: ['JOB_POSTER'] };

getPermissions(plainRecruiter, registry);
// => ['job.read', 'application.read.any']

getPermissions(trustedRecruiter, registry);
// => ['job.read', 'application.read.any', 'job.create', 'job.publish']

hasPermission(plainRecruiter, 'job.publish', registry);   // false
hasPermission(trustedRecruiter, 'job.publish', registry); // true
```

Both users are still `(BUSINESS, MEMBER, RECRUITER)` — same shape, same org-chart position. Only
the resolved scope list differs, because `getPermissions` unions the role's base scopes with every
capability's scopes.

## Why not just add a new role instead?

You could model this as a `SENIOR_RECRUITER` `userType` instead — that's a legitimate alternative
when the distinction is a permanent org-chart fact. Capabilities are the better fit when the grant
is:

- **Orthogonal to org-chart position** — an `ADMIN` could also hold `JOB_POSTER` even though their
  role already implies it (harmless — [`matchScope`](../api/scope-matching.md) resolves the
  redundant wildcard either way).
- **Toggled independently of a promotion/demotion workflow** — revoking `JOB_POSTER` from one
  recruiter doesn't require changing their role or userType, just their stored capabilities.
- **Not itself a legal shape on its own** — you don't need a new [shape predicate](../api/shape-validation.md)
  for "recruiter who can also post jobs"; it's still the same `(BUSINESS, MEMBER, RECRUITER)` shape.

## Related

- [Permission Model & Resolution](../api/permission-model.md) — the full `getPermissions`
  resolution algorithm.
- [Scope Matching & Catalogues](../api/scope-matching.md) — how a resolved scope list gets checked
  against a specific required permission.
- [Express Quickstart](express-quickstart.md) — the same `BILLING_MANAGER` pattern wired into
  actual route middleware.
