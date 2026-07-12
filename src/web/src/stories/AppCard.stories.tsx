import type { Meta, StoryObj } from '@storybook/react';
import type { ExternalApp } from '../api';
import { AppCard } from '../components/AppCard';

const baseApp: ExternalApp = {
  id: 'app-1',
  deploymentId: 'dep-1',
  name: 'Company Portal',
  description: 'Internal employee portal with SSO',
  allowedOrigins: ['https://portal.acme.com'],
  redirectUris: ['https://portal.acme.com/auth/callback'],
  scopes: ['openid', 'profile', 'email', 'roles'],
  clientId: 'kloak-company-portal-1720000000000',
  status: 'active',
  createdAt: '2024-07-01T00:00:00Z',
  updatedAt: '2024-07-01T00:00:00Z',
};

const meta: Meta<typeof AppCard> = {
  title: 'Components/AppCard',
  component: AppCard,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    onActivate: { action: 'activated' },
    onSuspend: { action: 'suspended' },
    onRevoke: { action: 'revoked' },
  },
};

export default meta;
type Story = StoryObj<typeof AppCard>;

export const Active: Story = {
  args: {
    app: baseApp,
  },
};

export const Pending: Story = {
  args: {
    app: {
      ...baseApp,
      status: 'pending',
      name: 'New SaaS Integration',
      description: 'Awaiting Keycloak client provisioning',
    },
  },
};

export const Suspended: Story = {
  args: {
    app: {
      ...baseApp,
      status: 'suspended',
      name: 'Billing Portal',
      description: 'Temporarily disabled for maintenance',
    },
  },
};

export const Revoked: Story = {
  args: {
    app: {
      ...baseApp,
      status: 'revoked',
      name: 'Legacy App',
      description: 'Credentials have been revoked',
    },
  },
};

export const MultipleRedirects: Story = {
  args: {
    app: {
      ...baseApp,
      name: 'Multi-Environment App',
      description: 'App with staging and production redirect URIs',
      allowedOrigins: ['https://app.acme.com', 'https://staging.acme.com'],
      redirectUris: [
        'https://app.acme.com/auth/callback',
        'https://staging.acme.com/auth/callback',
        'http://localhost:3000/auth/callback',
      ],
    },
  },
};

export const MinimalApp: Story = {
  args: {
    app: {
      ...baseApp,
      description: undefined,
      scopes: ['openid'],
      redirectUris: ['https://api.acme.com/callback'],
      allowedOrigins: ['https://api.acme.com'],
      name: 'API Service',
    },
  },
};
