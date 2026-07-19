import type { Meta, StoryObj } from '@storybook/react';
import type { AuthFlow } from '../api';
import { AuthFlowRow } from '../components/AuthFlowRow';

const base: AuthFlow = {
  id: 'flow-1',
  deploymentId: 'dep-1',
  externalAppId: 'app-1',
  domain: 'portal.acme.com',
  flowType: 'authorization_code_pkce',
  postLoginRedirectUri: 'https://portal.acme.com/dashboard',
  postLogoutRedirectUri: 'https://portal.acme.com/',
  createdAt: '2024-07-01T00:00:00Z',
  updatedAt: '2024-07-01T00:00:00Z',
};

const meta: Meta<typeof AuthFlowRow> = {
  title: 'Components/AuthFlowRow',
  component: AuthFlowRow,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    backgrounds: { default: 'surface' },
  },
};

export default meta;
type Story = StoryObj<typeof AuthFlowRow>;

export const AuthCodePkce: Story = {
  args: { flow: base, appName: 'Company Portal' },
};

export const AuthCode: Story = {
  args: {
    flow: { ...base, flowType: 'authorization_code', domain: 'legacy.acme.com' },
    appName: 'Legacy App',
  },
};

export const ClientCredentials: Story = {
  args: {
    flow: {
      ...base,
      flowType: 'client_credentials',
      domain: 'api.acme.com',
      postLoginRedirectUri: 'https://api.acme.com/',
    },
    appName: 'API Service',
  },
};

export const WithIdpHint: Story = {
  args: {
    flow: { ...base, idpHint: 'google', domain: 'employees.acme.com' },
    appName: 'Employee Portal',
  },
};

export const InList: Story = {
  name: 'Multiple flows in a panel',
  render: () => (
    <div
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '8px',
        overflow: 'hidden',
      }}
    >
      <AuthFlowRow flow={base} appName="Company Portal" />
      <AuthFlowRow
        flow={{ ...base, id: 'flow-2', flowType: 'client_credentials', domain: 'api.acme.com' }}
        appName="API Service"
      />
      <AuthFlowRow
        flow={{ ...base, id: 'flow-3', flowType: 'device_code', domain: 'tv.acme.com' }}
        appName="Smart TV App"
      />
    </div>
  ),
};
