import { buildScopeCatalogue } from '../../src/scopes/catalogue.js';
import { createPermissionRegistry } from '../../src/permissions/resolve.js';
import { createShapeRegistry } from '../../src/shapes/shape-registry.js';

/**
 * A trimmed but faithful re-creation of Okeav's real rbac-core tables
 * (SCOPES / CAPABILITY_SCOPES / RESOURCE_SCOPES / the 4 valid AccountUser
 * shapes), rebuilt entirely out of config passed into this package. This
 * exists to prove the extraction actually reproduces production behaviour,
 * not just a toy example — every consuming app builds its own version of
 * this file.
 */

export const ACCOUNT_TYPES = Object.freeze({
    PLATFORM: 'PLATFORM',
    BUSINESS: 'BUSINESS',
    INDIVIDUAL: 'INDIVIDUAL',
});

export const ACCOUNT_SUB_TYPES = Object.freeze({
    COMPANY: 'COMPANY',
    AGENCY: 'AGENCY',
});

export const USER_ROLES = Object.freeze({
    PLATFORM_ADMIN: 'PLATFORM_ADMIN',
    ADMIN: 'ADMIN',
    MEMBER: 'MEMBER',
});

export const USER_TYPES = Object.freeze({
    RECRUITER: 'RECRUITER',
    FINANCE: 'FINANCE',
    CONSULTANT: 'CONSULTANT',
    VIEWER: 'VIEWER',
});

export const COMPANY_USER_TYPES = Object.freeze([USER_TYPES.RECRUITER, USER_TYPES.FINANCE, USER_TYPES.VIEWER]);
export const AGENCY_USER_TYPES = Object.freeze([USER_TYPES.CONSULTANT, USER_TYPES.VIEWER]);

export const CAPABILITIES = Object.freeze({
    CANDIDATE: 'CANDIDATE',
    JOB_POSTER: 'JOB_POSTER',
    AGENT: 'AGENT',
});

export const scopeCatalogue = buildScopeCatalogue({
    account: ['read', 'update'],
    team: ['read', 'invite'],
    job: ['create', 'read', 'update', 'publish'],
    application: ['create', 'read.own', 'read.any'],
    candidateProfile: ['read.own', 'update.own'],
    billing: ['read', 'update'],
});

export const permissionRegistry = createPermissionRegistry({
    scopesByAccountType: {
        [ACCOUNT_TYPES.PLATFORM]: {
            [USER_ROLES.PLATFORM_ADMIN]: ['*'],
        },
        [ACCOUNT_TYPES.BUSINESS]: {
            [USER_ROLES.ADMIN]: ['account.*', 'team.*', 'job.*', 'application.*', 'billing.*'],
            [USER_ROLES.MEMBER]: {
                [USER_TYPES.RECRUITER]: ['job.read', 'application.read.any'],
                [USER_TYPES.FINANCE]: ['billing.read', 'billing.update'],
                [USER_TYPES.CONSULTANT]: ['job.read', 'application.read.any'],
                [USER_TYPES.VIEWER]: ['job.read'],
            },
        },
        [ACCOUNT_TYPES.INDIVIDUAL]: {
            [USER_ROLES.MEMBER]: ['account.read', 'account.update'],
        },
    },
    capabilityScopes: {
        [CAPABILITIES.CANDIDATE]: ['application.create', 'application.read.own', 'candidateProfile.read.own', 'candidateProfile.update.own'],
        [CAPABILITIES.JOB_POSTER]: ['job.create', 'job.update', 'job.publish'],
        [CAPABILITIES.AGENT]: ['application.create', 'application.read.any'],
    },
});

function isValidUserTypeForSubType(userType, accountSubType) {
    if (accountSubType === ACCOUNT_SUB_TYPES.COMPANY) return COMPANY_USER_TYPES.includes(userType);
    if (accountSubType === ACCOUNT_SUB_TYPES.AGENCY) return AGENCY_USER_TYPES.includes(userType);
    return false;
}

export const shapeRegistry = createShapeRegistry([
    (ctx) => ctx.accountType === ACCOUNT_TYPES.BUSINESS && ctx.role === USER_ROLES.ADMIN && ctx.userType == null,
    (ctx) => ctx.accountType === ACCOUNT_TYPES.BUSINESS && ctx.role === USER_ROLES.MEMBER
        && isValidUserTypeForSubType(ctx.userType, ctx.accountSubType),
    (ctx) => ctx.accountType === ACCOUNT_TYPES.INDIVIDUAL && ctx.role === USER_ROLES.MEMBER && ctx.userType == null,
    (ctx) => ctx.accountType === ACCOUNT_TYPES.PLATFORM && ctx.role === USER_ROLES.PLATFORM_ADMIN && ctx.userType == null,
]);
