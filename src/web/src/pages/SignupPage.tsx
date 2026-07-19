import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './SignupPage.module.css';

interface SignupForm {
  deploymentId: string;
  email: string;
  password: string;
  confirmPassword: string;
  displayName?: string;
}

export function SignupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<SignupForm>({
    deploymentId: '',
    email: '',
    password: '',
    confirmPassword: '',
    displayName: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.currentTarget;
    setForm(prev => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deploymentId: form.deploymentId,
          email: form.email,
          password: form.password,
          displayName: form.displayName || undefined,
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(body || 'Signup failed');
      }

      const user = (await response.json()) as {
        id: string;
        email: string;
        deploymentId: string;
      };

      localStorage.setItem('userId', user.id);
      localStorage.setItem('deploymentId', user.deploymentId);
      navigate('/auth/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1>Create Account</h1>
        <p className={styles.subtitle}>Join Kloak and manage your identity</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="deploymentId">Deployment ID</label>
            <input
              id="deploymentId"
              name="deploymentId"
              type="text"
              value={form.deploymentId}
              onChange={handleChange}
              placeholder="deployment-123"
              required
              disabled={loading}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="you@example.com"
              required
              disabled={loading}
              autoComplete="email"
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="displayName">Display Name (optional)</label>
            <input
              id="displayName"
              name="displayName"
              type="text"
              value={form.displayName}
              onChange={handleChange}
              placeholder="Your name"
              disabled={loading}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              placeholder="••••••••"
              required
              disabled={loading}
              autoComplete="new-password"
            />
            <p className={styles.hint}>At least 8 characters</p>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={form.confirmPassword}
              onChange={handleChange}
              placeholder="••••••••"
              required
              disabled={loading}
              autoComplete="new-password"
            />
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div className={styles.footer}>
          <p>
            Already have an account?{' '}
            <button type="button" className={styles.link} onClick={() => navigate('/auth/login')}>
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
