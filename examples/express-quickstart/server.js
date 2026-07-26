import express from 'express';
import {
    createPermissionRegistry,
    buildScopeCatalogue,
    createShapeRegistry,
    fromClaims,
    getPermissions,
} from '@okeav/rbac-core';
import { createScopeMiddleware, createCapabilityMiddleware } from '@okeav/rbac-core/middleware/express';

// ── Domain: a small project-management app ───────────────────────────────
// Deliberately NOT the same domain as this package's own test fixtures —
// the point of this quickstart is that rbac-core carries none of that
// vocabulary. Swap every string below for your own resources/roles/capabilities.

const scopeCatalogue = buildScopeCatalogue({
    project: ['create', 'read', 'update', 'archive', 'delete'],
    task:    ['create', 'read', 'update', 'delete'],
    billing: ['read', 'update'],
});

const registry = createPermissionRegistry({
    scopesByAccountType: {
        // A PERSONAL account has one occupant — full control over their own stuff.
        PERSONAL: {
            MEMBER: ['project.*', 'task.*'],
        },
        // An ORG account has an OWNER (full control) and MEMBERs whose base
        // grant depends on their userType (org-chart position).
        ORG: {
            OWNER: ['project.*', 'task.*', 'billing.*'],
            MEMBER: {
                DEVELOPER: ['project.read', 'task.*'],
                MANAGER:   ['project.*', 'task.*'],
            },
        },
    },
    capabilityScopes: {
        // Feature-area flags layered on top of the base grant above, regardless
        // of accountType/role/userType — e.g. a DEVELOPER who's also trusted
        // with billing, without changing their org-chart position.
        BILLING_MANAGER: ['billing.read', 'billing.update'],
        ARCHIVER:        ['project.archive'],
    },
});

// Every legal (accountType, role, userType) combination in this app's model.
const shapes = createShapeRegistry([
    (ctx) => ctx.accountType === 'PERSONAL' && ctx.role === 'MEMBER' && ctx.userType == null,
    (ctx) => ctx.accountType === 'ORG' && ctx.role === 'OWNER' && ctx.userType == null,
    (ctx) => ctx.accountType === 'ORG' && ctx.role === 'MEMBER' && ['DEVELOPER', 'MANAGER'].includes(ctx.userType),
]);

// ── Fake "login" — stands in for a real identity provider ────────────────
// A real app verifies a signed JWT here (e.g. via @adaptive-edge/idp-core,
// or any other auth system) and reads these same fields out of its claims.
// This quickstart skips signing entirely so there's nothing to configure —
// /demo-login just base64-encodes whatever identity you ask for.

const app = express();
app.use(express.json());

app.post('/demo-login', (req, res) => {
    const { accountType, accountSubType, role, userType, capabilities } = req.body;
    const claims = { accountType, accountSubType, role, userType, capabilities };
    if (!shapes.isValid(claims)) {
        return res.status(400).json({
            error: 'INVALID_SHAPE',
            message: 'That (accountType, role, userType) combination is not a registered valid shape for this app.',
        });
    }
    const token = Buffer.from(JSON.stringify(claims)).toString('base64url');
    res.json({ token });
});

// Decodes the demo token, adapts it into a PermissionContext via fromClaims
// (the seam a real app wires up to its actual identity layer's claim
// shape — see README "Integrating with an identity provider"), then
// resolves the effective scopes for that context against this app's
// registry. req.auth is what the middleware below reads: accountType/role/
// userType/capabilities for context, plus the RESOLVED scopes list.
app.use((req, _res, next) => {
    const auth = req.headers.authorization;
    if (auth?.startsWith('Bearer ')) {
        try {
            const claims = JSON.parse(Buffer.from(auth.slice(7), 'base64url').toString('utf8'));
            const ctx = fromClaims(claims);
            req.auth = { ...ctx, scopes: getPermissions(ctx, registry) };
        } catch {
            // malformed token — leave req.auth unset, protected routes will 401
        }
    }
    next();
});

// ── Protected routes ───────────────────────────────────────────────────────

const { requireScope } = createScopeMiddleware();
const { requireCapability } = createCapabilityMiddleware();

app.get('/projects', requireScope('project.read'), (req, res) => {
    res.json({ message: `Projects visible to a ${req.auth.role} on a ${req.auth.accountType} account.` });
});

app.post('/projects', requireScope('project.create'), (req, res) => {
    res.json({ message: 'Project created.' });
});

// Archiving requires the ARCHIVER capability OR a role whose base scopes
// already include project.archive (ORG OWNER's 'project.*' wildcard) —
// requireScope is wildcard-aware via matchScope either way.
app.post('/projects/:id/archive', requireScope('project.archive'), (req, res) => {
    res.json({ message: `Project ${req.params.id} archived.` });
});

app.get('/billing', requireScope('billing.read'), (req, res) => {
    res.json({ message: 'Billing details.' });
});

// Capability-gated route shown separately from scope-gated ones — useful
// when you want to gate on "does this feature exist for this user" rather
// than a specific action verb.
app.get('/billing/manage', requireCapability('BILLING_MANAGER'), (req, res) => {
    res.json({ message: 'Billing management console.' });
});

app.use((err, _req, res, _next) => {
    res.status(err.httpStatus || 500).json({ error: err.code || 'INTERNAL_ERROR', message: err.message });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`rbac-core quickstart listening on http://localhost:${port}`);
    console.log(`Known scopes: ${scopeCatalogue.allScopes.join(', ')}`);
});
