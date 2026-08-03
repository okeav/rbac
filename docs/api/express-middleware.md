---
title: "Express Middleware"
package: "@okeav/rbac-core"
category: "api-reference"
tags: ["rbac", "express", "middleware"]
description: "createScopeMiddleware, createCapabilityMiddleware, createRequireRole, createRequireAccountType — route guards, default context extraction, and denial handling."
---

# Express Middleware

Imported from the `@okeav/rbac-core/middleware/express` subpath — not the package root — so the
core package never pulls in an Express type dependency for consumers who only need the pure
functions. Express itself is an **optional peer dependency**, only required if you import this
subpath.

## The four middleware factories

```ts
import {
  createScopeMiddleware,
  createCapabilityMiddleware,
  createRequireRole,
  createRequireAccountType,
} from '@okeav/rbac-core/middleware/express';
```

| Factory | Returns | Match rule |
|---|---|---|
| `createScopeMiddleware(opts?)` | `{ requireScope(...scopes), requireAllScopes(...scopes) }` | wildcard-aware via [`matchScope`](scope-matching.md) — `requireScope` passes if ANY listed scope matches, `requireAllScopes` requires ALL |
| `createCapabilityMiddleware(opts?)` | `{ requireCapability(...caps), requireAllCapabilities(...caps) }` | flat membership via `hasCapability` (no wildcards) — ANY / ALL respectively |
| `createRequireRole(opts?)` | `requireRole(...allowedRoles)` | exact match against `ctx.role` |
| `createRequireAccountType(opts?)` | `requireAccountType(...allowedAccountTypes)` | exact match against `ctx.accountType` |

```js
const { requireScope, requireAllScopes } = createScopeMiddleware();
const { requireCapability } = createCapabilityMiddleware();
const requireRole = createRequireRole();
const requireAccountType = createRequireAccountType();

router.get('/jobs', requireScope('job.read'), listJobs);
router.post('/jobs', requireScope('job.create'), requireCapability('JOB_POSTER'), createJob);
router.post('/jobs/:id/publish', requireAllScopes('job.update', 'job.publish'), publish);
router.delete('/accounts/:id', requireRole('PLATFORM_ADMIN'), deleteAccount);
router.get('/team', requireAccountType('BUSINESS'), listTeam);
```

Every factory accepts the same two options:

```ts
{ getContext?: (req) => PermissionContext | null, onDeny?: (req, res, next, info) => void }
```

## Default context extraction — `defaultGetContext(req)`

Assumes an upstream auth middleware (e.g. idp-core's `authContextMiddleware`, or your own) has
already populated `req.auth` from verified token claims. Returns `null` if `req.auth` is absent at
all, so `onDeny` can distinguish "unauthenticated" from "authenticated with zero grants":

```ts
{
  accountType: req.auth.accountType,
  role: req.auth.role ?? req.auth.userRole,   // falls back to userRole
  userType: req.auth.userType ?? null,
  scopes: req.auth.scopes ?? [],
  capabilities: req.auth.capabilities ?? [],
}
```

Note `scopes` here is the **already-resolved** permission list (the output of
[`getPermissions`](permission-model.md)), not the raw registry — the middleware layer doesn't call
`getPermissions` itself, it expects `req.auth.scopes` to already be resolved by whatever populated
`req.auth` (see the [Express Quickstart](../examples/express-quickstart.md) example for the full
wiring, including where that resolution happens).

Override `getContext` if your app stores auth state elsewhere (`req.user`, `req.session`, ...):

```js
createScopeMiddleware({
  getContext: (req) => req.myCustomAuthShape ? { scopes: req.myCustomAuthShape.grants } : null,
});
```

## Default denial handling — `defaultOnDeny(req, res, next, info)`

Maps a denial `reason` to an `RbacError` and calls `next(err)` — it never writes to `res` itself,
so your app's own error-handling middleware controls the response shape:

| `reason` | `RbacError.code` | `httpStatus` |
|---|---|---|
| `'unauthenticated'` | `UNAUTHENTICATED` | 401 |
| `'scope'` | `INSUFFICIENT_SCOPE` | 403 |
| `'capability'` | `INSUFFICIENT_CAPABILITY` | 403 |
| `'role'` | `INSUFFICIENT_ROLE` | 403 |
| `'accountType'` | `INVALID_ACCOUNT_TYPE` | 403 |

```js
createScopeMiddleware({
  onDeny: (req, res, next, { reason, required, granted }) => next(myOwnError(reason)),
});
```

## Related

- [Errors](errors.md) — `RbacError` shape and the full `ERROR_CODES` catalogue.
- [Scope Matching & Catalogues](scope-matching.md) — the `matchScope` semantics `requireScope`
  relies on.
- [Express Quickstart example](../examples/express-quickstart.md) — a full server wiring a fake
  login, `fromClaims`, `getPermissions`, and this middleware together end-to-end.
