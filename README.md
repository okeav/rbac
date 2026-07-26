# @okeav/rbac-core

A standalone, framework-agnostic RBAC engine for Node.js/TypeScript backends, built around a five-axis account model:

```
accountType → accountSubType → role → userType → capabilities[]
```

Extracted from and generalized out of a proven production RBAC system. Every capability name, scope string, and role value from that origin has deliberately been left behind — this package fixes the **shape** of the model (the axes above) and the **algorithm** that resolves them into effective permissions, but ships no vocabulary of its own. You bring your own domain (projects/invoices/documents/whatever it is); the package brings wildcard scope matching, permission layering, a configurable account-shape validator, and framework middleware.

Zero required setup: no database, no config file, no network calls. Everything is in-memory pure functions plus optional Express middleware — install it, describe your roles/scopes as plain objects, and it works. See `examples/express-quickstart/` for a complete server you can run in under a minute.

This package has no dependency on any specific identity/authentication layer. It pairs well with `@adaptive-edge/idp-core` (or any auth system, or none at all) — see [Integrating with an identity provider](#integrating-with-an-identity-provider) for how the two connect without coupling to each other.

## Install

```
npm install @okeav/rbac-core
```

Express integration is an optional peer dependency — only needed if you use `@okeav/rbac-core/middleware/express`.

## Local development

```bash
npm test                            # full unit + integration suite (node --test), no setup required
cd examples/express-quickstart && npm install && npm start   # runnable demo server
```

## Core concepts

| Concept | What it means | Who defines the values |
|---|---|---|
| `accountType` | Top-level account category (e.g. business vs. individual vs. platform staff) | Your app |
| `accountSubType` | Subtype within accountType (e.g. business "company" vs. "agency") | Your app |
| `role` | The role assigned within the account (e.g. admin vs. member) | Your app |
| `userType` | Org-chart position for roles that vary by team position | Your app |
| `capabilities` | An extensible array of granular, additive feature flags — designed to grow over time without changing the model shape | Your app |

The package never hardcodes these values — it takes a **registry** (your scope-grant tables) and a **context** (the caller's actual accountType/role/userType/capabilities) and resolves the two together.

## Quick start

```js
import { createPermissionRegistry, getPermissions, hasPermission, buildScopeCatalogue } from '@okeav/rbac-core';

// 1. Build your scope catalogue (your domain's resource/action vocabulary).
const catalogue = buildScopeCatalogue({
  job:         ['create', 'read', 'update', 'publish'],
  application: ['create', 'read.own', 'read.any'],
});

// 2. Build your permission registry — base scopes per (accountType, role[, userType]),
//    plus capability-driven scopes layered on top of any of them.
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

// 3. Resolve permissions for a real user.
const ctx = { accountType: 'BUSINESS', role: 'MEMBER', userType: 'RECRUITER', capabilities: ['JOB_POSTER'] };
getPermissions(ctx, registry);
// => ['job.read', 'application.read.any', 'job.create', 'job.publish']

hasPermission(ctx, 'job.publish', registry); // => true
```

## Wildcard scope matching

Scopes follow the `resource.action` or `resource.action.qualifier` grammar (the qualifier convention — e.g. `.own` / `.any` — is your naming choice, not enforced by the package).

```js
import { matchScope } from '@okeav/rbac-core';

matchScope(['job.*'], 'job.read');                    // true  — resource wildcard
matchScope(['*'], 'anything.at.all');                  // true  — global wildcard
matchScope(['application.read.*'], 'application.read.own'); // true — qualifier wildcard
matchScope(['*.read'], 'job.read');                    // true  — action wildcard, unqualified only
matchScope(['*.read'], 'application.read.own');         // false — qualified form needs '*.read.*'
matchScope(['*.read.*'], 'application.read.own');       // true
```

## Validating (accountType, role, userType) shapes

Real account models usually only allow a handful of legal combinations (e.g. "a BUSINESS admin never has a userType", "a MEMBER's userType must match the account's subtype"). This package doesn't know your combinations — you register them as predicates:

```js
import { createShapeRegistry } from '@okeav/rbac-core';

const shapes = createShapeRegistry([
  (ctx) => ctx.accountType === 'BUSINESS' && ctx.role === 'ADMIN' && ctx.userType == null,
  (ctx) => ctx.accountType === 'BUSINESS' && ctx.role === 'MEMBER' && isValidUserTypeForSubType(ctx.userType, ctx.accountSubType),
  (ctx) => ctx.accountType === 'INDIVIDUAL' && ctx.role === 'MEMBER' && ctx.userType == null,
  (ctx) => ctx.accountType === 'PLATFORM' && ctx.role === 'PLATFORM_ADMIN' && ctx.userType == null,
]);

shapes.assertValid(ctx); // throws RbacError(code: 'INVALID_SHAPE') if ctx matches none of the above
```

Fail-closed by design: if a stored account record doesn't match any registered shape, that's data corruption, not a permissions edge case — `assertValid` throws rather than silently resolving to an empty or wrong permission set.

## Integrating with an identity provider

This package has no dependency on any specific identity provider or token format — including `@adaptive-edge/idp-core`. Identity providers authenticate *who* is calling; this package answers *what they're allowed to do*, given claims that carry your RBAC fields. `fromClaims` adapts whatever claim shape your identity layer produces into a `PermissionContext`:

```js
import { fromClaims, getPermissions } from '@okeav/rbac-core';

// Default claim key names: accountType, accountSubType, role, userType, capabilities
const ctx = fromClaims(jwtPayload);

// Remap keys if your provider names them differently
// (e.g. a payload that puts the role under `userRole`)
const ctx2 = fromClaims(jwtPayload, { keys: { role: 'userRole' } });

getPermissions(ctx2, registry);
```

This keeps the package usable whether your claims come from `@adaptive-edge/idp-core`, a hand-rolled auth service, an external IdP, or a session object — as long as the RBAC fields are present somewhere in the payload.

## Express middleware

Import from the `/middleware/express` subpath so the core package never pulls in an Express type dependency for consumers who only need the pure functions.

```js
import { createScopeMiddleware, createCapabilityMiddleware, createRequireRole, createRequireAccountType } from '@okeav/rbac-core/middleware/express';

const { requireScope, requireAllScopes } = createScopeMiddleware();
const { requireCapability } = createCapabilityMiddleware();
const requireRole = createRequireRole();
const requireAccountType = createRequireAccountType();

router.get('/jobs', requireScope('job.read'), listJobs);
router.post('/jobs', requireScope('job.create'), requireCapability('JOB_POSTER'), createJob);
router.delete('/accounts/:id', requireRole('PLATFORM_ADMIN'), deleteAccount);
```

By default, middleware reads `req.auth.{accountType,role,userType,scopes,capabilities}` (falling back to `req.auth.userRole` for role) and denies with an `RbacError` passed to `next(err)`. Override either behavior:

```js
createScopeMiddleware({
  getContext: (req) => req.myCustomAuthShape ? {...} : null, // return null => treated as unauthenticated
  onDeny: (req, res, next, { reason, required, granted }) => next(myOwnError(reason)),
});
```

## Errors

Every function that throws uses the single `RbacError` type — never shapes an HTTP response itself:

```js
import { RbacError, isRbacError, ERROR_CODES } from '@okeav/rbac-core';

app.use((err, req, res, next) => {
  if (isRbacError(err)) return res.status(err.httpStatus).json({ code: err.code, message: err.message });
  next(err);
});
```

## What this package deliberately does NOT do (v1 scope)

- No generic policy engine, no ABAC/ReBAC — just the fixed accountType/accountSubType/role/userType/capabilities axes.
- No bundled scope or capability *values* — your app's vocabulary is config you pass in, never package content.
- No persistence/storage adapter — this package is pure functions + middleware. If your app persists per-user scope overrides, your app layer reads them and passes the resolved context in; this package doesn't own that data.
- No UI components.
- No service-to-service or tenant-level entitlement system (`SERVICE_SCOPES`/`TENANT_SCOPES` equivalents) — those stay app-specific for now.

## Testing

```
npm test
```

Full unit-test coverage for every module, plus an integration suite (`test/integration.okeav-fixture.test.js`) built against a realistic fixture (`test/fixtures/okeav-registry.fixture.js`) modeled on a real production RBAC configuration — proving the extracted, generic engine reproduces real-world permission decisions, not just toy examples.
