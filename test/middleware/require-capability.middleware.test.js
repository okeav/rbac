import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createCapabilityMiddleware } from '../../src/middleware/express/require-capability.middleware.js';
import { RbacError } from '../../src/errors/rbac-error.js';
import { mockReq, mockRes, capturingNext } from '../helpers/mock-express.js';

describe('createCapabilityMiddleware', () => {
    const { requireCapability, requireAllCapabilities } = createCapabilityMiddleware();

    test('requireCapability passes when any listed capability is held', () => {
        const req = mockReq({ capabilities: ['CANDIDATE'] });
        const { next, calls } = capturingNext();
        requireCapability('JOB_POSTER', 'CANDIDATE')(req, mockRes(), next);
        assert.deepEqual(calls, [undefined]);
    });

    test('requireCapability denies with INSUFFICIENT_CAPABILITY when none match', () => {
        const req = mockReq({ capabilities: ['CANDIDATE'] });
        const { next, calls } = capturingNext();
        requireCapability('INVESTOR')(req, mockRes(), next);
        assert.ok(calls[0] instanceof RbacError);
        assert.equal(calls[0].code, 'INSUFFICIENT_CAPABILITY');
    });

    test('requireAllCapabilities requires every listed capability', () => {
        const req = mockReq({ capabilities: ['CANDIDATE', 'JOB_POSTER'] });
        const { next, calls } = capturingNext();
        requireAllCapabilities('CANDIDATE', 'JOB_POSTER')(req, mockRes(), next);
        assert.deepEqual(calls, [undefined]);

        const { next: next2, calls: calls2 } = capturingNext();
        requireAllCapabilities('CANDIDATE', 'INVESTOR')(req, mockRes(), next2);
        assert.ok(calls2[0] instanceof RbacError);
    });

    test('denies UNAUTHENTICATED when there is no auth context', () => {
        const req = mockReq(undefined);
        const { next, calls } = capturingNext();
        requireCapability('CANDIDATE')(req, mockRes(), next);
        assert.equal(calls[0].code, 'UNAUTHENTICATED');
    });
});
