import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Deployment } from '../api';
import { api } from '../api';
import { StatusBadge } from '../components/StatusBadge';
import styles from './DeploymentsPage.module.css';

export function DeploymentsPage() {
    const [deployments, setDeployments] = useState<Deployment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        api
            .listDeployments()
            .then(setDeployments)
            .catch((e: Error) => setError(e.message))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <p className={styles.state}>Loading deployments…</p>;
    if (error) return <p className={styles.stateError}>Failed to load: {error}</p>;

    return (
        <div data-testid="deployments-page">
            <div className={styles.pageHeader}>
                <div>
                    <h1 className={styles.title}>Customer deployments</h1>
                    <p className={styles.subtitle}>
                        Select a deployment to manage its external apps and auth flows.
                    </p>
                </div>
                <Link to="/deployments/new" className={styles.createBtn}>
                    + Create Deployment
                </Link>
            </div>

            {deployments.length === 0 ? (
                <div className={styles.empty}>
                    <p>No deployments yet.</p>
                </div>
            ) : (
                <ul className={styles.list}>
                    {deployments.map(dep => (
                        <li key={dep.id}>
                            <Link to={`/deployments/${dep.id}`} className={styles.card}>
                                <div className={styles.cardMain}>
                                    <span className={styles.depName}>{dep.name}</span>
                                    <span className={styles.customer}>{dep.customerId}</span>
                                </div>
                                <StatusBadge status={dep.status} />
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
