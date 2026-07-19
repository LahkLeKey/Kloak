import type { IncomingMessage, ServerResponse } from 'node:http';

import type {
  CoreApi,
  CreateAuthFlowInput,
  CreateDeploymentInput,
  CreateDeploymentVersionInput,
  RegisterExternalAppInput,
} from '../core/index.ts';
import type {
  AuthFlowId,
  DeploymentId,
  DeploymentStatus,
  ExternalAppId,
  ExternalAppStatus,
  LinkAccountInput,
  LoginInput,
  OAuthAuthorizeInput,
  OAuthCallbackInput,
  SignupInput,
  UserId,
} from '../shared/index.ts';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface HttpRequest {
  readonly method: HttpMethod;
  readonly path: string;
  readonly params: Record<string, string>;
  readonly body: unknown;
}

export interface HttpResponse {
  readonly status: number;
  readonly body: unknown;
}

export class AdminHandler {
  constructor(private readonly core: CoreApi) {}

  async handle(req: HttpRequest): Promise<HttpResponse> {
    const { method, path, params, body } = req;

    if (method === 'POST' && path === '/deployments') {
      const input = body as CreateDeploymentInput;
      const deployment = await this.core.createDeployment(input);
      return { status: 201, body: deployment };
    }

    if (method === 'GET' && path === '/deployments') {
      const deployments = await this.core.listDeployments();
      return { status: 200, body: deployments };
    }

    if (method === 'GET' && path === '/deployments/:id') {
      const deployment = await this.core.getDeployment(params.id as DeploymentId);
      if (deployment === null) {
        return { status: 404, body: { error: 'Deployment not found' } };
      }
      return { status: 200, body: deployment };
    }

    if (method === 'POST' && path === '/deployments/:id/versions') {
      const input = body as Omit<CreateDeploymentVersionInput, 'deploymentId'>;
      const version = await this.core.createDeploymentVersion({
        ...input,
        deploymentId: params.id as DeploymentId,
      });
      return { status: 201, body: version };
    }

    if (method === 'PUT' && path === '/deployments/:id/status') {
      const { status: newStatus } = body as { status: DeploymentStatus };
      const deployment = await this.core.markDeploymentStatus(params.id as DeploymentId, newStatus);
      return { status: 200, body: deployment };
    }

    if (method === 'DELETE' && path === '/deployments/:id') {
      await this.core.deleteDeployment(params.id as DeploymentId);
      return { status: 204, body: null };
    }

    // ── External Apps
    // ─────────────────────────────────────────────────────────

    if (method === 'POST' && path === '/deployments/:id/apps') {
      const input = body as Omit<RegisterExternalAppInput, 'deploymentId'>;
      const app = await this.core.registerExternalApp({
        ...input,
        deploymentId: params.id as DeploymentId,
      });
      return { status: 201, body: app };
    }

    if (method === 'GET' && path === '/deployments/:id/apps') {
      const apps = await this.core.listExternalApps(params.id as DeploymentId);
      return { status: 200, body: apps };
    }

    if (method === 'GET' && path === '/apps/:appId') {
      const app = await this.core.getExternalApp(params.appId as ExternalAppId);
      if (app === null) return { status: 404, body: { error: 'App not found' } };
      return { status: 200, body: app };
    }

    if (method === 'PUT' && path === '/apps/:appId/status') {
      const { status: newStatus } = body as { status: ExternalAppStatus };
      const app = await this.core.updateExternalAppStatus(params.appId as ExternalAppId, newStatus);
      return { status: 200, body: app };
    }

    // ── Auth Flows
    // ─────────────────────────────────────────────────────────────

    if (method === 'POST' && path === '/deployments/:id/flows') {
      const input = body as Omit<CreateAuthFlowInput, 'deploymentId'>;
      const flow = await this.core.createAuthFlow({
        ...input,
        deploymentId: params.id as DeploymentId,
      });
      return { status: 201, body: flow };
    }

    if (method === 'GET' && path === '/deployments/:id/flows') {
      const flows = await this.core.listAuthFlows(params.id as DeploymentId);
      return { status: 200, body: flows };
    }

    if (method === 'GET' && path === '/flows/:flowId') {
      const flow = await this.core.getAuthFlow(params.flowId as AuthFlowId);
      if (flow === null) return { status: 404, body: { error: 'Flow not found' } };
      return { status: 200, body: flow };
    }

    // ── User Authentication
    // ─────────────────────────────────────────────────────────────

    if (method === 'POST' && path === '/auth/signup') {
      const input = body as SignupInput;
      const user = await this.core.signup(input);
      return { status: 201, body: user };
    }

    if (method === 'POST' && path === '/auth/login') {
      const input = body as LoginInput;
      const { user, token } = await this.core.login(input);
      return { status: 200, body: { user, token } };
    }

    if (method === 'GET' && path === '/users/:userId') {
      const user = await this.core.getUser(params.userId as UserId);
      if (user === null) return { status: 404, body: { error: 'User not found' } };
      return { status: 200, body: user };
    }

    if (method === 'GET' && path === '/deployments/:id/users') {
      const users = await this.core.listUsers(params.id as DeploymentId);
      return { status: 200, body: users };
    }

    if (method === 'POST' && path === '/users/:userId/link-account') {
      const input = body as LinkAccountInput;
      const user = await this.core.linkAccount(params.userId as UserId, input);
      return { status: 200, body: user };
    }

    if (method === 'DELETE' && path === '/users/:userId/link-account/:provider') {
      const user = await this.core.unlinkAccount(params.userId as UserId, params.provider);
      return { status: 200, body: user };
    }

    // ── OAuth Flows
    // ─────────────────────────────────────────────────────────────

    if (method === 'POST' && path === '/oauth/authorize/:provider') {
      const input = body as Omit<OAuthAuthorizeInput, 'provider'>;
      const authUrl = await this.core.getOAuthAuthorizationUrl({
        ...input,
        provider: params.provider as 'github' | 'gmail',
      });
      return { status: 200, body: { authUrl } };
    }

    if (method === 'POST' && path === '/oauth/callback/:provider') {
      const input = body as Omit<OAuthCallbackInput, 'provider'>;
      const { user, token } = await this.core.handleOAuthCallback({
        ...input,
        provider: params.provider as 'github' | 'gmail',
      });
      return { status: 200, body: { user, token } };
    }

    return { status: 404, body: { error: 'Not found' } };
  }
}

