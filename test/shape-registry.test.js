import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createShapeRegistry } from '../src/shapes/shape-registry.js';
import { RbacError } from '../src/errors/rbac-error.js';

describe('createShapeRegistry', () => {
    test('throws on non-array or non-function input', () => {
        assert.throws(() => createShapeRegistry('nope'), RbacError);
        assert.throws(() => createShapeRegistry([1, 2]), RbacError);
    });

    test('empty registry treats every ctx as invalid', () => {
        const registry = createShapeRegistry([]);
        assert.equal(registry.isValid({ accountType: 'ANYTHING' }), false);
    });

    test('isValid returns true when any predicate matches', () => {
        const registry = createShapeRegistry([
            (ctx) => ctx.accountType === 'PLATFORM' && ctx.role === 'PLATFORM_ADMIN',
            (ctx) => ctx.accountType === 'INDIVIDUAL' && ctx.role === 'MEMBER',
        ]);
        assert.equal(registry.isValid({ accountType: 'PLATFORM', role: 'PLATFORM_ADMIN' }), true);
        assert.equal(registry.isValid({ accountType: 'INDIVIDUAL', role: 'MEMBER' }), true);
        assert.equal(registry.isValid({ accountType: 'BUSINESS', role: 'ADMIN' }), false);
    });

    test('a predicate throwing is treated as a non-match, not a registry failure', () => {
        const registry = createShapeRegistry([
            (ctx) => ctx.nested.field === 'x', // throws on ctx.nested being undefined
            (ctx) => ctx.accountType === 'PLATFORM',
        ]);
        assert.equal(registry.isValid({ accountType: 'PLATFORM' }), true);
        assert.equal(registry.isValid({ accountType: 'BUSINESS' }), false);
    });

    test('assertValid passes silently for a valid shape', () => {
        const registry = createShapeRegistry([(ctx) => ctx.accountType === 'PLATFORM']);
        assert.doesNotThrow(() => registry.assertValid({ accountType: 'PLATFORM' }));
    });

    test('assertValid throws RbacError(INVALID_SHAPE) for an invalid shape', () => {
        const registry = createShapeRegistry([(ctx) => ctx.accountType === 'PLATFORM']);
        assert.throws(() => registry.assertValid({ accountType: 'BUSINESS' }), (err) => {
            assert.ok(err instanceof RbacError);
            assert.equal(err.code, 'INVALID_SHAPE');
            return true;
        });
    });

    test('assertValid honours a custom message', () => {
        const registry = createShapeRegistry([(ctx) => ctx.accountType === 'PLATFORM']);
        assert.throws(
            () => registry.assertValid({ accountType: 'BUSINESS' }, { message: 'custom message' }),
            /custom message/,
        );
    });

    test('a realistic accountSubType-dependent shape', () => {
        const registry = createShapeRegistry([
            (ctx) => ctx.accountType === 'BUSINESS' && ctx.role === 'MEMBER'
                && ((ctx.accountSubType === 'COMPANY' && ['RECRUITER', 'FINANCE'].includes(ctx.userType))
                    || (ctx.accountSubType === 'AGENCY' && ['CONSULTANT'].includes(ctx.userType))),
        ]);
        assert.equal(registry.isValid({ accountType: 'BUSINESS', role: 'MEMBER', accountSubType: 'COMPANY', userType: 'RECRUITER' }), true);
        assert.equal(registry.isValid({ accountType: 'BUSINESS', role: 'MEMBER', accountSubType: 'AGENCY', userType: 'RECRUITER' }), false);
        assert.equal(registry.isValid({ accountType: 'BUSINESS', role: 'MEMBER', accountSubType: 'AGENCY', userType: 'CONSULTANT' }), true);
    });
});
