import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './LoginPage.module.css';

interface LoginForm {
    email: string;
    password: string;
}

export function LoginPage() {
    const navigate = useNavigate();
    const [form, setForm] = useState<LoginForm>({ email: '', password: '' });
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.currentTarget;
        setForm(prev => ({ ...prev, [name]: value }));
        setError(null);
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });

            if (!response.ok) {
                const body = await response.text();
                throw new Error(body || 'Login failed');
            }

            const { user, token } = (await response.json()) as {
                user: { id: string; email: string; deploymentId: string };
                token: string;
            };

            localStorage.setItem('authToken', token);
            localStorage.setItem('userId', user.id);
            localStorage.setItem('deploymentId', user.deploymentId);
            navigate('/account');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <h1>Login</h1>
                <p className={styles.subtitle}>Sign in to your Kloak account</p>

                <form onSubmit={handleSubmit} className={styles.form}>
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
                            autoComplete="current-password"
                        />
                    </div>

                    {error && <div className={styles.error}>{error}</div>}

                    <button type="submit" className={styles.submitBtn} disabled={loading}>
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>

                <div className={styles.footer}>
                    <p>
                        Don't have an account?{' '}
                        <button type="button" className={styles.link} onClick={() => navigate('/auth/signup')}>
                            Create one
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}
