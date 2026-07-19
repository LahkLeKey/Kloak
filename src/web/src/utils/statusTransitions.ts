import type { Deployment } from '../api';

type Status = Deployment['status'];

interface StateTransitions {
  readonly [key: string]: readonly Status[];
}

const VALID_TRANSITIONS: StateTransitions = {
  draft: ['provisioning', 'decommissioned'],
  provisioning: ['healthy', 'failed', 'decommissioned'],
  healthy: ['drifted', 'decommissioned'],
  drifted: ['repairing', 'decommissioned'],
  repairing: ['healthy', 'failed', 'decommissioned'],
  failed: ['provisioning', 'decommissioned'],
  decommissioned: [],
};

export function getAvailableTransitions(status: Status): readonly Status[] {
  return VALID_TRANSITIONS[status] ?? [];
}

export function canTransitionTo(from: Status, to: Status): boolean {
  const allowed = getAvailableTransitions(from);
  return allowed.includes(to);
}

export function getStatusLabel(status: Status): string {
  const labels: Record<Status, string> = {
    draft: 'Draft',
    provisioning: 'Provisioning',
    healthy: 'Healthy',
    drifted: 'Drifted',
    repairing: 'Repairing',
    failed: 'Failed',
    decommissioned: 'Decommissioned',
  };
  return labels[status];
}

export function getStatusColor(status: Status): string {
  const colors: Record<Status, string> = {
    draft: '#666',
    provisioning: '#2196f3',
    healthy: '#4caf50',
    drifted: '#ff9800',
    repairing: '#2196f3',
    failed: '#f44336',
    decommissioned: '#999',
  };
  return colors[status];
}
