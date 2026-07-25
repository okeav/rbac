import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createPermissionRegistry } from '../src/permissions/resolve.js';
import {
    hasPermission,
    hasAllPermissions,
    hasAnyPermission,
    hasCapability,
    hasAllCapabilities,
    hasAnyCapability,
} from '../src/permissions/check.js';

const registry = createPermissionRegistry({
    scopesByAccountType: {
        BUSINESS: { ADMIN: ['job.*'] },
    },
    capabilityScopes: {},
});
const admin = { accountType: 'BUSINESS', role: 'ADMIN' };

describe('permission check helpers', () => {
    test('hasPermission is wildcard-aware via matchScope', () => {
        assert.equal(hasPermission(admin, 'job.read', registry), true);
        assert.equal(hasPermission(admin, 'billing.read', registry), false);
    });

    test('hasAllPermissions requires every scope to match', () => {
        assert.equal(hasAllPermissions(admin, ['job.read', 'job.publish'], registry), true);
        assert.equal(hasAllPermissions(admin, ['job.read', 'billing.read'], registry), false);
    });

    test('hasAnyPermission requires at least one match', () => {
        assert.equal(hasAnyPermission(admin, ['billing.read', 'job.read'], registry), true);
        assert.equal(hasAnyPermission(admin, ['billing.read', 'invoice.read'], registry), false);
    });
});

describe('capability check helpers', () => {
    const caps = ['CANDIDATE', 'JOB_POSTER'];

    test('hasCapability', () => {
        assert.equal(hasCapability(caps, 'CANDIDATE'), true);
        assert.equal(hasCapability(caps, 'INVESTOR'), false);
        assert.equal(hasCapability(undefined, 'CANDIDATE'), false);
    });

    test('hasAllCapabilities', () => {
        assert.equal(hasAllCapabilities(caps, ['CANDIDATE', 'JOB_POSTER']), true);
        assert.equal(hasAllCapabilities(caps, ['CANDIDATE', 'INVESTOR']), false);
        assert.equal(hasAllCapabilities(caps, []), true);
    });

    test('hasAnyCapability', () => {
        assert.equal(hasAnyCapability(caps, ['INVESTOR', 'JOB_POSTER']), true);
        assert.equal(hasAnyCapability(caps, ['INVESTOR', 'NETWORKER']), false);
        assert.equal(hasAnyCapability(caps, []), false);
    });
});
