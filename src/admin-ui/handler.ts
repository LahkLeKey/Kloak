import type {IncomingMessage, ServerResponse} from 'node:http';

import type {CoreApi, CreateDeploymentInput, CreateDeploymentVersionInput} from '../core/index.ts';
import type {DeploymentId, DeploymentStatus} from '../shared/index.ts';

export type HttpMethod = 'GET'|'POST'|'PUT'|'DELETE'|'PATCH';

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
    const {method, path, params, body} = req;

    if (method === 'POST' && path === '/deployments') {
      const input = body as CreateDeploymentInput;
      const deployment = await this.core.createDeployment(input);
      return {status: 201, body: deployment};
    }

    if (method === 'GET' && path === '/deployments') {
      const deployments = await this.core.listDeployments();
      return {status: 200, body: deployments};
    }

    if (method === 'GET' && path === '/deployments/:id') {
      const deployment = await this.core.getDeployment(params['id'] as DeploymentId);
      if (deployment === null) {
        return {status: 404, body: {error: 'Deployment not found'}};
      }
      return {status: 200, body: deployment};
    }

    if (method === 'POST' && path === '/deployments/:id/versions') {
      const input = body as Omit<CreateDeploymentVersionInput, 'deploymentId'>;
      const version = await this.core.createDeploymentVersion({
        ...input,
        deploymentId: params['id'] as DeploymentId,
      });
      return {status: 201, body: version};
    }

    if (method === 'PUT' && path === '/deployments/:id/status') {
      const {status: newStatus} = body as {status: DeploymentStatus};
      const deployment =
          await this.core.markDeploymentStatus(params['id'] as DeploymentId, newStatus);
      return {status: 200, body: deployment};
    }

    return {status: 404, body: {error: 'Not found'}};
  }
}

export function matchRoute(
    reqPath: string,
    pattern: string): Record<string, string>|null {
  const patternParts = pattern.split('/');
  const pathParts = reqPath.split('/');
  if (patternParts.length !== pathParts.length) return null;

  const params: Record<string, string> = {};
  for (let i = 0; i < patternParts.length; i++) {
    const seg = patternParts[i];
    if (seg === undefined || pathParts[i] === undefined) return null;
    if (seg.startsWith(':')) {
      params[seg.slice(1)] = pathParts[i]!;
    } else if (seg !== pathParts[i]) {
      return null;
    }
  }
  return params;
}

const ROUTES: Array<{method: HttpMethod; pattern: string}> = [
  {method: 'POST', pattern: '/deployments'},
  {method: 'GET', pattern: '/deployments'},
  {method: 'GET', pattern: '/deployments/:id'},
  {method: 'POST', pattern: '/deployments/:id/versions'},
  {method: 'PUT', pattern: '/deployments/:id/status'},
];

export async function nodeHttpAdapter(
    handler: AdminHandler,
    req: IncomingMessage,
    res: ServerResponse): Promise<void> {
  const rawBody = await readBody(req);
  const body = rawBody.length > 0 ? JSON.parse(rawBody) : null;
  const url = req.url ?? '/';
  const method = (req.method ?? 'GET') as HttpMethod;

  let matched: HttpRequest|null = null;
  for (const route of ROUTES) {
    if (route.method !== method) continue;
    const params = matchRoute(url, route.pattern);
    if (params !== null) {
      matched = {method, path: route.pattern, params, body};
      break;
    }
  }

  const response = matched !== null ?
      await handler.handle(matched) :
      {status: 404, body: {error: 'Not found'}};

  res.writeHead(response.status, {'Content-Type': 'application/json'});
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
