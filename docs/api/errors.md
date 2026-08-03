---
title: "Errors"
package: "@okeav/rbac-core"
category: "api-reference"
tags: ["rbac", "errors"]
description: "RbacError, isRbacError, and the full ERROR_CODES catalogue this package throws."
---

# Errors

Every function that throws across this package uses a single error type, `RbacError` — the
package never shapes an HTTP response itself; your own error-handling middleware maps `{ code,
httpStatus, message }` to whatever envelope your API uses.

## `RbacError`

```ts
class RbacError extends Error {
  constructor(input: { code?: string; httpStatus?: number; message?: string; cause?: unknown });
  name: 'RbacError';
  code: string;       // defaults to 'INTERNAL_ERROR' if not given
  httpStatus: number; // defaults to 500
  cause?: unknown;    // only set if provided
}

function isRbacError(err: unknown): err is RbacError;
```

Mirrors `@adaptive-edge/idp-core`'s `IdpError` shape for consistency across the two packages, so a
consumer using both can share one error-handling middleware pattern.

```js
import { RbacError, isRbacError, ERROR_CODES } from '@okeav/rbac-core';

app.use((err, req, res, next) => {
  if (isRbacError(err)) return res.status(err.httpStatus).json({ code: err.code, message: err.message });
  next(err);
});
```

## `ERROR_CODES`

A stable, frozen reference of every code value this package throws (not runtime-enforced as
exhaustive — a lookup table for writing your own error-handling logic):

| Code | Thrown by |
|---|---|
| `UNAUTHENTICATED` | Express middleware, when `getContext(req)` returns `null` |
| `INSUFFICIENT_SCOPE` | `requireScope`/`requireAllScopes`, when the granted scopes don't satisfy the requirement |
| `INSUFFICIENT_CAPABILITY` | `requireCapability`/`requireAllCapabilities` |
| `INSUFFICIENT_ROLE` | `requireRole`, when `ctx.role` isn't in the allowed list |
| `INVALID_ACCOUNT_TYPE` | `requireAccountType`, when `ctx.accountType` isn't in the allowed list |
| `INVALID_SHAPE` | `shapeRegistry.assertValid()`, when no registered predicate matches; also thrown (misuse guard) if `createShapeRegistry` is called with something other than an array of functions |
| `UNKNOWN_SCOPE` | `buildScopeCatalogue()`, if called with something other than a `{ resource: string[] }` map |

All default-denial codes above come from [Express Middleware](express-middleware.md)'s
`defaultOnDeny` — a custom `onDeny` can throw/pass through whatever error shape you prefer instead.

## Related

- [Express Middleware](express-middleware.md) — `defaultOnDeny`'s reason→code→httpStatus mapping.
- [Shape Validation](shape-validation.md) — `assertValid`'s `INVALID_SHAPE` throw.
