/**
 * Minimal Express-shaped mocks for middleware tests — this package has no
 * runtime dependency on Express itself (it's a peer dep), so tests exercise
 * the middleware functions directly against plain objects rather than
 * spinning up a real app/supertest.
 */
export function mockReq(auth) {
    return { auth };
}

export function mockRes() {
    return {};
}

/** Captures whatever `next` was called with (undefined = called with no args = "allowed"). */
export function capturingNext() {
    const calls = [];
    const next = (err) => calls.push(err);
    return { next, calls };
}
