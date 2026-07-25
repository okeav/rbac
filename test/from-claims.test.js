import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { fromClaims } from '../src/claims/from-claims.js';

describe('fromClaims', () => {
    test('maps default claim keys into a PermissionContext', () => {
        const claims = {
            accountType: 'BUSINESS',
            accountSubType: 'COMPANY',
            role: 'ADMIN',
            userType: null,
            capabilities: ['JOB_POSTER'],
        };
        assert.deepEqual(fromClaims(claims), {
            accountType: 'BUSINESS',
            accountSubType: 'COMPANY',
            role: 'ADMIN',
            userType: null,
            capabilities: ['JOB_POSTER'],
        });
    });

    test('defaults accountSubType/userType to null and capabilities to [] when absent', () => {
        assert.deepEqual(fromClaims({ accountType: 'PLATFORM', role: 'PLATFORM_ADMIN' }), {
            accountType: 'PLATFORM',
            accountSubType: null,
            role: 'PLATFORM_ADMIN',
            userType: null,
            capabilities: [],
        });
    });

    test('treats a non-array capabilities claim as empty', () => {
        assert.deepEqual(
            fromClaims({ accountType: 'INDIVIDUAL', role: 'MEMBER', capabilities: 'not-an-array' }).capabilities,
            [],
        );
    });

    test('remaps claim keys — e.g. Okeav auth-service puts role under "userRole"', () => {
        const jwtPayload = {
            accountType: 'BUSINESS',
            userRole: 'MEMBER',
            userType: 'RECRUITER',
            capabilities: [],
        };
        const ctx = fromClaims(jwtPayload, { keys: { role: 'userRole' } });
        assert.equal(ctx.role, 'MEMBER');
        assert.equal(ctx.userType, 'RECRUITER');
    });

    test('handles an empty claims object', () => {
        assert.deepEqual(fromClaims(), {
            accountType: undefined,
            accountSubType: null,
            role: undefined,
            userType: null,
            capabilities: [],
        });
    });
});