export function matchRoute(reqPath: string, pattern: string): Record<string, string> | null {
  const patternParts = pattern.split('/');
  const pathParts = reqPath.split('/');
  if (patternParts.length !== pathParts.length) return null;

  const params: Record<string, string> = {};
  for (let i = 0; i < patternParts.length; i++) {
    const seg = patternParts[i];
    const pathPart = pathParts[i];
    if (seg === undefined || pathPart === undefined) return null;
    if (seg.startsWith(':')) {
      params[seg.slice(1)] = pathPart;
    } else if (seg !== pathParts[i]) {
      return null;
    }
  }
  return params;
}

const ROUTES: Array<{ method: HttpMethod; pattern: string }> = [
  { method: 'POST', pattern: '/deployments' },
  { method: 'GET', pattern: '/deployments' },
  { method: 'GET', pattern: '/deployments/:id' },
  { method: 'POST', pattern: '/deployments/:id/versions' },
  { method: 'PUT', pattern: '/deployments/:id/status' },
  { method: 'POST', pattern: '/deployments/:id/apps' },
  { method: 'GET', pattern: '/deployments/:id/apps' },
  { method: 'GET', pattern: '/apps/:appId' },
  { method: 'PUT', pattern: '/apps/:appId/status' },
  { method: 'POST', pattern: '/deployments/:id/flows' },
  { method: 'GET', pattern: '/deployments/:id/flows' },
  { method: 'GET', pattern: '/flows/:flowId' },
  { method: 'POST', pattern: '/auth/signup' },
  { method: 'POST', pattern: '/auth/login' },
  { method: 'GET', pattern: '/users/:userId' },
  { method: 'GET', pattern: '/deployments/:id/users' },
  { method: 'POST', pattern: '/users/:userId/link-account' },
  { method: 'DELETE', pattern: '/users/:userId/link-account/:provider' },
  { method: 'POST', pattern: '/oauth/authorize/:provider' },
  { method: 'POST', pattern: '/oauth/callback/:provider' },
];

export async function nodeHttpAdapter(
  handler: AdminHandler,
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  const rawBody = await readBody(req);
  const body = rawBody.length > 0 ? JSON.parse(rawBody) : null;
  const url = req.url ?? '/';
  const method = (req.method ?? 'GET') as HttpMethod;

  let matched: HttpRequest | null = null;
  for (const route of ROUTES) {
    if (route.method !== method) continue;
    const params = matchRoute(url, route.pattern);
    if (params !== null) {
      matched = { method, path: route.pattern, params, body };
      break;
    }
  }

  const response =
    matched !== null
      ? await handler.handle(matched)
      : { status: 404, body: { error: 'Not found' } };

  res.writeHead(response.status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(response.body));
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString()));
    req.on('error', reject);
  });
}
