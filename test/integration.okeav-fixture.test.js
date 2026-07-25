import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { getPermissions } from '../src/permissions/resolve.js';
import { hasPermission } from '../src/permissions/check.js';
import { fromClaims } from '../src/claims/from-claims.js';
import {
    ACCOUNT_TYPES,
    ACCOUNT_SUB_TYPES,
    USER_ROLES,
    USER_TYPES,
    CAPABILITIES,
    scopeCatalogue,
    permissionRegistry,
    shapeRegistry,
} from './fixtures/okeav-registry.fixture.js';

/**
 * Integration-style tests against a fixture rebuilt from Okeav's real
 * production RBAC tables (see fixtures/okeav-registry.fixture.js). These
 * exist to prove the extracted, stateless package reproduces the same
 * effective-permission decisions the internal @okeav/rbac-core makes today
 * — not just that the generic primitives work in isolation.
 */

describe('Okeav fixture — PLATFORM_ADMIN', () => {
    test('gets the universal wildcard', () => {
        const ctx = { accountType: ACCOUNT_TYPES.PLATFORM, role: USER_ROLES.PLATFORM_ADMIN };
        assert.deepEqual(getPermissions(ctx, permissionRegistry), ['*']);
        assert.equal(hasPermission(ctx, 'job.publish', permissionRegistry), true);
        assert.equal(shapeRegistry.isValid(ctx), true);
    });
});

describe('Okeav fixture — BUSINESS ADMIN', () => {
    test('gets resource wildcards and is a valid shape regardless of userType', () => {
        const ctx = { accountType: ACCOUNT_TYPES.BUSINESS, role: USER_ROLES.ADMIN, userType: null };
        assert.equal(hasPermission(ctx, 'job.create', permissionRegistry), true);
        assert.equal(hasPermission(ctx, 'billing.update', permissionRegistry), true);
        assert.equal(shapeRegistry.isValid(ctx), true);
    });
});

describe('Okeav fixture — BUSINESS MEMBER (COMPANY subtype, RECRUITER)', () => {
    const base = {
        accountType: ACCOUNT_TYPES.BUSINESS,
        accountSubType: ACCOUNT_SUB_TYPES.COMPANY,
        role: USER_ROLES.MEMBER,
        userType: USER_TYPES.RECRUITER,
    };

    test('is a valid shape', () => {
        assert.equal(shapeRegistry.isValid(base), true);
    });

    test('a RECRUITER without JOB_POSTER can read jobs but not create/publish them', () => {
        assert.equal(hasPermission(base, 'job.read', permissionRegistry), true);
        assert.equal(hasPermission(base, 'job.create', permissionRegistry), false);
        assert.equal(hasPermission(base, 'job.publish', permissionRegistry), false);
    });

    test('granting JOB_POSTER capability adds create/publish without an admin having to re-customise scopes', () => {
        const withCap = { ...base, capabilities: [CAPABILITIES.JOB_POSTER] };
        assert.equal(hasPermission(withCap, 'job.create', permissionRegistry), true);
        assert.equal(hasPermission(withCap, 'job.publish', permissionRegistry), true);
        // still no access to a different resource's scopes
        assert.equal(hasPermission(withCap, 'billing.update', permissionRegistry), false);
    });

    test('a CONSULTANT userType (AGENCY-only) is not a valid shape for a COMPANY account', () => {
        const wrongSubType = { ...base, userType: USER_TYPES.CONSULTANT };
        assert.equal(shapeRegistry.isValid(wrongSubType), false);
    });
});

describe('Okeav fixture — INDIVIDUAL MEMBER with CANDIDATE capability', () => {
    test('universal base scopes plus capability-driven scopes', () => {
        const ctx = { accountType: ACCOUNT_TYPES.INDIVIDUAL, role: USER_ROLES.MEMBER, capabilities: [CAPABILITIES.CANDIDATE] };
        assert.equal(shapeRegistry.isValid(ctx), true);
        assert.equal(hasPermission(ctx, 'account.read', permissionRegistry), true);
        assert.equal(hasPermission(ctx, 'application.create', permissionRegistry), true);
        assert.equal(hasPermission(ctx, 'candidateProfile.read.own', permissionRegistry), true);
        // no team/business scopes leak in
        assert.equal(hasPermission(ctx, 'team.invite', permissionRegistry), false);
    });

    test('an INDIVIDUAL with a non-null userType is not a valid shape', () => {
        const ctx = { accountType: ACCOUNT_TYPES.INDIVIDUAL, role: USER_ROLES.MEMBER, userType: USER_TYPES.RECRUITER };
        assert.equal(shapeRegistry.isValid(ctx), false);
    });
});

describe('Okeav fixture — scope catalogue', () => {
    test('every scope referenced by the permission registry is a known scope', () => {
        const allGrantedScopes = new Set();
        for (const roleMap of Object.values(permissionRegistry.scopesByAccountType)) {
            for (const entry of Object.values(roleMap)) {
                const lists = Array.isArray(entry) ? [entry] : Object.values(entry);
                for (const list of lists) for (const s of list) allGrantedScopes.add(s);
            }
        }
        for (const list of Object.values(permissionRegistry.capabilityScopes)) {
            for (const s of list) allGrantedScopes.add(s);
        }
        for (const scope of allGrantedScopes) {
            if (scope === '*' || scope.includes('*')) continue; // wildcards aren't catalogue entries
            assert.equal(scopeCatalogue.isKnownScope(scope), true, `"${scope}" is not in the scope catalogue — typo?`);
        }
    });
});

describe('Okeav fixture — claims adapter round-trip', () => {
    test('a JWT payload shaped like Okeav auth-service maps cleanly into a PermissionContext', () => {
        const jwtPayload = {
            accountType: ACCOUNT_TYPES.BUSINESS,
            userRole: USER_ROLES.MEMBER,
            userType: USER_TYPES.FINANCE,
            capabilities: [],
        };
        const ctx = fromClaims(jwtPayload, { keys: { role: 'userRole' } });
        assert.equal(hasPermission(ctx, 'billing.read', permissionRegistry), true);
        assert.equal(hasPermission(ctx, 'job.create', permissionRegistry), false);
    });
});
