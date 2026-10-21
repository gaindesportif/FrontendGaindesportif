'use client';
import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { customerFetch, customerError, notifyCustomerChange } from '@/lib/customer-client';
import { PasswordField } from './password-field';
import styles from './account.module.css';

export function EmailAction({ reset = false }: { reset?: boolean }) {
  const [token, setToken] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const value = new URLSearchParams(window.location.hash.slice(1)).get('token');
    window.history.replaceState(window.history.state, '', window.location.pathname);
    queueMicrotask(() => setToken(value && /^[A-Za-z0-9_-]{43}$/.test(value) ? value : ''));
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const password = String(fields.get('password') || '');
    if (reset && password !== fields.get('confirmPassword')) {
      setError('Les deux mots de passe doivent être identiques.');
      return;
    }
    setPending(true);
    setError('');
    try {
      await customerFetch(reset ? 'auth/reset' : 'auth/verify', {
        method: 'POST',
        body: JSON.stringify({ token, ...(reset ? { newPassword: password } : {}) }),
      });
      setDone(true);
      setToken('');
      notifyCustomerChange();
    } catch (error) {
      setError(customerError(error));
    } finally {
      setPending(false);
    }
  }
  return (
    <div className={styles.root}>
      <section className={styles.panel}>
        <h1 className={styles.formTitle}>
          {reset ? 'Choisir un nouveau mot de passe' : 'Confirmer mon adresse e-mail'}
        </h1>
        {done ? (
          <>
            <p className={styles.success} role="status">
              {reset
                ? 'Votre mot de passe a été modifié. Reconnectez-vous avec votre nouveau mot de passe.'
                : 'Votre adresse e-mail est confirmée.'}
            </p>
            <Link className={styles.primary} href={reset ? '/compte/connexion' : '/compte'}>
              Continuer
            </Link>
          </>
        ) : token === null ? (
          <p role="status">Lecture du lien…</p>
        ) : !token ? (
          <>
            <p className={styles.error} role="alert">
              Ce lien est incomplet. Ouvrez le lien reçu par e-mail ou demandez-en un nouveau.
            </p>
            <Link className={styles.textLink} href={reset ? '/compte/recuperation' : '/compte'}>
              Demander un nouveau lien
            </Link>
          </>
        ) : (
          <>
            <p className={styles.description}>
              {reset
                ? 'Au moins 12 caractères. Après validation, vos anciennes sessions seront fermées.'
                : 'Validez cette adresse pour recevoir les nouvelles de vos demandes.'}
            </p>
            {error && (
              <p className={styles.error} role="alert">
                {error}
              </p>
            )}
            <form className={styles.form} onSubmit={submit} aria-busy={pending}>
              {reset && (
                <>
                  <PasswordField id="password" label="Nouveau mot de passe" />
                  <PasswordField
                    id="confirmPassword"
                    label="Confirmer le mot de passe"
                    hint={false}
                  />
                </>
              )}
              <button className={styles.primary} disabled={pending}>
                {pending
                  ? 'Un instant…'
                  : reset
                    ? 'Enregistrer le mot de passe'
                    : 'Confirmer mon adresse'}
              </button>
            </form>
            {error && (
              <Link className={styles.textLink} href={reset ? '/compte/recuperation' : '/compte'}>
                Demander un nouveau lien
              </Link>
            )}
          </>
        )}
      </section>
    </div>
  );
}
