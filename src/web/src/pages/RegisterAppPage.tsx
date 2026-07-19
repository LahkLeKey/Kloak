import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import {
  parseLines,
  RegisterAppForm,
  type RegisterAppFormValues,
} from '../components/RegisterAppForm';
import styles from './RegisterAppPage.module.css';

export function RegisterAppPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function handleSubmit(values: RegisterAppFormValues) {
    if (!id) return;
    setLoading(true);
    setError(undefined);
    try {
      await api.registerApp(id, {
        name: values.name,
        description: values.description || undefined,
        allowedOrigins: parseLines(values.allowedOrigins),
        redirectUris: parseLines(values.redirectUris),
        scopes: values.scopes.split(/\s+/).filter(Boolean),
      });
      navigate(`/deployments/${id}`);
    } catch (e) {
      setError((e as Error).message);
      setLoading(false);
    }
  }

  return (
    <div data-testid="register-app-page">
      <div className={styles.breadcrumb}>
        <Link to="/">Deployments</Link>
        <span>/</span>
        <Link to={`/deployments/${id}`}>Deployment</Link>
        <span>/</span>
        <span>Register app</span>
      </div>

      <div className={styles.pageHeader}>
        <h1 className={styles.title}>Register external application</h1>
        <p className={styles.subtitle}>
          Connect an external domain or application to this deployment. Kloak will provision a
          Keycloak client and issue OAuth credentials — no separate OAuth setup required.
        </p>
      </div>

      <RegisterAppForm onSubmit={handleSubmit} loading={loading} error={error} />
    </div>
  );
}
