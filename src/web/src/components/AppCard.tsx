import { useState } from 'react';
import type { ExternalApp } from '../api';
import styles from './AppCard.module.css';
import { StatusBadge } from './StatusBadge';

interface AppCardProps {
  app: ExternalApp;
  onActivate?: (id: string) => Promise<void>;
  onSuspend?: (id: string) => Promise<void>;
  onRevoke?: (id: string) => Promise<void>;
}

export function AppCard({ app, onActivate, onSuspend, onRevoke }: AppCardProps) {
  const [copying, setCopying] = useState(false);
  const [transitioningStatus, setTransitioningStatus] = useState<string | null>(null);

  async function handleCopyClientId() {
    await navigator.clipboard.writeText(app.clientId);
    setCopying(true);
    setTimeout(() => setCopying(false), 2000);
  }

  async function handleStatusChange(
    newStatus: ExternalApp['status'],
    handler?: (id: string) => Promise<void>
  ) {
    if (!handler) return;
    setTransitioningStatus(newStatus);
    try {
      await handler(app.id);
    } finally {
      setTransitioningStatus(null);
    }
  }
  return (
    <div className={styles.card} data-testid="app-card">
      <div className={styles.header}>
        <div className={styles.nameRow}>
          <h3 className={styles.name}>{app.name}</h3>
          <StatusBadge status={app.status} />
        </div>
        {app.description && <p className={styles.description}>{app.description}</p>}
      </div>

      <div className={styles.body}>
        <dl className={styles.meta}>
          <div className={styles.metaRow}>
            <dt>Client ID</dt>
            <dd>
              <div className={styles.clientIdRow}>
                <code className={styles.mono} title={app.clientId}>
                  {app.clientId.length > 32 ? `${app.clientId.substring(0, 24)}…` : app.clientId}
                </code>
                <button
                  type="button"
                  className={styles.copyBtn}
                  onClick={handleCopyClientId}
                  title="Copy to clipboard"
                  data-testid="copy-client-id-btn"
                >
                  {copying ? '✓' : '📋'}
                </button>
              </div>
            </dd>
          </div>
          <div className={styles.metaRow}>
            <dt>Redirect URIs</dt>
            <dd>
              <ul className={styles.uriList}>
                {app.redirectUris.map(uri => (
                  <li key={uri}>
                    <code className={styles.mono}>{uri}</code>
                  </li>
                ))}
              </ul>
            </dd>
          </div>
          <div className={styles.metaRow}>
            <dt>Allowed Origins</dt>
            <dd>
              <ul className={styles.uriList}>
                {app.allowedOrigins.map(origin => (
                  <li key={origin}>
                    <code className={styles.mono}>{origin}</code>
                  </li>
                ))}
              </ul>
            </dd>
          </div>
          <div className={styles.metaRow}>
            <dt>Scopes</dt>
            <dd className={styles.scopes}>
              {app.scopes.map(scope => (
                <span key={scope} className={styles.scopeChip}>
                  {scope}
                </span>
              ))}
            </dd>
          </div>
        </dl>
      </div>

      <div className={styles.actions}>
        {app.status === 'pending' && onActivate && (
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={() => handleStatusChange('active', onActivate)}
            disabled={transitioningStatus === 'active'}
            data-testid="activate-btn"
          >
            {transitioningStatus === 'active' ? 'Activating…' : 'Activate'}
          </button>
        )}
        {app.status === 'active' && onSuspend && (
          <button
            type="button"
            className={styles.btnWarning}
            onClick={() => handleStatusChange('suspended', onSuspend)}
            disabled={transitioningStatus === 'suspended'}
            data-testid="suspend-btn"
          >
            {transitioningStatus === 'suspended' ? 'Suspending…' : 'Suspend'}
          </button>
        )}
        {(app.status === 'active' || app.status === 'suspended') && onRevoke && (
          <button
            type="button"
            className={styles.btnDanger}
            onClick={() => handleStatusChange('revoked', onRevoke)}
            disabled={transitioningStatus === 'revoked'}
            data-testid="revoke-btn"
          >
            {transitioningStatus === 'revoked' ? 'Revoking…' : 'Revoke'}
          </button>
        )}
      </div>
    </div>
  );
}
