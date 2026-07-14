import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import styles from './Layout.module.css';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const isRoot = location.pathname === '/';
  const isDocs = location.pathname === '/docs';

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link to="/" className={styles.brand}>
          <span className={styles.brandIcon}>⬡</span>
          <span className={styles.brandName}>Kloak</span>
        </Link>
        <nav className={styles.nav}>
          <Link to="/" className={isRoot ? styles.activeLink : styles.link}>
            Deployments
          </Link>
          <Link to="/docs" className={isDocs ? styles.activeLink : styles.link}>
            Docs
          </Link>
        </nav>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
