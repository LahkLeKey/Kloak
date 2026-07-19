import type { Meta, StoryObj } from '@storybook/react';
import { StatusBadge } from '../components/StatusBadge';

const meta: Meta<typeof StatusBadge> = {
  title: 'Components/StatusBadge',
  component: StatusBadge,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof StatusBadge>;

export const Active: Story = { args: { status: 'active' } };
export const Pending: Story = { args: { status: 'pending' } };
export const Suspended: Story = { args: { status: 'suspended' } };
export const Revoked: Story = { args: { status: 'revoked' } };
export const Healthy: Story = { args: { status: 'healthy' } };
export const Drifted: Story = { args: { status: 'drifted' } };
export const Provisioning: Story = { args: { status: 'provisioning' } };
export const Repairing: Story = { args: { status: 'repairing' } };
export const Failed: Story = { args: { status: 'failed' } };
export const Draft: Story = { args: { status: 'draft' } };
export const Decommissioned: Story = { args: { status: 'decommissioned' } };

export const AllStatuses: Story = {
  name: 'All statuses',
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '16px' }}>
      {(
        [
          'active',
          'pending',
          'suspended',
          'revoked',
          'healthy',
          'drifted',
          'provisioning',
          'repairing',
          'failed',
          'draft',
          'decommissioned',
        ] as const
      ).map(s => (
        <StatusBadge key={s} status={s} />
      ))}
    </div>
  ),
};
