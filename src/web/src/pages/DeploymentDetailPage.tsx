import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { AuthFlow, Deployment, ExternalApp } from '../api';
import { api } from '../api';
import { AppCard } from '../components/AppCard';
import { AuthFlowRow } from '../components/AuthFlowRow';
import { StatusBadge } from '../components/StatusBadge';
import { getAvailableTransitions, getStatusLabel } from '../utils/statusTransitions';
import styles from './DeploymentDetailPage.module.css';

export function DeploymentDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [deployment, setDeployment] = useState<Deployment | null>(null);
  const [apps, setApps] = useState<ExternalApp[]>([]);
  const [flows, setFlows] = useState<AuthFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [statusChanging, setStatusChanging] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([api.getDeployment(id), api.listApps(id), api.listFlows(id)])
      .then(([dep, appList, flowList]) => {
        setDeployment(dep);
        setApps(appList);
        setFlows(flowList);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleActivate(appId: string) {
    // Optimistic update
    setApps(prev => prev.map(a => (a.id === appId ? { ...a, status: 'active' as const } : a)));
    try {
      const updated = await api.updateAppStatus(appId, 'active');
      setApps(prev => prev.map(a => (a.id === appId ? updated : a)));
    } catch (_e) {
      // Revert optimistic update
      setApps(prev => prev.map(a => (a.id === appId ? { ...a, status: 'pending' as const } : a)));
    }
  }

  async function handleSuspend(appId: string) {
    // Optimistic update
    setApps(prev => prev.map(a => (a.id === appId ? { ...a, status: 'suspended' as const } : a)));
    try {
      const updated = await api.updateAppStatus(appId, 'suspended');
      setApps(prev => prev.map(a => (a.id === appId ? updated : a)));
    } catch (_e) {
      // Revert optimistic update
      setApps(prev => prev.map(a => (a.id === appId ? { ...a, status: 'active' as const } : a)));
    }
  }

  async function handleRevoke(appId: string) {
    const previous = apps.find(a => a.id === appId)?.status;

    // Optimistic update
    setApps(prev => prev.map(a => (a.id === appId ? { ...a, status: 'revoked' as const } : a)));
    try {
      const updated = await api.updateAppStatus(appId, 'revoked');
      setApps(prev => prev.map(a => (a.id === appId ? updated : a)));
    } catch (_e) {
      // Revert optimistic update
      if (previous) {
        setApps(prev => prev.map(a => (a.id === appId ? { ...a, status: previous } : a)));
      }
    }
  }

  async function handleDeleteDeployment() {
    if (
      !id ||
      !window.confirm('Are you sure you want to delete this deployment? This cannot be undone.')
    ) {
      return;
    }

    setDeleting(true);
    try {
      await api.deleteDeployment(id);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete deployment');
      setDeleting(false);
    }
  }

  async function handleStatusChange(newStatus: Deployment['status']) {
    if (!id || !deployment) return;

    const message = `Are you sure you want to transition this deployment from ${deployment.status} to ${newStatus}?`;
    if (!window.confirm(message)) {
      setShowStatusMenu(false);
      return;
    }

    setStatusChanging(true);
    setShowStatusMenu(false);
    try {
      const updated = await api.updateDeploymentStatus(id, newStatus);
      setDeployment(updated);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setStatusChanging(false);
    }
  }

  if (loading) return <p className={styles.state}>Loading…</p>;
  if (!deployment) return <p className={styles.stateError}>Deployment not found</p>;

  const appIndex = Object.fromEntries(apps.map(a => [a.id, a.name]));

  return (
    <div data-testid="deployment-detail-page">
      <div className={styles.breadcrumb}>
        <Link to="/">Deployments</Link>
        <span>/</span>
        <span>{deployment.name}</span>
      </div>

      {error && (
        <div className={styles.errorBanner}>
          <p>{error}</p>
          <button onClick={() => setError(null)} className={styles.dismissError} type="button">
            ✕
          </button>
        </div>
      )}

      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>{deployment.name}</h1>
          <p className={styles.customer}>{deployment.customerId}</p>
        </div>
        <div className={styles.headerActions}>
          <StatusBadge status={deployment.status} />
          <div className={styles.statusMenuContainer}>
            <button
              onClick={() => setShowStatusMenu(!showStatusMenu)}
              disabled={statusChanging || getAvailableTransitions(deployment.status).length === 0}
              className={styles.transitionBtn}
              type="button"
            >
              {statusChanging ? 'Updating…' : 'Change status'}
            </button>
            {showStatusMenu && (
              <div className={styles.statusMenu}>
                {getAvailableTransitions(deployment.status).map(status => (
                  <button
                    key={status}
                    onClick={() => handleStatusChange(status)}
                    disabled={statusChanging}
                    className={styles.statusMenuItem}
                    type="button"
                  >
                    {getStatusLabel(status)}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={handleDeleteDeployment}
            disabled={deleting}
            className={styles.deleteBtn}
            type="button"
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>

      {/* External Apps */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionHeaderContent}>
            <h2 className={styles.sectionTitle}>External apps</h2>
            <p className={styles.sectionSub}>
              Applications delegating authentication to this deployment. Each app receives a
              Keycloak client and credentials.
            </p>
          </div>
          <Link
            to={`/deployments/${id}/apps/new`}
            className={styles.addBtn}
            data-testid="add-app-btn"
          >
            + Register app
          </Link>
        </div>

        {apps.length === 0 ? (
          <div className={styles.empty}>
            No external apps registered.{' '}
            <Link to={`/deployments/${id}/apps/new`}>Register the first one →</Link>
          </div>
        ) : (
          <div className={styles.appGrid}>
            {apps.map(app => (
              <AppCard
                key={app.id}
                app={app}
                onActivate={handleActivate}
                onSuspend={handleSuspend}
                onRevoke={handleRevoke}
              />
            ))}
          </div>
        )}
      </section>

      {/* Auth Flows */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Auth flows</h2>
          <p className={styles.sectionSub}>
            Domain-to-app mappings. Each domain initiates auth through the configured flow type.
          </p>
        </div>

        {flows.length === 0 ? (
          <div className={styles.empty}>No auth flows configured.</div>
        ) : (
          <div className={styles.flowPanel}>
            {flows.map(flow => (
              <AuthFlowRow key={flow.id} flow={flow} appName={appIndex[flow.externalAppId]} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
