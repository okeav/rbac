import { RbacError, ERROR_CODES } from '../errors/rbac-error.js';

/**
 * A "shape" is a predicate describing one legal combination of
 * (accountType, role, userType[, accountSubType]) in your account model.
 * This package has no opinion on what those combinations are — you register
 * your own. Example (Okeav's four legal shapes):
 *
 *   const registry = createShapeRegistry([
 *     (ctx) => ctx.accountType === 'BUSINESS' && ctx.role === 'ADMIN' && ctx.userType == null,
 *     (ctx) => ctx.accountType === 'BUSINESS' && ctx.role === 'MEMBER'
 *              && isValidUserTypeForSubType(ctx.userType, ctx.accountSubType),
 *     (ctx) => ctx.accountType === 'INDIVIDUAL' && ctx.role === 'MEMBER' && ctx.userType == null,
 *     (ctx) => ctx.accountType === 'PLATFORM' && ctx.role === 'PLATFORM_ADMIN' && ctx.userType == null,
 *   ]);
 *
 *   registry.isValid(ctx);          // boolean
 *   registry.assertValid(ctx);      // throws RbacError(code: INVALID_SHAPE) if none match
 *
 * Each predicate receives the full ctx object, so shapes that depend on
 * fields beyond the four core axes (e.g. accountSubType-scoped userType
 * lists) are expressed by the predicate itself — this package never needs
 * to know what those extra fields mean.
 */
export function createShapeRegistry(shapes = []) {
    if (!Array.isArray(shapes) || shapes.some((s) => typeof s !== 'function')) {
        throw new RbacError({
            code: ERROR_CODES.INVALID_SHAPE,
            httpStatus: 500,
            message: 'createShapeRegistry expects an array of predicate functions.',
        });
    }

    function isValid(ctx = {}) {
        return shapes.some((predicate) => {
            try {
                return Boolean(predicate(ctx));
            } catch {
                return false;
            }
        });
    }

    function assertValid(ctx = {}, { message } = {}) {
        if (!isValid(ctx)) {
            throw new RbacError({
                code: ERROR_CODES.INVALID_SHAPE,
                httpStatus: 500,
                message: message || 'This (accountType, role, userType) combination is not a registered valid shape.',
            });
        }
    }

    return Object.freeze({ isValid, assertValid });
}
