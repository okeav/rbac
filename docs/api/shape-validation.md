---
title: "Shape Validation"
package: "@okeav/rbac-core"
category: "api-reference"
tags: ["rbac", "validation"]
description: "createShapeRegistry — registering and fail-closed asserting the legal (accountType, role, userType) combinations for your account model."
---

# Shape Validation

Real account models usually only allow a handful of legal `(accountType, role, userType[,
accountSubType])` combinations (e.g. "a BUSINESS admin never has a userType", "a MEMBER's userType
must match the account's subtype"). This package has no opinion on what those combinations are —
you register them as predicates.

## `createShapeRegistry(shapes)`

```ts
createShapeRegistry(shapes: ((ctx: object) => boolean)[]) => {
  isValid(ctx?: object) => boolean;
  assertValid(ctx?: object, options?: { message?: string }) => void;  // throws RbacError on failure
}
```

Each predicate receives the full `ctx` object, so shapes that depend on fields beyond the four core
axes (e.g. an `accountSubType`-scoped `userType` list) are expressed by the predicate itself — the
package never needs to know what those extra fields mean.

```js
import { createShapeRegistry } from '@okeav/rbac-core';

const shapes = createShapeRegistry([
  (ctx) => ctx.accountType === 'BUSINESS' && ctx.role === 'ADMIN' && ctx.userType == null,
  (ctx) => ctx.accountType === 'BUSINESS' && ctx.role === 'MEMBER'
           && isValidUserTypeForSubType(ctx.userType, ctx.accountSubType),
  (ctx) => ctx.accountType === 'INDIVIDUAL' && ctx.role === 'MEMBER' && ctx.userType == null,
  (ctx) => ctx.accountType === 'PLATFORM' && ctx.role === 'PLATFORM_ADMIN' && ctx.userType == null,
]);

shapes.isValid(ctx);       // boolean — true if ANY predicate matches
shapes.assertValid(ctx);   // throws RbacError(code: 'INVALID_SHAPE', httpStatus: 500) if none match
```

## Fail-closed by design

If a stored account record doesn't match any registered shape, that's treated as **data
corruption, not a permissions edge case** — `assertValid` throws rather than silently resolving to
an empty or wrong permission set. Call it before `getPermissions` if you want that guarantee at the
point a request enters your system, rather than discovering it as an unexplained empty-scopes
result downstream.

A predicate that itself **throws** is treated as **not matching** (`isValid` wraps each predicate
call in a try/catch and treats a thrown error the same as a `false` return) rather than propagating
the exception — so a defensive predicate doesn't need its own guard clauses against unexpected
`ctx` shapes.

`assertValid`'s `options.message` overrides the default error message; the thrown error is always
`RbacError({ code: 'INVALID_SHAPE', httpStatus: 500, message })` regardless.

## Related

- [Permission Model & Resolution](permission-model.md) — `getPermissions` itself returns `[]` for
  an incomplete context rather than throwing; shape validation is the opt-in hard-fail layer in
  front of it.
- [Errors](errors.md) — `RbacError`, `isRbacError`, and the full `ERROR_CODES` catalogue including
  `INVALID_SHAPE`.
