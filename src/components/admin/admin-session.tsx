'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { AdminApiError, adminError, adminFetch, type AdminUser } from '@/lib/admin-client';
import styles from './admin.module.css';

type SessionState = {
  user: AdminUser | null;
  refresh: () => Promise<void>;
};
const SessionContext = createContext<SessionState>({ user: null, refresh: async () => {} });
export function useAdminSession() {
  return useContext(SessionContext);
}

export function AdminSession({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);
  const refresh = useCallback(async () => {
    setError('');
    try {
      const result = await adminFetch<{ user: AdminUser }>('auth/me');
      setUser(result.user);
    } catch (error) {
      setUser(null);
      if (!(error instanceof AdminApiError && error.status === 401)) setError(adminError(error));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    function expired() {
      setUser(null);
      setError('Votre session a expiré. Reconnectez-vous avant de continuer.');
    }
    window.addEventListener('gainde-admin-expired', expired);
    return () => window.removeEventListener('gainde-admin-expired', expired);
  }, []);
  useEffect(() => {
    let current = true;
    adminFetch<{ user: AdminUser }>('auth/me')
      .then((result) => {
        if (current) setUser(result.user);
      })
      .catch((error: unknown) => {
        if (current && !(error instanceof AdminApiError && error.status === 401))
          setError(adminError(error));
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, []);
  const loginPage = pathname === '/administration/connexion';
  async function logout() {
    setLoggingOut(true);
    setError('');
    try {
      await adminFetch('auth/logout', { method: 'POST', body: '{}' });
      setUser(null);
      router.replace('/administration/connexion');
    } catch (error) {
      setError(adminError(error));
    } finally {
      setLoggingOut(false);
    }
  }
  return (
    <SessionContext.Provider value={{ user, refresh }}>
      <div className={styles.root}>
        <header className={styles.top}>
          <div>
            <p className={styles.eyebrow}>Gainde Sportif · Espace privé</p>
            <p className={styles.subtitle}>La gestion de votre boutique.</p>
          </div>
          {user && (
            <div className={styles.actions}>
              <span>
                {user.displayName} · {user.role === 'owner' ? 'Propriétaire' : 'Administrateur'}
              </span>
              <button className={styles.secondary} onClick={logout} disabled={loggingOut}>
                {loggingOut ? 'Déconnexion…' : 'Se déconnecter'}
              </button>
            </div>
          )}
        </header>
        {user && (
          <nav className={styles.nav} aria-label="Administration">
            <Link
              href="/administration"
              aria-current={
                pathname === '/administration' || pathname.includes('/produits/')
                  ? 'page'
                  : undefined
              }
            >
              Produits
            </Link>
            <Link
              href="/administration/comptes"
              aria-current={pathname === '/administration/comptes' ? 'page' : undefined}
            >
              {user.role === 'owner' ? 'Comptes et sécurité' : 'Ma sécurité'}
            </Link>
            <Link
              href="/administration/demandes"
              aria-current={pathname === '/administration/demandes' ? 'page' : undefined}
            >
              Demandes clients
            </Link>
            <Link href="/boutique">Voir la boutique</Link>
          </nav>
        )}
        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
        {loading ? (
          <p role="status" className={styles.panel}>
            Vérification de votre session…
          </p>
        ) : loginPage || user ? (
          children
        ) : (
          <section className={`${styles.panel} ${styles.narrow}`}>
            <h1 className={styles.title}>Accès à la boutique</h1>
            <p>Connectez-vous avec le compte créé par le propriétaire.</p>
            <div className={styles.actions} style={{ marginTop: 20 }}>
              <Link href="/administration/connexion" className={styles.button}>
                Se connecter
              </Link>
              {error && (
                <button className={styles.secondary} onClick={() => void refresh()}>
                  Réessayer
                </button>
              )}
            </div>
          </section>
        )}
      </div>
    </SessionContext.Provider>
  );
}
