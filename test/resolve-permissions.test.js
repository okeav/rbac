import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createPermissionRegistry, getPermissions } from '../src/permissions/resolve.js';

const registry = createPermissionRegistry({
    scopesByAccountType: {
        PLATFORM: { PLATFORM_ADMIN: ['*'] },
        BUSINESS: {
            ADMIN: ['job.*', 'billing.*'],
            MEMBER: {
                RECRUITER: ['job.read'],
                FINANCE: ['billing.read'],
            },
        },
        INDIVIDUAL: {
            MEMBER: ['account.read'],
        },
    },
    capabilityScopes: {
        JOB_POSTER: ['job.create', 'job.publish'],
        CANDIDATE: ['application.create'],
    },
});

describe('getPermissions', () => {
    test('returns [] when accountType or role is missing', () => {
        assert.deepEqual(getPermissions({}, registry), []);
        assert.deepEqual(getPermissions({ accountType: 'BUSINESS' }, registry), []);
        assert.deepEqual(getPermissions({ role: 'ADMIN' }, registry), []);
    });

    test('returns [] when registry is missing', () => {
        assert.deepEqual(getPermissions({ accountType: 'BUSINESS', role: 'ADMIN' }, undefined), []);
    });

    test('flat role entry (PLATFORM_ADMIN) resolves to its base scopes', () => {
        assert.deepEqual(getPermissions({ accountType: 'PLATFORM', role: 'PLATFORM_ADMIN' }, registry), ['*']);
    });

    test('flat role entry (BUSINESS ADMIN) resolves to its base scopes', () => {
        assert.deepEqual(getPermissions({ accountType: 'BUSINESS', role: 'ADMIN' }, registry), ['job.*', 'billing.*']);
    });

    test('userType-keyed role entry (BUSINESS MEMBER) resolves per userType', () => {
        assert.deepEqual(
            getPermissions({ accountType: 'BUSINESS', role: 'MEMBER', userType: 'RECRUITER' }, registry),
            ['job.read'],
        );
        assert.deepEqual(
            getPermissions({ accountType: 'BUSINESS', role: 'MEMBER', userType: 'FINANCE' }, registry),
            ['billing.read'],
        );
    });

    test('unknown userType against a userType-keyed role yields []', () => {
        assert.deepEqual(
            getPermissions({ accountType: 'BUSINESS', role: 'MEMBER', userType: 'GHOST' }, registry),
            [],
        );
    });

    test('capability scopes layer on top of the base and are de-duplicated', () => {
        const perms = getPermissions(
            { accountType: 'BUSINESS', role: 'MEMBER', userType: 'RECRUITER', capabilities: ['JOB_POSTER'] },
            registry,
        );
        assert.deepEqual([...perms].sort(), ['job.create', 'job.publish', 'job.read'].sort());
    });

    test('multiple capabilities union without duplicates', () => {
        const perms = getPermissions(
            { accountType: 'INDIVIDUAL', role: 'MEMBER', capabilities: ['CANDIDATE', 'CANDIDATE'] },
            registry,
        );
        assert.deepEqual([...perms].sort(), ['account.read', 'application.create'].sort());
    });

    test('unknown accountType/role combination yields []', () => {
        assert.deepEqual(getPermissions({ accountType: 'GHOST', role: 'ADMIN' }, registry), []);
        assert.deepEqual(getPermissions({ accountType: 'PLATFORM', role: 'GHOST' }, registry), []);
    });

    test('capabilities with no matching entries contribute nothing', () => {
        assert.deepEqual(
            getPermissions({ accountType: 'INDIVIDUAL', role: 'MEMBER', capabilities: ['UNKNOWN'] }, registry),
            ['account.read'],
        );
    });
});
