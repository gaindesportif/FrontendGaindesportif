'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { ArrowRight, Heart, History, ShieldCheck } from 'lucide-react';
import {
  customerError,
  customerFetch,
  notifyCustomerChange,
  safeCustomerReturn,
} from '@/lib/customer-client';
import { useCustomer } from './customer-provider';
import { PasswordField } from './password-field';
import styles from './account.module.css';

type Mode = 'login' | 'register' | 'recover';
function returnTarget() {
  const params = new URLSearchParams(window.location.search);
  const target = new URL(safeCustomerReturn(params.get('next')), window.location.origin);
  const favorite = params.get('favorite');
  if (favorite && /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(favorite))
    target.searchParams.set('favorite', favorite);
  return `${target.pathname}${target.search}${target.hash}`;
}
function linkedAuth(path: string, search: string) {
  const params = new URLSearchParams(search);
  const query = new URLSearchParams({ next: safeCustomerReturn(params.get('next')) });
  const favorite = params.get('favorite');
  if (favorite && /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(favorite))
    query.set('favorite', favorite);
  return `${path}?${query}`;
}
export function AccountAuth({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  useEffect(() => {
    queueMicrotask(() => setSearch(window.location.search));
  }, []);
  const { user, status, refresh } = useCustomer();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const register = mode === 'register';
  const recover = mode === 'recover';
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    const password = String(fields.get('password') || '');
    if (register && password !== fields.get('confirmPassword')) {
      setError('Les deux mots de passe doivent être identiques.');
      return;
    }
    setPending(true);
    setError('');
    try {
      const email = String(fields.get('email') || '').trim();
      if (recover) {
        const result = await customerFetch<{ message: string }>('auth/forgot', {
          method: 'POST',
          body: JSON.stringify({ email }),
        });
        setMessage(result.message);
      } else if (register) {
        const result = await customerFetch<{ verificationQueued: boolean }>('auth/register', {
          method: 'POST',
          body: JSON.stringify({
            email,
            displayName: String(fields.get('displayName') || '').trim(),
            password,
            consent: fields.get('consent') === 'on',
          }),
        });
        setMessage(
          result.verificationQueued
            ? 'Votre compte est créé. Consultez votre boîte e-mail pour confirmer votre adresse.'
            : 'Votre compte est créé. Vous pourrez confirmer votre adresse depuis votre profil lorsque le service e-mail sera disponible.',
        );
        await refresh();
        notifyCustomerChange();
      } else {
        await customerFetch('auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
        await refresh();
        notifyCustomerChange();
        router.replace(returnTarget());
      }
      form.reset();
    } catch (error) {
      setError(customerError(error));
    } finally {
      setPending(false);
    }
  }
  return (
    <div className={styles.root}>
      <div className={styles.authGrid}>
        <aside className={styles.intro} aria-label="Votre espace Gaindé">
          <div>
            <p className={styles.eyebrow}>Votre espace Gaindé</p>
            <p className={styles.title}>
              Vos envies.
              <br />
              Votre terrain.
            </p>
            <p className={styles.description}>Retrouvez ce qui vous plaît, où que vous soyez.</p>
          </div>
          <ul className={styles.benefits}>
            <li>
              <Heart size={22} aria-hidden="true" />
              <div>
                <strong>Une sélection qui vous suit</strong>
                <span>Vos produits favoris sur chacun de vos appareils.</span>
              </div>
            </li>
            <li>
              <History size={22} aria-hidden="true" />
              <div>
                <strong>Le fil de vos découvertes</strong>
                <span>Retrouvez les produits consultés et vos demandes préparées.</span>
              </div>
            </li>
            <li>
              <ShieldCheck size={22} aria-hidden="true" />
              <div>
                <strong>Vous gardez la main</strong>
                <span>Gérez votre profil, votre historique et votre compte.</span>
              </div>
            </li>
          </ul>
          <Link href="/boutique" className={styles.actions}>
            Retour à la boutique <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </aside>
        <div className={styles.formPanel}>
          {message ? (
            <section>
              <h1 className={styles.formTitle}>
                {recover ? 'Vérifiez votre boîte e-mail' : 'Bienvenue chez Gaindé'}
              </h1>
              <p className={styles.success} role="status">
                {message}
              </p>
              <Link
                className={styles.primary}
                href={recover ? linkedAuth('/compte/connexion', search) : returnTarget()}
              >
                Continuer
              </Link>
            </section>
          ) : user && status === 'authenticated' && !recover ? (
            <section>
              <h1 className={styles.formTitle}>Vous êtes déjà connecté</h1>
              <p className={styles.description}>Votre espace vous attend, {user.displayName}.</p>
              <Link className={styles.primary} href="/compte">
                Accéder à mon espace <ArrowRight size={17} aria-hidden="true" />
              </Link>
            </section>
          ) : (
            <>
              <h1 className={styles.formTitle}>
                {register
                  ? 'Créer mon compte'
                  : recover
                    ? 'Retrouver mon compte'
                    : 'Heureux de vous revoir'}
              </h1>
              <p className={styles.description}>
                {register
                  ? 'Quelques informations pour retrouver vos favoris et vos découvertes.'
                  : recover
                    ? 'Indiquez votre adresse e-mail pour recevoir un lien et choisir un nouveau mot de passe.'
                    : 'Connectez-vous pour retrouver vos favoris et votre espace personnel.'}
              </p>
              {error && (
                <p className={styles.error} role="alert">
                  {error}
                </p>
              )}
              <form className={styles.form} onSubmit={submit} aria-busy={pending}>
                {register && (
                  <div className={styles.field}>
                    <label htmlFor="displayName">Votre nom</label>
                    <input
                      className={styles.input}
                      id="displayName"
                      name="displayName"
                      required
                      minLength={2}
                      maxLength={100}
                      autoComplete="name"
                    />
                  </div>
                )}
                <div className={styles.field}>
                  <label htmlFor="email">Adresse e-mail</label>
                  <input
                    className={styles.input}
                    id="email"
                    name="email"
                    type="email"
                    required
                    maxLength={254}
                    autoComplete="email"
                    autoCapitalize="none"
                    spellCheck={false}
                  />
                </div>
                {!recover && (
                  <PasswordField
                    id="password"
                    label={recover ? 'Nouveau mot de passe' : 'Mot de passe'}
                    autoComplete={register || recover ? 'new-password' : 'current-password'}
                    minimum={register || recover ? 12 : 1}
                    hint={register}
                  />
                )}
                {register && (
                  <PasswordField
                    id="confirmPassword"
                    label="Confirmer le mot de passe"
                    hint={false}
                  />
                )}
                {register && (
                  <label className={styles.checkbox}>
                    <input type="checkbox" name="consent" required />
                    <span>
                      J’accepte le traitement de mes informations pour la gestion de mon compte,
                      selon la{' '}
                      <Link
                        className={styles.textLink}
                        href="/confidentialite"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        politique de confidentialité
                      </Link>
                      .
                    </span>
                  </label>
                )}
                <button className={styles.primary} type="submit" disabled={pending}>
                  {pending
                    ? 'Un instant…'
                    : register
                      ? 'Créer mon compte'
                      : recover
                        ? 'Recevoir le lien'
                        : 'Me connecter'}
                  <ArrowRight size={18} aria-hidden="true" />
                </button>
                {!register && !recover && (
                  <Link
                    className={styles.textLink}
                    href={linkedAuth('/compte/recuperation', search)}
                  >
                    Mot de passe oublié ?
                  </Link>
                )}
              </form>
              <p className={styles.formFooter}>
                {register || recover ? 'Déjà un compte ? ' : 'Pas encore de compte ? '}
                <Link
                  className={styles.textLink}
                  href={linkedAuth(
                    register || recover ? '/compte/connexion' : '/compte/inscription',
                    search,
                  )}
                >
                  {register || recover ? 'Me connecter' : 'Créer mon compte'}
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
