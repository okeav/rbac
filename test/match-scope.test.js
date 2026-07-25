import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { matchScope } from '../src/scopes/match-scope.js';

describe('matchScope', () => {
    test('returns false for missing inputs', () => {
        assert.equal(matchScope(undefined, 'job.read'), false);
        assert.equal(matchScope(['job.read'], ''), false);
        assert.equal(matchScope(['job.read'], undefined), false);
    });

    test('exact match', () => {
        assert.equal(matchScope(['job.read'], 'job.read'), true);
        assert.equal(matchScope(['job.read'], 'job.update'), false);
    });

    test('global wildcard "*" matches everything', () => {
        assert.equal(matchScope(['*'], 'job.read'), true);
        assert.equal(matchScope(['*'], 'anything.at.all'), true);
    });

    test('"resource.*" matches every action on that resource', () => {
        assert.equal(matchScope(['job.*'], 'job.read'), true);
        assert.equal(matchScope(['job.*'], 'job.publish'), true);
        assert.equal(matchScope(['job.*'], 'application.read'), false);
    });

    test('"resource.action.*" matches qualified scopes for that action', () => {
        assert.equal(matchScope(['application.read.*'], 'application.read.own'), true);
        assert.equal(matchScope(['application.read.*'], 'application.read.any'), true);
        assert.equal(matchScope(['application.read.*'], 'application.update.own'), false);
    });

    test('"*.action" matches the 2-segment action across every resource but not a qualified form', () => {
        assert.equal(matchScope(['*.read'], 'job.read'), true);
        assert.equal(matchScope(['*.read'], 'application.read'), true);
        assert.equal(matchScope(['*.read'], 'application.read.own'), false);
    });

    test('"*.action.*" matches the action with any qualifier across every resource', () => {
        assert.equal(matchScope(['*.read.*'], 'application.read.own'), true);
        assert.equal(matchScope(['*.read.*'], 'candidateProfile.read.own'), true);
        assert.equal(matchScope(['*.read.*'], 'application.update.own'), false);
    });

    test('unrelated grants do not leak into other resources', () => {
        assert.equal(matchScope(['billing.*'], 'job.read'), false);
    });
});
