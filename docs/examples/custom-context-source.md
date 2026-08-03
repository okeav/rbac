---
title: "Reading Auth Context from a Custom Source"
package: "@okeav/rbac-core"
category: "example"
tags: ["rbac", "express", "middleware", "custom"]
description: "Overriding getContext and onDeny so the Express middleware reads req.user/req.session instead of req.auth, and shapes its own error responses."
---

# Reading Auth Context from a Custom Source

The Express middleware's default behavior (`defaultGetContext`) assumes an upstream auth
middleware has populated `req.auth` in a specific shape (see
[Express Middleware](../api/express-middleware.md)). Plenty of real apps store auth state
differently — `req.user` from Passport, a session object, a request-scoped auth client. Both
`getContext` and `onDeny` are overridable per middleware factory, so you're never locked into the
default shape.

## Overriding `getContext`

Say your app populates `req.user` (via Passport) with `{ id, orgRole, orgUserType, grants,
featureFlags }` — different field names than the default's `accountType`/`role`/`scopes`:

```js
import { createScopeMiddleware, createCapabilityMiddleware } from '@okeav/rbac-core/middleware/express';

const getContext = (req) => {
  if (!req.user) return null; // no req.user at all => treated as unauthenticated
  return {
    accountType: req.user.orgAccountType,
    role: req.user.orgRole,
    userType: req.user.orgUserType,
    scopes: req.user.grants ?? [],
    capabilities: req.user.featureFlags ?? [],
  };
};

const { requireScope } = createScopeMiddleware({ getContext });
const { requireCapability } = createCapabilityMiddleware({ getContext });

router.get('/jobs', requireScope('job.read'), listJobs);
```

Returning `null` from `getContext` is what triggers the `'unauthenticated'` denial reason (401 by
default) — always return `null` for "no identity at all", not an object with empty arrays, so
`onDeny` can tell the two cases apart.

## Overriding `onDeny`

The default `onDeny` calls `next(new RbacError(...))`, which works well if your app already has
`RbacError`-aware error-handling middleware (see [Errors](../api/errors.md)). If your app has its
own error type instead, map the denial info to it directly rather than passing an `RbacError`
through your handler:

```js
class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const onDeny = (req, res, next, { reason, required, granted }) => {
  if (reason === 'unauthenticated') {
    return next(new ApiError(401, 'AUTH_REQUIRED', 'Sign in required.'));
  }
  return next(new ApiError(403, 'FORBIDDEN', `Missing: ${JSON.stringify(required)}`));
};

const { requireScope } = createScopeMiddleware({ getContext, onDeny });
```

`onDeny` receives the same `{ reason, required, granted }` info regardless of which factory called
it — `reason` is `'unauthenticated'`, `'scope'`, `'capability'`, `'role'`, or `'accountType'`
depending on which middleware denied the request (see the
[full reason→code→httpStatus table](../api/express-middleware.md#default-denial-handling--defaultondenyreq-res-next-info)).

## Sharing one config across every route guard

Since `getContext`/`onDeny` are per-factory options (not global), define them once and reuse across
every middleware factory in your app so all four guard types (`requireScope`, `requireCapability`,
`requireRole`, `requireAccountType`) read the same auth shape consistently:

```js
import {
  createScopeMiddleware,
  createCapabilityMiddleware,
  createRequireRole,
  createRequireAccountType,
} from '@okeav/rbac-core/middleware/express';

const authOptions = { getContext, onDeny };

const { requireScope, requireAllScopes } = createScopeMiddleware(authOptions);
const { requireCapability } = createCapabilityMiddleware(authOptions);
const requireRole = createRequireRole(authOptions);
const requireAccountType = createRequireAccountType(authOptions);
```

## Related

- [Express Middleware](../api/express-middleware.md) — the default `getContext`/`onDeny` behavior
  this example overrides, and the full denial-reason table.
- [Errors](../api/errors.md) — `RbacError`/`ERROR_CODES`, if you keep the default `onDeny` instead
  of replacing it.
