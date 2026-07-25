import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createScopeMiddleware } from '../../src/middleware/express/require-scope.middleware.js';
import { RbacError } from '../../src/errors/rbac-error.js';
import { mockReq, mockRes, capturingNext } from '../helpers/mock-express.js';

describe('createScopeMiddleware', () => {
    const { requireScope, requireAllScopes } = createScopeMiddleware();

    test('requireScope calls next() with no error when a required scope is granted (wildcard-aware)', () => {
        const req = mockReq({ scopes: ['job.*'] });
        const { next, calls } = capturingNext();
        requireScope('job.read')(req, mockRes(), next);
        assert.deepEqual(calls, [undefined]);
    });

    test('requireScope denies with RbacError(INSUFFICIENT_SCOPE) when none of the scopes match', () => {
        const req = mockReq({ scopes: ['billing.read'] });
        const { next, calls } = capturingNext();
        requireScope('job.read', 'job.update')(req, mockRes(), next);
        assert.equal(calls.length, 1);
        assert.ok(calls[0] instanceof RbacError);
        assert.equal(calls[0].code, 'INSUFFICIENT_SCOPE');
        assert.equal(calls[0].httpStatus, 403);
    });

    test('requireScope is an OR across multiple required scopes', () => {
        const req = mockReq({ scopes: ['job.update'] });
        const { next, calls } = capturingNext();
        requireScope('job.read', 'job.update')(req, mockRes(), next);
        assert.deepEqual(calls, [undefined]);
    });

    test('requireAllScopes requires every scope to match', () => {
        const req = mockReq({ scopes: ['job.read'] });
        const { next, calls } = capturingNext();
        requireAllScopes('job.read', 'job.update')(req, mockRes(), next);
        assert.equal(calls.length, 1);
        assert.ok(calls[0] instanceof RbacError);
    });

    test('requireAllScopes passes when every scope matches', () => {
        const req = mockReq({ scopes: ['job.*'] });
        const { next, calls } = capturingNext();
        requireAllScopes('job.read', 'job.update')(req, mockRes(), next);
        assert.deepEqual(calls, [undefined]);
    });

    test('denies with UNAUTHENTICATED when there is no auth context at all', () => {
        const req = mockReq(undefined);
        const { next, calls } = capturingNext();
        requireScope('job.read')(req, mockRes(), next);
        assert.equal(calls[0].code, 'UNAUTHENTICATED');
        assert.equal(calls[0].httpStatus, 401);
    });

    test('an authenticated user with zero scopes is denied INSUFFICIENT_SCOPE, not UNAUTHENTICATED', () => {
        const req = mockReq({ scopes: [] });
        const { next, calls } = capturingNext();
        requireScope('job.read')(req, mockRes(), next);
        assert.equal(calls[0].code, 'INSUFFICIENT_SCOPE');
    });

    test('custom getContext and onDeny are honoured', () => {
        let denyInfo = null;
        const { requireScope: customRequireScope } = createScopeMiddleware({
            getContext: (req) => (req.myAuth ? { scopes: req.myAuth.grants } : null),
            onDeny: (req, res, next, info) => { denyInfo = info; next(new Error('custom-denied')); },
        });
        const req = { myAuth: { grants: ['billing.read'] } };
        const { next, calls } = capturingNext();
        customRequireScope('job.read')(req, mockRes(), next);
        assert.equal(calls[0].message, 'custom-denied');
        assert.equal(denyInfo.reason, 'scope');
        assert.deepEqual(denyInfo.required, ['job.read']);
        assert.deepEqual(denyInfo.granted, ['billing.read']);
    });
});
