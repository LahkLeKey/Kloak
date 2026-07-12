import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { AuthFlow, Deployment, ExternalApp } from '../api';
import { api } from '../api';
import { AppCard } from '../components/AppCard';
import { AuthFlowRow } from '../components/AuthFlowRow';
import { StatusBadge } from '../components/StatusBadge';
import styles from './DeploymentDetailPage.module.css';

export function DeploymentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [deployment, setDeployment] = useState<Deployment | null>(null);
  const [apps, setApps] = useState<ExternalApp[]>([]);
  const [flows, setFlows] = useState<AuthFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    const updated = await api.updateAppStatus(appId, 'active');
    setApps(prev => prev.map(a => (a.id === appId ? updated : a)));
  }

  async function handleSuspend(appId: string) {
    const updated = await api.updateAppStatus(appId, 'suspended');
    setApps(prev => prev.map(a => (a.id === appId ? updated : a)));
  }

  async function handleRevoke(appId: string) {
    const updated = await api.updateAppStatus(appId, 'revoked');
    setApps(prev => prev.map(a => (a.id === appId ? updated : a)));
  }

  if (loading) return <p className={styles.state}>Loading…</p>;
  if (error || !deployment) return <p className={styles.stateError}>{error ?? 'Not found'}</p>;

  const appIndex = Object.fromEntries(apps.map(a => [a.id, a.name]));

  return (
    <div data-testid="deployment-detail-page">
      <div className={styles.breadcrumb}>
        <Link to="/">Deployments</Link>
        <span>/</span>
        <span>{deployment.name}</span>
      </div>

      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>{deployment.name}</h1>
          <p className={styles.customer}>{deployment.customerId}</p>
        </div>
        <StatusBadge status={deployment.status} />
      </div>

      {/* External Apps */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>External apps</h2>
          <p className={styles.sectionSub}>
            Applications delegating authentication to this deployment. Each app receives a Keycloak
            client and credentials.
          </p>
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
