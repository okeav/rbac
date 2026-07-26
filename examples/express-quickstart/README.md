# @okeav/rbac-core — Express quickstart

Runnable in under a minute. No database, no docker, no config file — this
package is pure in-memory functions plus Express middleware.

## 1. Install and run

```bash
cd examples/express-quickstart
npm install
npm start
```

You should see:

```
rbac-core quickstart listening on http://localhost:3000
Known scopes: project.create, project.read, project.update, project.archive, project.delete, task.create, task.read, task.update, task.delete, billing.read, billing.update
```

## 2. Try it

This example app models a small project-management SaaS: `PERSONAL` accounts
(one occupant, full control) and `ORG` accounts (`OWNER` + `MEMBER`s whose
base grant depends on `userType`). `/demo-login` stands in for a real
identity provider — it just base64-encodes whatever identity you ask for
into a fake bearer token (see `server.js` for where a real JWT/session would
plug in instead).

```bash
# A DEVELOPER on an ORG account
curl -X POST http://localhost:3000/demo-login \
  -H "Content-Type: application/json" \
  -d '{"accountType":"ORG","role":"MEMBER","userType":"DEVELOPER","capabilities":[]}'
# -> { "token": "..." }

TOKEN="paste the token here"

curl http://localhost:3000/projects -H "Authorization: Bearer $TOKEN"
# -> 200, DEVELOPER has project.read

curl -X POST http://localhost:3000/projects -H "Authorization: Bearer $TOKEN"
# -> 403 INSUFFICIENT_SCOPE — DEVELOPER's base grant has no project.create

curl http://localhost:3000/billing -H "Authorization: Bearer $TOKEN"
# -> 403 — no billing scopes at all for a DEVELOPER
```

Now log in as the same DEVELOPER but with the `BILLING_MANAGER` capability
switched on — the org-chart position (`userType`) doesn't change, but a new
feature area lights up:

```bash
curl -X POST http://localhost:3000/demo-login \
  -H "Content-Type: application/json" \
  -d '{"accountType":"ORG","role":"MEMBER","userType":"DEVELOPER","capabilities":["BILLING_MANAGER"]}'

TOKEN="paste the new token here"
curl http://localhost:3000/billing -H "Authorization: Bearer $TOKEN"
# -> 200 now
```

An `ORG OWNER` gets every scope via its resource wildcards, no capability needed:

```bash
curl -X POST http://localhost:3000/demo-login \
  -H "Content-Type: application/json" \
  -d '{"accountType":"ORG","role":"OWNER","capabilities":[]}'

TOKEN="paste the owner token here"
curl -X POST http://localhost:3000/projects -H "Authorization: Bearer $TOKEN"       # 200
curl -X POST http://localhost:3000/projects/123/archive -H "Authorization: Bearer $TOKEN"  # 200
```

Try an invalid shape (an ORG MEMBER needs a valid `userType`) and a request with no token at all:

```bash
curl -X POST http://localhost:3000/demo-login \
  -H "Content-Type: application/json" \
  -d '{"accountType":"ORG","role":"MEMBER","capabilities":[]}'
# -> 400 INVALID_SHAPE — MEMBER requires userType DEVELOPER or MANAGER

curl http://localhost:3000/projects
# -> 401 UNAUTHENTICATED — no Authorization header at all
```

## What to look at next

- `server.js` — the whole example is one file: catalogue, registry, shape registry, the claims adapter, and the middleware wiring, each commented.
- `../../README.md` — full reference for every function and the middleware customization hooks (`getContext`/`onDeny`).

## This is a quickstart, not a production auth system

- `/demo-login` performs **no authentication whatsoever** — it hands back whatever identity you ask for. Replace it with a real identity provider (password/OIDC/session/whatever) that verifies who's calling before your app decides what they're allowed to do.
- The "token" is base64, not signed — anyone can forge one. A real deployment issues signed JWTs (or opaque session tokens looked up server-side) and this package only ever sees the verified claims.
