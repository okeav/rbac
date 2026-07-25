/**
 * The package's only error type. Thrown by the pure functions/middleware and
 * never shaped into an HTTP response body here — the consumer's own error
 * handling maps `{ code, httpStatus, message }` to whatever envelope their
 * API uses. Mirrors @adaptive-edge/idp-core's IdpError for consistency
 * across the two packages.
 */
export class RbacError extends Error {
    constructor({ code, httpStatus = 500, message, cause } = {}) {
        super(message || code || 'RbacError');
        this.name = 'RbacError';
        this.code = code || 'INTERNAL_ERROR';
        this.httpStatus = httpStatus;
        if (cause !== undefined) this.cause = cause;
        Error.captureStackTrace?.(this, RbacError);
    }
}

export function isRbacError(err) {
    return err instanceof RbacError;
}

// Central catalogue of `RbacError.code` values this package throws. Not
// exhaustive-enforced — a stable reference for consumers writing their own
// error-handling middleware.
export const ERROR_CODES = Object.freeze({
    UNAUTHENTICATED: 'UNAUTHENTICATED',
    INSUFFICIENT_SCOPE: 'INSUFFICIENT_SCOPE',
    INSUFFICIENT_CAPABILITY: 'INSUFFICIENT_CAPABILITY',
    INSUFFICIENT_ROLE: 'INSUFFICIENT_ROLE',
    INVALID_ACCOUNT_TYPE: 'INVALID_ACCOUNT_TYPE',
    INVALID_SHAPE: 'INVALID_SHAPE',
    UNKNOWN_SCOPE: 'UNKNOWN_SCOPE',
});
