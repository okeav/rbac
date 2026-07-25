import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createRequireRole } from '../../src/middleware/express/require-role.middleware.js';
import { RbacError } from '../../src/errors/rbac-error.js';
import { mockReq, mockRes, capturingNext } from '../helpers/mock-express.js';

describe('createRequireRole', () => {
    const requireRole = createRequireRole();

    test('passes when the caller role is in the allow-list', () => {
        const req = mockReq({ role: 'ADMIN' });
        const { next, calls } = capturingNext();
        requireRole('ADMIN', 'PLATFORM_ADMIN')(req, mockRes(), next);
        assert.deepEqual(calls, [undefined]);
    });

    test('reads role from either `role` or `userRole` (Okeav claim shape)', () => {
        const req = mockReq({ userRole: 'ADMIN' });
        const { next, calls } = capturingNext();
        requireRole('ADMIN')(req, mockRes(), next);
        assert.deepEqual(calls, [undefined]);
    });

    test('denies with INSUFFICIENT_ROLE when role is not allowed', () => {
        const req = mockReq({ role: 'MEMBER' });
        const { next, calls } = capturingNext();
        requireRole('ADMIN')(req, mockRes(), next);
        assert.ok(calls[0] instanceof RbacError);
        assert.equal(calls[0].code, 'INSUFFICIENT_ROLE');
    });

    test('denies UNAUTHENTICATED when there is no auth context', () => {
        const req = mockReq(undefined);
        const { next, calls } = capturingNext();
        requireRole('ADMIN')(req, mockRes(), next);
        assert.equal(calls[0].code, 'UNAUTHENTICATED');
    });
});
