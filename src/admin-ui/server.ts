import type {Server} from 'node:http';
import {createServer} from 'node:http';

import {CoreService, InMemoryDeploymentRepository} from '../core/index.ts';
import {runMigrations, SqlDeploymentRepository} from '../database/index.ts';

import type {HttpMethod, HttpRequest, HttpResponse} from './handler.ts';
import {AdminHandler} from './handler.ts';

export interface ServerConfig {
  readonly port: number;
  readonly host?: string;
}

function matchRoute(path: string, pattern: string): Record<string, string>|
    null {
  const patternSegments = pattern.split('/');
  const pathSegments = path.split('/');
  if (patternSegments.length !== pathSegments.length) return null;

  const params: Record<string, string> = {};
  for (let i = 0; i < patternSegments.length; i++) {
    const patternSeg = patternSegments[i];
    if (patternSeg.startsWith(':')) {
      params[patternSeg.slice(1)] = pathSegments[i];
    } else if (patternSeg !== pathSegments[i]) {
      return null;
    }
  }
  return params;
}

function findRoutePattern(path: string): string|null {
  const patterns = [
    '/deployments/:id/versions',
    '/deployments/:id/status',
    '/deployments/:id',
    '/deployments',
  ];

  for (const pattern of patterns) {
    if (matchRoute(path, pattern)) {
      return pattern;
    }
  }
  return null;
}

async function readBody(req: NodeJS.ReadableStream): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk.toString();
    });
    req.on('end', () => {
      if (!data) {
        resolve(undefined);
        return;
      }
      try {
        resolve(JSON.parse(data));
      } catch (e) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

export async function startServer(config: ServerConfig): Promise<Server> {
  // Initialize repository (PostgreSQL if DATABASE_URL is set, otherwise
  // in-memory)
  let repository;
  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl) {
    console.log('Initializing PostgreSQL repository...');
    await runMigrations(databaseUrl);
    repository = new SqlDeploymentRepository({connectionString: databaseUrl});
    console.log('✓ PostgreSQL repository initialized');
  } else {
    console.log(
        'Using in-memory repository (set DATABASE_URL to use PostgreSQL)');
    repository = new InMemoryDeploymentRepository();
  }

  const core = new CoreService(repository);
  const handler = new AdminHandler(core);

  const server = createServer(async (req, res) => {
    try {
      const method = (req.method || 'GET') as HttpMethod;
      const pathname =
          new URL(req.url || '/', `http://${req.headers.host}`).pathname;

      const routePattern = findRoutePattern(pathname);
      if (!routePattern) {
        res.writeHead(404, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({error: 'Not found'}));
        return;
      }

      const params = matchRoute(pathname, routePattern);
      const body = method === 'GET' ? undefined : await readBody(req);

      const httpRequest: HttpRequest = {
        method,
        path: routePattern,
        params: params || {},
        body,
      };

      const httpResponse = await handler.handle(httpRequest);

      const headers:
          Record<string, string> = {'Content-Type': 'application/json'};
      res.writeHead(httpResponse.status, headers);
      res.end(JSON.stringify(httpResponse.body));
    } catch (error) {
      console.error('Handler error:', error);
      res.writeHead(500, {'Content-Type': 'application/json'});
      res.end(JSON.stringify({error: 'Internal server error'}));
    }
  });

  return new Promise((resolve, reject) => {
    const host = config.host || 'localhost';
    server.listen(config.port, host, () => {
      console.log(`Server listening on http://${host}:${config.port}`);
      resolve(server);
    });
    server.on('error', reject);
  });
}
