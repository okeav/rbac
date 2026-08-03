# @okeav/rbac-core Documentation

Reference documentation and runnable examples for
[`@okeav/rbac-core`](https://github.com/okeav/rbac) — a standalone, framework-agnostic RBAC engine
for Node.js/TypeScript backends, built around a five-axis account model (`accountType →
accountSubType → role → userType → capabilities[]`). Ships no scope/capability vocabulary of its
own — you bring your domain, the package brings resolution, wildcard matching, shape validation,
and Express middleware.

This tree is content-only — no build step, no MCP/search server here (see "Structure" below for
why it's laid out this way).

## Layout

```
docs/
  api/         one file per concept area — purpose, full signatures, config, errors, return shapes
  examples/    one working scenario per file
```

This tree lives in the `@okeav/rbac-core` package repo itself (the source it documents), not on
the okeav platform — the platform pulls a copy of it via a manual sync, not an automatic trigger
(same convention as `@okeav/idp-core`'s `docs/` tree).

Every file carries the same YAML frontmatter (`title`, `package`, `category`, `tags`,
`description`) so the set can be indexed/filtered programmatically — `category` is
`api-reference` or `example`; `tags` are use-case labels (`rbac`, `permissions`, `scopes`,
`wildcard`, `validation`, `identity-provider`, `claims`, `express`, `middleware`, `errors`,
`capabilities`, `custom`, `quickstart`). Every file cross-links related files by relative path.

## API reference (`api/`)

| File | Covers |
|---|---|
| [permission-model.md](api/permission-model.md) | The five-axis model, `createPermissionRegistry`, `getPermissions` resolution |
| [scope-matching.md](api/scope-matching.md) | `matchScope`'s wildcard grammar, `hasPermission`/`hasAllPermissions`/`hasAnyPermission`, `buildScopeCatalogue` |
| [shape-validation.md](api/shape-validation.md) | `createShapeRegistry`, fail-closed `assertValid` |
| [claims-adapter.md](api/claims-adapter.md) | `fromClaims` — identity-provider integration seam, key remapping |
| [express-middleware.md](api/express-middleware.md) | `createScopeMiddleware`, `createCapabilityMiddleware`, `createRequireRole`, `createRequireAccountType`, default context/denial behavior |
| [errors.md](api/errors.md) | `RbacError`, `isRbacError`, the full `ERROR_CODES` catalogue |

## Examples (`examples/`)

| File | Scenario |
|---|---|
| [express-quickstart.md](examples/express-quickstart.md) | Full runnable server: registry, shapes, fake login, route guards |
| [capability-layering.md](examples/capability-layering.md) | Granting a feature-area capability without changing a user's role |
| [custom-context-source.md](examples/custom-context-source.md) | Reading auth context from `req.user`/a session instead of `req.auth`, custom error shaping |
| [idp-core-integration.md](examples/idp-core-integration.md) | Full wiring with `@okeav/idp-core` — `resolveAuthContext`, the `req.auth.claims` shape mismatch, and shared error handling |

## Source of truth

Written directly against the `@okeav/rbac-core` source (`README.md` and every module under `src/`:
`permissions/`, `scopes/`, `shapes/`, `claims/`, `errors/`, `middleware/express/`), kept in sync as
the package evolves.
