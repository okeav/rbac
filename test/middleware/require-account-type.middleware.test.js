import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createRequireAccountType } from '../../src/middleware/express/require-account-type.middleware.js';
import { RbacError } from '../../src/errors/rbac-error.js';
import { mockReq, mockRes, capturingNext } from '../helpers/mock-express.js';

describe('createRequireAccountType', () => {
    const requireAccountType = createRequireAccountType();

    test('passes when accountType is in the allow-list', () => {
        const req = mockReq({ accountType: 'BUSINESS' });
        const { next, calls } = capturingNext();
        requireAccountType('BUSINESS', 'INDIVIDUAL')(req, mockRes(), next);
        assert.deepEqual(calls, [undefined]);
    });

    test('denies with INVALID_ACCOUNT_TYPE when not allowed', () => {
        const req = mockReq({ accountType: 'PLATFORM' });
        const { next, calls } = capturingNext();
        requireAccountType('BUSINESS', 'INDIVIDUAL')(req, mockRes(), next);
        assert.ok(calls[0] instanceof RbacError);
        assert.equal(calls[0].code, 'INVALID_ACCOUNT_TYPE');
    });

    test('denies UNAUTHENTICATED when there is no auth context', () => {
        const req = mockReq(undefined);
        const { next, calls } = capturingNext();
        requireAccountType('BUSINESS')(req, mockRes(), next);
        assert.equal(calls[0].code, 'UNAUTHENTICATED');
    });
});
