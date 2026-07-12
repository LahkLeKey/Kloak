import {request as httpsRequest} from 'node:https';
import {request as httpRequest} from 'node:http';
import type {Deployment, KeycloakDesiredState} from '../shared/index.ts';
import type {KeycloakClient, KeycloakLiveState} from '../sync/index.ts';

export interface KeycloakConfig {
  readonly baseUrl: string; // e.g., https://keycloak.example.com
  readonly realmAdminUser: string;
  readonly realmAdminPassword: string;
  readonly clientId: string; // e.g., 'admin-cli'
  readonly clientSecret: string;
}

interface AccessToken {
  readonly access_token: string;
  readonly expires_in: number;
  readonly refresh_expires_in: number;
  readonly refresh_token: string;
  readonly token_type: string;
}

export class HttpKeycloakClient implements KeycloakClient {
  private config: KeycloakConfig;
  private cachedToken?: {token: string; expiresAt: number};

  constructor(config: KeycloakConfig) {
    this.config = config;
  }

  private async fetch(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<unknown> {
    const token = await this.getAccessToken();
    const url = new URL(path, this.config.baseUrl);
    const isHttps = this.config.baseUrl.startsWith('https');
    const request = isHttps ? httpsRequest : httpRequest;

    return new Promise((resolve, reject) => {
      const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      };

      const req = request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (res.statusCode && res.statusCode >= 400) {
              reject(new Error(
                `Keycloak API error ${res.statusCode}: ${JSON.stringify(parsed)}`,
              ));
            } else {
              resolve(parsed);
            }
          } catch (e) {
            reject(new Error(`Failed to parse Keycloak response: ${data}`));
          }
        });
      });

      req.on('error', reject);
      if (body) {
        req.write(JSON.stringify(body));
      }
      req.end();
    });
  }

  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (this.cachedToken && this.cachedToken.expiresAt > Date.now()) {
      return this.cachedToken.token;
    }

    // Request new token
    const tokenUrl = `/realms/master/protocol/openid-connect/token`;
    const params = new URLSearchParams({
      'grant_type': 'client_credentials',
      'client_id': this.config.clientId,
      'client_secret': this.config.clientSecret,
      'username': this.config.realmAdminUser,
      'password': this.config.realmAdminPassword,
    });

    const url = new URL(tokenUrl, this.config.baseUrl);
    const isHttps = this.config.baseUrl.startsWith('https');
    const request = isHttps ? httpsRequest : httpRequest;

    return new Promise((resolve, reject) => {
      const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search + '?' + params.toString(),
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      };

      const req = request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            const token = JSON.parse(data) as AccessToken;
            this.cachedToken = {
              token: token.access_token,
              expiresAt: Date.now() + (token.expires_in * 1000),
            };
            resolve(token.access_token);
          } catch (e) {
            reject(new Error(`Failed to parse token response: ${data}`));
          }
        });
      });

      req.on('error', reject);
      req.end();
    });
  }

  async readLiveState(deployment: Deployment): Promise<KeycloakLiveState> {
    const realmName = `customer-${deployment.customerId}`;

    try {
      const realm = await this.fetch('GET', `/admin/realms/${realmName}`) as {
        realm?: string;
        enabled?: boolean;
      };

      if (!realm.enabled) {
        return {
          realmName,
          clients: [],
          roles: [],
          groups: [],
          userCount: 0,
        };
      }

      // Fetch clients
      const clients = (await this.fetch(
        'GET',
        `/admin/realms/${realmName}/clients`,
      ) as {clientId?: string}[]) || [];

      // Fetch realm roles
      const roles = (await this.fetch(
        'GET',
        `/admin/realms/${realmName}/roles`,
      ) as {name?: string}[]) || [];

      // Fetch groups
      const groups = (await this.fetch(
        'GET',
        `/admin/realms/${realmName}/groups`,
      ) as {name?: string}[]) || [];

      // Fetch user count (returns a number)
      const userCountResponse = await this.fetch(
        'GET',
        `/admin/realms/${realmName}/users/count`,
      );
      const userCount = typeof userCountResponse === 'number'
        ? userCountResponse
        : (typeof userCountResponse === 'string' ? parseInt(userCountResponse, 10) : 0);

      return {
        realmName,
        clients: clients.map((c) => c.clientId || '').filter(Boolean),
        roles: roles.map((r) => r.name || '').filter(Boolean),
        groups: groups.map((g) => g.name || '').filter(Boolean),
        userCount,
      };
    } catch (error) {
      // If realm doesn't exist, return empty state
      if (error instanceof Error && error.message.includes('404')) {
        return {
          realmName,
          clients: [],
          roles: [],
          groups: [],
          userCount: 0,
        };
      }
      throw error;
    }
  }

  async applyDesiredState(
    deployment: Deployment,
    desiredState: KeycloakDesiredState,
  ): Promise<void> {
    const realmName = `customer-${deployment.customerId}`;

    // Create realm if it doesn't exist
    try {
      await this.fetch('POST', `/admin/realms`, {
        realm: realmName,
        enabled: true,
        displayName: `${deployment.name} Realm`,
      });
      console.log(`Created realm: ${realmName}`);
    } catch (error) {
      // Realm might already exist, continue
      if (!(error instanceof Error && error.message.includes('409'))) {
        throw error;
      }
    }

    // Create clients
    for (const clientDef of desiredState.clients || []) {
      try {
        await this.fetch('POST', `/admin/realms/${realmName}/clients`, {
          clientId: clientDef,
          enabled: true,
          publicClient: false,
          standardFlowEnabled: true,
          directAccessGrantsEnabled: true,
        });
        console.log(`Created client: ${clientDef}`);
      } catch (error) {
        if (!(error instanceof Error && error.message.includes('409'))) {
          throw error;
        }
      }
    }

    // Create roles
    for (const roleName of desiredState.roles || []) {
      try {
        await this.fetch('POST', `/admin/realms/${realmName}/roles`, {
          name: roleName,
          description: `Role: ${roleName}`,
        });
        console.log(`Created role: ${roleName}`);
      } catch (error) {
        if (!(error instanceof Error && error.message.includes('409'))) {
          throw error;
        }
      }
    }
  }

  async verifyLiveState(
    deployment: Deployment,
    desiredState: KeycloakDesiredState,
  ): Promise<void> {
    const liveState = await this.readLiveState(deployment);

    const desiredClients = new Set(desiredState.clients || []);
    const desiredRoles = new Set(desiredState.roles || []);

    const missingClients = [...desiredClients].filter(
      (c) => !liveState.clients.includes(c),
    );
    const missingRoles = [...desiredRoles].filter(
      (r) => !liveState.roles.includes(r),
    );

    if (missingClients.length > 0 || missingRoles.length > 0) {
      throw new Error(
        `Verification failed: missing clients=${missingClients.join(',')}, ` +
        `missing roles=${missingRoles.join(',')}`,
      );
    }
  }
}
