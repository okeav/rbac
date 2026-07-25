import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { PermissionContext } from './index.js';

export interface MiddlewareContext {
    accountType?: string;
    role?: string;
    userType?: string | null;
    scopes?: readonly string[];
    capabilities?: readonly string[];
}

export type GetContext = (req: Request) => MiddlewareContext | null;

export type DenyReason = 'unauthenticated' | 'scope' | 'capability' | 'role' | 'accountType';

export type OnDeny = (
    req: Request,
    res: Response,
    next: NextFunction,
    info: { reason: DenyReason; required?: unknown; granted?: unknown },
) => void;

export interface MiddlewareOptions {
    getContext?: GetContext;
    onDeny?: OnDeny;
}

export declare function defaultGetContext(req: Request): MiddlewareContext | null;
export declare function defaultOnDeny(req: Request, res: Response, next: NextFunction, info: { reason: DenyReason; required?: unknown; granted?: unknown }): void;

export declare function createScopeMiddleware(options?: MiddlewareOptions): {
    requireScope: (...requiredScopes: string[]) => RequestHandler;
    requireAllScopes: (...requiredScopes: string[]) => RequestHandler;
};

export declare function createCapabilityMiddleware(options?: MiddlewareOptions): {
    requireCapability: (...requiredCapabilities: string[]) => RequestHandler;
    requireAllCapabilities: (...requiredCapabilities: string[]) => RequestHandler;
};

export declare function createRequireRole(options?: MiddlewareOptions): (...allowedRoles: string[]) => RequestHandler;

export declare function createRequireAccountType(options?: MiddlewareOptions): (...allowedAccountTypes: string[]) => RequestHandler;
