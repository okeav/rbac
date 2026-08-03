---
title: "Wiring Up with @okeav/idp-core"
package: "@okeav/rbac-core"
category: "example"
tags: ["rbac", "identity-provider", "express", "idp-core"]
description: "End-to-end: idp-core issues a token carrying your RBAC fields via hooks.resolveAuthContext, an adapter middleware bridges req.auth.claims into rbac-core's expected shape, then rbac-core's route guards take over."
---

# Wiring Up with `@okeav/idp-core`

`@okeav/idp-core` and `@okeav/rbac-core` have no dependency on each other — idp-core "ships no
scope-matching or permission-checking logic" by design, and rbac-core has no opinion on how you
authenticate. This example wires the two together for real, including the one shape mismatch
you'll actually hit: **idp-core nests your custom claims one level deeper than rbac-core's default
middleware reads them.**

## The shape mismatch

After `authContextMiddleware()` runs, idp-core sets:

```ts
req.auth = { userId: string; email: string; claims: Record<string, unknown>; tokenMeta: {...} }
```

`claims` is whatever object your app put there at token-issuance time — idp-core never validates
or interprets it. rbac-core's Express middleware, on the other hand, defaults to reading a **flat**
shape directly off `req.auth`:

```ts
req.auth = { accountType, role, userType, scopes, capabilities }
```

So `req.auth.claims.accountType` (idp-core's shape) and `req.auth.accountType` (rbac-core's default
expectation) are not the same path. Two options: pass a custom `getContext` to every rbac-core
middleware factory that reads `req.auth.claims.*` instead — or add one small adapter middleware
that reshapes `req.auth` once, right after idp-core's own middleware, so every downstream
`requireScope`/`requireCapability`/etc. can use rbac-core's defaults unmodified. This example does
the latter; it's less repetition across many route files.

## Step 1 — get your RBAC fields into the token

Login flows that mint a session on your behalf (password login, MFA-verify, SSO callback,
magic-link verify, WebAuthn login) call `hooks.resolveAuthContext(user, ctx)` synchronously, right
before token issuance, to build the `claims` object. This is where your app's RBAC fields — read
from wherever your app stores them (a field on the user record, a separate accounts table, ...) —
get embedded:

```js
import { initIdentityProvider } from '@okeav/idp-core';

await initIdentityProvider({
  issuer: 'https://idp.example.com',
  mongo: { uri: process.env.MONGO_URI },
  signingKeys: { keys: { /* ... */ } },
  security: { emailHashPepper: '...', tokenHashSecret: '...' },

  hooks: {
    // `user` is the full IdentityUser record idp-core just authenticated.
    // Read your app's RBAC fields off it (or a joined accounts record) here.
    resolveAuthContext: async (user) => ({
      claims: {
        accountType: user.profile.accountType,
        accountSubType: user.profile.accountSubType ?? null,
        role: user.profile.role,
        userType: user.profile.userType ?? null,
        capabilities: user.profile.capabilities ?? [],
      },
    }),
  },
});
```

## Step 2 — the adapter middleware

Mount this once, immediately after `authContextMiddleware()` and before any route that uses
rbac-core's guards. It bridges idp-core's nested `req.auth.claims` into the flat shape rbac-core's
default `getContext` reads, resolving the effective scope list in the same step:

```js
import { authContextMiddleware } from '@okeav/idp-core';
import { fromClaims, getPermissions } from '@okeav/rbac-core';

// Your app's registry — see rbac-core's Permission Model & Resolution docs.
const registry = createPermissionRegistry({ /* ... */ });

function attachRbacContext(req, res, next) {
  if (!req.auth) return next(); // authContextMiddleware ran with { optional: true } and no token
  const ctx = fromClaims(req.auth.claims ?? {});
  req.auth = {
    ...req.auth,             // keep userId/email/tokenMeta for handlers that still want them
    ...ctx,                  // accountType, accountSubType, role, userType, capabilities
    scopes: getPermissions(ctx, registry),
  };
  next();
}

app.use('/api', authContextMiddleware(), attachRbacContext);
```

`fromClaims` defaults to reading `accountType`/`accountSubType`/`role`/`userType`/`capabilities` —
the exact keys `resolveAuthContext` wrote above, so no `keys` remapping is needed here. If your
app's `resolveAuthContext` uses different field names, pass `fromClaims(req.auth.claims, { keys: {...} })`
instead (see rbac-core's [Claims Adapter](../api/claims-adapter.md)).

## Step 3 — route guards, unchanged

With `req.auth` now flat, every rbac-core middleware factory works with its defaults — no
per-factory `getContext` override needed:

```js
import { createScopeMiddleware, createCapabilityMiddleware } from '@okeav/rbac-core/middleware/express';

const { requireScope } = createScopeMiddleware();
const { requireCapability } = createCapabilityMiddleware();

app.get('/api/jobs', requireScope('job.read'), listJobs);
app.post('/api/jobs', requireScope('job.create'), requireCapability('JOB_POSTER'), createJob);
```

## Error handling for both packages together

idp-core throws `IdpError`, rbac-core throws `RbacError` — both packages deliberately mirror the
same `{ code, httpStatus, message }` shape (see rbac-core's [Errors](../api/errors.md)), so one
error-handling middleware covers both without knowing which package threw:

```js
import { isIdpError } from '@okeav/idp-core';
import { isRbacError } from '@okeav/rbac-core';

app.use((err, req, res, next) => {
  if (isIdpError(err) || isRbacError(err)) {
    return res.status(err.httpStatus || 500).json({ error: err.code, message: err.message });
  }
  next(err);
});
```

## What idp-core's OAuth2 access tokens carry instead

If a caller authenticates via idp-core's OAuth2 authorization-server flows rather than a session
login, the issued token carries `claims: { scope, clientId }` (OAuth2 scopes, not your RBAC
fields) — `resolveAuthContext` is a **session-login-only** hook, not consulted for OAuth2-issued
tokens. Don't assume `req.auth.claims.accountType` is present on every authenticated request if
your API also accepts OAuth2 client tokens; check for it and fall back to a service-level
authorization decision instead of calling `fromClaims` on OAuth2 claims.

## Related

- [Permission Model & Resolution](../api/permission-model.md)
- [Claims Adapter](../api/claims-adapter.md) — `fromClaims`'s key-remapping option.
- [Express Middleware](../api/express-middleware.md) — the default `req.auth` shape this example's
  adapter middleware produces.
- idp-core's [Middleware](https://github.com/okeav/idp/blob/main/docs/api/middleware.md) —
  `authContextMiddleware`'s exact `req.auth` shape before adaptation.
- idp-core's [Bootstrap & Config](https://github.com/okeav/idp/blob/main/docs/api/bootstrap-config.md) —
  `hooks.resolveAuthContext` and "Claims are opaque".
