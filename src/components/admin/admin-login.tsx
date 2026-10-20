'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AdminApiError, adminError, adminFetch } from '@/lib/admin-client';
import { useAdminSession } from './admin-session';
import styles from './admin.module.css';

export function AdminLogin() {
  const router = useRouter();
  const { user, refresh } = useAdminSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    setBusy(true);
    setError('');
    try {
      await adminFetch('auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: fields.get('username'),
          password: fields.get('password'),
        }),
      });
      form.reset();
      await refresh();
      router.replace('/administration');
    } catch (error) {
      setError(error instanceof AdminApiError ? error.message : adminError(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className={`${styles.panel} ${styles.narrow}`}>
      <p className={styles.eyebrow}>Gestion de la boutique</p>
      <h1 className={styles.title}>Connexion</h1>
      {user ? (
        <>
          <p>Votre session est ouverte.</p>
          <Link className={styles.button} href="/administration">
            Gérer les produits
          </Link>
        </>
      ) : (
        <form onSubmit={submit} className={styles.form}>
          <p className={styles.subtitle}>
            Accès réservé aux comptes autorisés par le propriétaire.
          </p>
          <div className={styles.field}>
            <label htmlFor="admin-username">Identifiant du compte</label>
            <input
              id="admin-username"
              name="username"
              autoComplete="username"
              required
              minLength={3}
              maxLength={60}
              disabled={busy}
              autoCapitalize="none"
              spellCheck={false}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="admin-password">Mot de passe</label>
            <input
              id="admin-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              maxLength={200}
              disabled={busy}
            />
          </div>
          {error && (
            <p role="alert" className={styles.error}>
              {error}
            </p>
          )}
          <button type="submit" className={styles.button} disabled={busy}>
            {busy ? 'Connexion…' : 'Se connecter'}
          </button>
          <p className={styles.hint}>
            Si vous n’avez pas encore de compte ou avez perdu votre accès, contactez le propriétaire
            de la boutique.
          </p>
        </form>
      )}
    </section>
  );
}
