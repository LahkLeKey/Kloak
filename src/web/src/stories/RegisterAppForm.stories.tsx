import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { RegisterAppForm } from '../components/RegisterAppForm';

const meta: Meta<typeof RegisterAppForm> = {
  title: 'Components/RegisterAppForm',
  component: RegisterAppForm,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
  args: {
    onSubmit: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof RegisterAppForm>;

export const Empty: Story = {};

export const WithInitialValues: Story = {
  args: {
    initialValues: {
      name: 'Company Portal',
      description: 'Internal employee portal with SSO',
      allowedOrigins: 'https://portal.acme.com',
      redirectUris: 'https://portal.acme.com/auth/callback',
      scopes: 'openid profile email roles',
    },
  },
};

export const Loading: Story = {
  args: {
    loading: true,
    initialValues: {
      name: 'My App',
      allowedOrigins: 'https://app.example.com',
      redirectUris: 'https://app.example.com/callback',
    },
  },
};

export const WithError: Story = {
  args: {
    error: 'Failed to register application — deployment not found.',
    initialValues: {
      name: 'Bad App',
      allowedOrigins: 'https://app.example.com',
      redirectUris: 'https://app.example.com/callback',
    },
  },
};

export const MultiEnvironment: Story = {
  name: 'Multi-environment redirect URIs',
  args: {
    initialValues: {
      name: 'My App',
      description: 'App deployed to staging and production',
      allowedOrigins: 'https://app.acme.com\nhttps://staging.acme.com',
      redirectUris:
        'https://app.acme.com/auth/callback\nhttps://staging.acme.com/auth/callback\nhttp://localhost:3000/auth/callback',
      scopes: 'openid profile email',
    },
  },
};
