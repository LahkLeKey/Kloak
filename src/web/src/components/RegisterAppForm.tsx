import type { ChangeEvent, FormEvent } from 'react';
import { useState } from 'react';
import styles from './RegisterAppForm.module.css';

export interface RegisterAppFormValues {
  name: string;
  description: string;
  allowedOrigins: string;
  redirectUris: string;
  scopes: string;
}

interface RegisterAppFormProps {
  onSubmit: (values: RegisterAppFormValues) => Promise<void>;
  loading?: boolean;
  error?: string;
  initialValues?: Partial<RegisterAppFormValues>;
}

const DEFAULT_SCOPES = 'openid profile email';

export function RegisterAppForm({ onSubmit, loading, error, initialValues }: RegisterAppFormProps) {
  const [values, setValues] = useState<RegisterAppFormValues>({
    name: initialValues?.name ?? '',
    description: initialValues?.description ?? '',
    allowedOrigins: initialValues?.allowedOrigins ?? '',
    redirectUris: initialValues?.redirectUris ?? '',
    scopes: initialValues?.scopes ?? DEFAULT_SCOPES,
  });

  function handleChange(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setValues(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await onSubmit(values);
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} data-testid="register-app-form">
      <div className={styles.field}>
        <label htmlFor="app-name" className={styles.label}>
          Application name <span className={styles.required}>*</span>
        </label>
        <input
          id="app-name"
          name="name"
          className={styles.input}
          placeholder="e.g. Company Portal"
          value={values.name}
          onChange={handleChange}
          required
          data-testid="name-input"
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="app-description" className={styles.label}>
          Description
        </label>
        <input
          id="app-description"
          name="description"
          className={styles.input}
          placeholder="Optional – shown in the dashboard"
          value={values.description}
          onChange={handleChange}
          data-testid="description-input"
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="app-origins" className={styles.label}>
          Allowed origins <span className={styles.required}>*</span>
        </label>
        <p className={styles.hint}>One per line — e.g. https://app.example.com</p>
        <textarea
          id="app-origins"
          name="allowedOrigins"
          className={styles.textarea}
          placeholder="https://app.example.com"
          value={values.allowedOrigins}
          onChange={handleChange}
          rows={3}
          required
          data-testid="origins-input"
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="app-redirects" className={styles.label}>
          Redirect URIs <span className={styles.required}>*</span>
        </label>
        <p className={styles.hint}>One per line — OAuth callback URLs for this application</p>
        <textarea
          id="app-redirects"
          name="redirectUris"
          className={styles.textarea}
          placeholder="https://app.example.com/auth/callback"
          value={values.redirectUris}
          onChange={handleChange}
          rows={3}
          required
          data-testid="redirects-input"
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="app-scopes" className={styles.label}>
          Scopes
        </label>
        <p className={styles.hint}>Space-separated OAuth scopes to allow</p>
        <input
          id="app-scopes"
          name="scopes"
          className={styles.input}
          placeholder="openid profile email"
          value={values.scopes}
          onChange={handleChange}
          data-testid="scopes-input"
        />
      </div>

      {error && (
        <div className={styles.error} role="alert" data-testid="form-error">
          {error}
        </div>
      )}

      <div className={styles.actions}>
        <button
          type="submit"
          className={styles.submitBtn}
          disabled={loading}
          data-testid="submit-btn"
        >
          {loading ? 'Registering…' : 'Register application'}
        </button>
      </div>
    </form>
  );
}

// Helper: parse form textarea values into arrays
export function parseLines(value: string): string[] {
  return value
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean);
}
