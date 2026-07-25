import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { buildScopeCatalogue } from '../src/scopes/catalogue.js';
import { RbacError } from '../src/errors/rbac-error.js';

describe('buildScopeCatalogue', () => {
    test('flattens a resource:actions map into "resource.action" strings', () => {
        const catalogue = buildScopeCatalogue({
            job: ['create', 'read'],
            application: ['read.own', 'read.any'],
        });
        assert.deepEqual(
            [...catalogue.allScopes].sort(),
            ['application.read.any', 'application.read.own', 'job.create', 'job.read'].sort(),
        );
    });

    test('isKnownScope reflects the catalogue', () => {
        const catalogue = buildScopeCatalogue({ job: ['create', 'read'] });
        assert.equal(catalogue.isKnownScope('job.create'), true);
        assert.equal(catalogue.isKnownScope('job.delete'), false);
        assert.equal(catalogue.isKnownScope(123), false);
        assert.equal(catalogue.isKnownScope(undefined), false);
    });

    test('echoes back the input resourceScopes, frozen', () => {
        const catalogue = buildScopeCatalogue({ job: ['read'] });
        assert.deepEqual(catalogue.resourceScopes, { job: ['read'] });
        assert.throws(() => { catalogue.resourceScopes.job = ['other']; }, TypeError);
    });

    test('handles an empty map', () => {
        const catalogue = buildScopeCatalogue({});
        assert.deepEqual(catalogue.allScopes, []);
        assert.equal(catalogue.isKnownScope('job.read'), false);
    });

    test('throws RbacError on a non-object input', () => {
        assert.throws(() => buildScopeCatalogue(null), RbacError);
        assert.throws(() => buildScopeCatalogue('nope'), RbacError);
    });
});
