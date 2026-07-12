import type { ExternalApp } from '../api';
import styles from './AppCard.module.css';
import { StatusBadge } from './StatusBadge';

interface AppCardProps {
  app: ExternalApp;
  onActivate?: (id: string) => void;
  onSuspend?: (id: string) => void;
  onRevoke?: (id: string) => void;
}

export function AppCard({ app, onActivate, onSuspend, onRevoke }: AppCardProps) {
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
              <code className={styles.mono}>{app.clientId}</code>
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
            onClick={() => onActivate(app.id)}
            data-testid="activate-btn"
          >
            Activate
          </button>
        )}
        {app.status === 'active' && onSuspend && (
          <button
            type="button"
            className={styles.btnWarning}
            onClick={() => onSuspend(app.id)}
            data-testid="suspend-btn"
          >
            Suspend
          </button>
        )}
        {(app.status === 'active' || app.status === 'suspended') && onRevoke && (
          <button
            type="button"
            className={styles.btnDanger}
            onClick={() => onRevoke(app.id)}
            data-testid="revoke-btn"
          >
            Revoke
          </button>
        )}
      </div>
    </div>
  );
}
