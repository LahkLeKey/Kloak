import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './AccountPage.module.css';

interface LinkedAccount {
    id: string;
    provider: 'email' | 'github' | 'gmail';
    providerId: string;
    providerEmail?: string;
    displayName?: string;
    isPrimary: boolean;
    linkedAt: string;
}

interface User {
    id: string;
    email: string;
    displayName?: string;
    linkedAccounts: LinkedAccount[];
}

export function AccountPage() {
    const navigate = useNavigate();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [unlinkingProvider, setUnlinkingProvider] = useState<string | null>(
        null);
    const [linkingProvider, setLinkingProvider] = useState<string | null>(null);

    useEffect(() => {
        const loadUser = async () => {
            const userId = localStorage.getItem('userId');
            const token = localStorage.getItem('authToken');

            if (!userId || !token) {
                navigate('/auth/login');
                return;
            }

            try {
                const response = await fetch(`/users/${userId}`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                });

                if (!response.ok) {
                    throw new Error('Failed to load user');
                }

                const userData = (await response.json()) as User;
                setUser(userData);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Unknown error');
            } finally {
                setLoading(false);
            }
        };

        loadUser();
    }, [navigate]);

    const handleUnlinkAccount = async (provider: string) => {
        if (!user || unlinkingProvider) return;

        setUnlinkingProvider(provider);
        try {
            const response = await fetch(
                `/users/${user.id}/link-account/${provider}`,
                {
                    method: 'DELETE',
                    headers: {
                        'Authorization':
                            `Bearer ${localStorage.getItem('authToken')}`,
                    },
                });

            if (!response.ok) {
                throw new Error('Failed to unlink account');
            }

            const updated = (await response.json()) as User;
            setUser(updated);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setUnlinkingProvider(null);
        }
    };

    const handleLinkOAuthProvider = async (provider: 'github' | 'gmail') => {
        if (!user || linkingProvider) return;

        setLinkingProvider(provider);
        try {
            const deploymentId = localStorage.getItem('deploymentId');
            if (!deploymentId) {
                throw new Error('Deployment ID not found');
            }

            const redirectUri = `${window.location.origin}/oauth/callback`;
            const response = await fetch(`/oauth/authorize/${provider}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                },
                body: JSON.stringify({
                    deploymentId,
                    redirectUri,
                }),
            });

            if (!response.ok) {
                throw new Error(`Failed to initiate ${provider} login`);
            }

            const { authUrl } = (await response.json()) as { authUrl: string };
            window.location.href = authUrl;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
            setLinkingProvider(null);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userId');
        localStorage.removeItem('deploymentId');
        navigate('/auth/login');
    };

    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.card}>
                    <p>Loading...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className={styles.container}>
                <div className={styles.card}>
                    <p>Unable to load account</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <div className={styles.header}>
                    <div>
                        <h1>My Account</h1>
                        <p className={styles.email}>{user.email}</p>
                        {user.displayName && <p className={styles.displayName}>{user.displayName}</p>}
                    </div>
                    <button type="button" className={styles.logoutBtn} onClick={handleLogout}>
                        Logout
                    </button>
                </div>

                {error && <div className={styles.error}>{error}</div>}

                <section className={styles.section}>
                    <h2>Linked Accounts</h2>
                    <p className={styles.sectionDescription}>
                        Manage the external accounts linked to your Kloak profile.
                    </p>

                    <div className={styles.accountsList}>
                        {user.linkedAccounts.map(account => (
                            <div key={account.id} className={styles.accountItem}>
                                <div className={styles.accountInfo}>
                                    <div className={styles.providerBadge}>{account.provider.toUpperCase()}</div>
                                    <div>
                                        <p className={styles.providerId}>{account.providerId}</p>
                                        {account.providerEmail && (
                                            <p className={styles.providerEmail}>{account.providerEmail}</p>
                                        )}
                                        <p className={styles.linkedDate}>
                                            Linked {new Date(account.linkedAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                    {account.isPrimary && <span className={styles.primaryBadge}>Primary</span>}
                                </div>

                                {user.linkedAccounts.length > 1 && !account.isPrimary && (
                                    <button
                                        type="button"
                                        className={styles.unlinkBtn}
                                        onClick={() => handleUnlinkAccount(account.provider)}
                                        disabled={unlinkingProvider === account.provider}
                                    >
                                        {unlinkingProvider === account.provider ? 'Unlinking...' : 'Unlink'}
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </section>

                <section className={styles.section}>
                    <h2>Add Another Account</h2>
                    <div className={styles.providerButtons}>
                        <button
                            type="button"
                            className={styles.providerBtn}
                            onClick={() => handleLinkOAuthProvider('github')}
                            disabled={linkingProvider !== null}
                        >
                            <span>🔗</span> {linkingProvider === 'github' ?
                                'Redirecting...' :
                                'Link GitHub'}
                        </button>
                        <button
                            type="button"
                            className={styles.providerBtn}
                            onClick={() => handleLinkOAuthProvider('gmail')}
                            disabled={linkingProvider !== null}
                        >
                            <span>📧</span> {linkingProvider === 'gmail' ?
                                'Redirecting...' :
                                'Link Gmail'}
                        </button>
                    </div>
                </section>
            </div>
        </div>
    );
}
