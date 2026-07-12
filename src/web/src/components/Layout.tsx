import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import styles from './Layout.module.css';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const isRoot = location.pathname === '/';

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
          <a
            href="https://kloak.net/docs"
            className={styles.link}
            target="_blank"
            rel="noopener noreferrer"
          >
            Docs
          </a>
        </nav>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
