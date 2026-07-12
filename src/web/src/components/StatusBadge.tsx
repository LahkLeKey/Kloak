import type { ExternalApp } from '../api';
import styles from './StatusBadge.module.css';

type Status =
  | ExternalApp['status']
  | 'draft'
  | 'provisioning'
  | 'healthy'
  | 'drifted'
  | 'repairing'
  | 'failed'
  | 'decommissioned';

const LABELS: Record<Status, string> = {
  pending: 'Pending',
  active: 'Active',
  suspended: 'Suspended',
  revoked: 'Revoked',
  draft: 'Draft',
  provisioning: 'Provisioning',
  healthy: 'Healthy',
  drifted: 'Drifted',
  repairing: 'Repairing',
  failed: 'Failed',
  decommissioned: 'Decommissioned',
};

interface StatusBadgeProps {
  status: Status;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={`${styles.badge} ${styles[status]}`} data-testid="status-badge">
      {LABELS[status] ?? status}
    </span>
  );
}
