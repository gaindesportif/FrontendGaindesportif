'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { adminError, adminFetch, type AdminUser } from '@/lib/admin-client';
import { useAdminSession } from './admin-session';
import { PasswordInput } from '../password-input';
import styles from './admin.module.css';

export function AdminAccounts() {
  const { user, refresh } = useAdminSession();
  const owner = user?.role === 'owner';
  const [accounts, setAccounts] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(owner);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const load = useCallback(async () => {
    if (!owner) return;
    setLoading(true);
    try {
      setAccounts((await adminFetch<{ items: AdminUser[] }>('accounts')).items);
    } catch (error) {
      setError(adminError(error));
    } finally {
      setLoading(false);
    }
  }, [owner]);
  useEffect(() => {
    if (!owner) return;
    let current = true;
    adminFetch<{ items: AdminUser[] }>('accounts')
      .then((result) => {
        if (current) setAccounts(result.items);
      })
      .catch((error: unknown) => {
        if (current) setError(adminError(error));
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [owner]);
  async function createAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    const username = String(fields.get('username') || '').trim();
    setSuccess('');
    if (!/^[^\p{Cc}]{4,60}$/u.test(username)) {
      setError('L’identifiant doit contenir de 4 à 60 caractères.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await adminFetch('accounts', {
        method: 'POST',
        body: JSON.stringify({
          username,
          displayName: String(fields.get('displayName') || '').trim(),
          password: fields.get('password'),
        }),
      });
      form.reset();
      setSuccess('Compte administrateur créé. Transmettez son accès par un canal privé.');
      await load();
    } catch (error) {
      setError(adminError(error));
    } finally {
      setBusy(false);
    }
  }
  async function updateAccount(event: FormEvent<HTMLFormElement>, account: AdminUser) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    const password = String(fields.get('password') || '');
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await adminFetch(`accounts/${account.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          displayName: String(fields.get('displayName') || '').trim(),
          ...(account.role !== 'owner' ? { active: fields.get('active') === 'on' } : {}),
          ...(password ? { password } : {}),
        }),
      });
      const passwordInput = form.elements.namedItem('password');
      if (passwordInput instanceof HTMLInputElement) passwordInput.value = '';
      setSuccess(
        'Compte mis à jour. Les sessions du compte sont révoquées si son accès est désactivé ou son mot de passe remplacé.',
      );
      await load();
      if (account.id === user?.id) await refresh();
    } catch (error) {
      setError(adminError(error));
    } finally {
      setBusy(false);
    }
  }
  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    if (fields.get('newPassword') !== fields.get('confirmPassword')) {
      setError('Les deux nouveaux mots de passe ne correspondent pas.');
      return;
    }
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await adminFetch('auth/password', {
        method: 'POST',
        body: JSON.stringify({
          currentPassword: fields.get('currentPassword'),
          newPassword: fields.get('newPassword'),
        }),
      });
      form.reset();
      setSuccess('Mot de passe modifié. Vos autres sessions sont fermées.');
    } catch (error) {
      setError(adminError(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <p className={styles.eyebrow}>Accès privés</p>
      <h1 className={styles.title}>{owner ? 'Comptes et sécurité' : 'Ma sécurité'}</h1>
      <p className={styles.subtitle}>
        Chaque personne dispose de son propre compte. Le propriétaire gère les accès de l’équipe.
      </p>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      {success && (
        <p role="status" className={styles.success}>
          {success}
        </p>
      )}
      <section className={styles.panel}>
        <h2>Changer mon mot de passe</h2>
        <form onSubmit={changePassword} className={styles.form}>
          <div className={styles.grid}>
            <div className={styles.field}>
              <label htmlFor="own-current-password">Mot de passe actuel</label>
              <PasswordInput
                id="own-current-password"
                name="currentPassword"
                label="Mot de passe actuel"
                required
                autoComplete="current-password"
                maxLength={128}
                disabled={busy}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="own-new-password">Nouveau mot de passe</label>
              <PasswordInput
                id="own-new-password"
                name="newPassword"
                label="Nouveau mot de passe"
                required
                autoComplete="new-password"
                minLength={4}
                maxLength={128}
                disabled={busy}
                aria-describedby="own-password-help"
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="own-confirm-password">Confirmer le nouveau mot de passe</label>
              <PasswordInput
                id="own-confirm-password"
                name="confirmPassword"
                label="Confirmer le nouveau mot de passe"
                required
                autoComplete="new-password"
                minLength={4}
                maxLength={128}
                disabled={busy}
              />
            </div>
          </div>
          <p className={styles.hint} id="own-password-help">
            Au moins 4 caractères. Utilisez un mot de passe unique et conservez-le dans votre
            gestionnaire de mots de passe.
          </p>
          <div className={styles.actions}>
            <button className={styles.button} disabled={busy} type="submit">
              {busy ? 'Enregistrement…' : 'Changer mon mot de passe'}
            </button>
          </div>
        </form>
      </section>
      {owner && (
        <>
          <section className={styles.panel}>
            <h2>Créer un compte administrateur</h2>
            <p className={styles.hint}>
              Le compte pourra gérer les produits et les médias. La gestion des comptes reste
              réservée au propriétaire.
            </p>
            <form onSubmit={createAccount} className={styles.form} style={{ marginTop: 20 }}>
              <div className={`${styles.grid} ${styles.accountGrid}`}>
                <div className={styles.field}>
                  <label htmlFor="new-username">Identifiant</label>
                  <input
                    id="new-username"
                    name="username"
                    required
                    minLength={4}
                    aria-describedby="new-username-help"
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    disabled={busy}
                  />
                  <p className={styles.hint} id="new-username-help">
                    De 4 à 60 caractères. Vous pouvez aussi utiliser une adresse e-mail.
                  </p>
                </div>
                <div className={styles.field}>
                  <label htmlFor="new-displayname">Nom affiché</label>
                  <input
                    id="new-displayname"
                    name="displayName"
                    required
                    minLength={2}
                    maxLength={100}
                    autoComplete="off"
                    disabled={busy}
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="new-account-password">Mot de passe initial</label>
                  <PasswordInput
                    id="new-account-password"
                    name="password"
                    label="Mot de passe initial"
                    required
                    minLength={4}
                    maxLength={128}
                    autoComplete="new-password"
                    disabled={busy}
                    aria-describedby="new-password-help"
                  />
                  <p className={styles.hint} id="new-password-help">
                    Au moins 4 caractères. À transmettre par un canal privé.
                  </p>
                </div>
              </div>
              <div className={styles.actions}>
                <button className={styles.button} disabled={busy} type="submit">
                  {busy ? 'Enregistrement…' : 'Créer le compte'}
                </button>
              </div>
            </form>
          </section>
          <section className={styles.panel}>
            <h2>Comptes de l’équipe</h2>
            {loading ? (
              <p role="status">Chargement des comptes…</p>
            ) : (
              <div className={styles.list}>
                {accounts.map((account) =>
                  account.role === 'owner' ? (
                    <article key={account.id} className={styles.account}>
                      <h3>{account.displayName}</h3>
                      <p className={styles.hint}>{account.username} · Propriétaire · Accès actif</p>
                      <p className={styles.hint}>
                        Ce compte reste propriétaire de la boutique. Son mot de passe se modifie
                        dans la section « Changer mon mot de passe ».
                      </p>
                    </article>
                  ) : (
                    <form
                      key={account.id}
                      onSubmit={(event) => updateAccount(event, account)}
                      className={styles.account}
                    >
                      <div>
                        <h3>{account.displayName}</h3>
                        <p className={styles.hint}>
                          {account.username} · Administrateur ·{' '}
                          {account.active ? 'Accès actif' : 'Accès désactivé'}
                        </p>
                      </div>
                      <div className={styles.grid}>
                        <div className={styles.field}>
                          <label htmlFor={`name-${account.id}`}>
                            Nom affiché de {account.username}
                          </label>
                          <input
                            id={`name-${account.id}`}
                            name="displayName"
                            required
                            minLength={2}
                            maxLength={100}
                            defaultValue={account.displayName}
                            disabled={busy}
                          />
                        </div>
                        {
                          <div className={styles.field}>
                            <label htmlFor={`password-${account.id}`}>
                              Nouveau mot de passe de {account.username}
                            </label>
                            <PasswordInput
                              id={`password-${account.id}`}
                              name="password"
                              label={`Nouveau mot de passe de ${account.username}`}
                              autoComplete="new-password"
                              minLength={4}
                              maxLength={128}
                              disabled={busy}
                            />
                            <p className={styles.hint}>
                              Laissez vide pour conserver le mot de passe actuel.
                            </p>
                          </div>
                        }
                      </div>
                      {
                        <label className={styles.checkbox}>
                          <input
                            type="checkbox"
                            name="active"
                            defaultChecked={account.active}
                            disabled={busy}
                          />
                          Accès actif pour {account.username}
                        </label>
                      }
                      <div className={styles.actions}>
                        <button className={styles.secondary} type="submit" disabled={busy}>
                          Enregistrer le compte
                        </button>
                      </div>
                    </form>
                  ),
                )}
              </div>
            )}
            <button
              className={styles.secondary}
              disabled={loading || busy}
              onClick={() => void load()}
              style={{ marginTop: 20 }}
            >
              Actualiser les comptes
            </button>
          </section>
        </>
      )}
    </>
  );
}
