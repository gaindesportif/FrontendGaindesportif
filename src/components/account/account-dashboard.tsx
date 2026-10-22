'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { ArrowRight, Heart, History, LogOut, MessageCircle, Trash2 } from 'lucide-react';
import { CatalogueImage } from '@/components/catalogue/catalogue-image';
import { formatXof, type PublicProduct } from '@/lib/catalogue';
import {
  requestStatusLabels,
  customerError,
  customerFetch,
  notifyCustomerChange,
  type CustomerUser,
  type HistoryResponse,
  type RequestsResponse,
  type WishlistResponse,
} from '@/lib/customer-client';
import { useCustomer } from './customer-provider';
import { PasswordField } from './password-field';
import styles from './account.module.css';

function useAccountResource<T>(path: string, userId: string) {
  const [revision, setRevision] = useState(0);
  const [resource, setResource] = useState<{ key: string; data?: T; error?: string }>({ key: '' });
  const key = `${userId}:${path}:${revision}`;
  const reload = useCallback(() => setRevision((value) => value + 1), []);
  useEffect(() => {
    const abort = new AbortController();
    customerFetch<T>(path, { signal: abort.signal })
      .then((data) => {
        if (!abort.signal.aborted) setResource({ key, data });
      })
      .catch((error: unknown) => {
        if (!abort.signal.aborted) setResource({ key, error: customerError(error) });
      });
    return () => abort.abort();
  }, [key, path]);
  useEffect(() => {
    if (path !== 'wishlist') return;
    window.addEventListener('gainde-customer-wishlist-changed', reload);
    return () => window.removeEventListener('gainde-customer-wishlist-changed', reload);
  }, [path, reload]);
  return {
    data: resource.key === key ? resource.data : undefined,
    error: resource.key === key ? resource.error : undefined,
    reload,
  };
}
function ResourceError({ message, retry }: { message: string; retry: () => void }) {
  return (
    <div className={styles.error} role="alert">
      <p>{message}</p>
      <button className={styles.secondary} onClick={retry}>
        Réessayer
      </button>
    </div>
  );
}
function ProductTile({
  product,
  children,
}: {
  product: PublicProduct;
  children?: React.ReactNode;
}) {
  const image = [...product.media]
    .sort((a, b) => a.position - b.position)
    .find((item) => item.type === 'image');
  return (
    <article className={styles.product}>
      <Link href={`/boutique/${product.slug}`} className={styles.productLink}>
        <div className={styles.visual}>
          {image && (
            <CatalogueImage
              media={{ ...image, alt: image.alt || product.name }}
              sizes="(max-width: 800px) 44vw, 30vw"
            />
          )}
        </div>
        <h3>{product.name}</h3>
        <p className={styles.price}>{formatXof(product.priceXof)}</p>
      </Link>
      {children}
    </article>
  );
}
function Empty({ kind }: { kind: 'wishlist' | 'history' | 'requests' }) {
  const Icon = kind === 'wishlist' ? Heart : kind === 'history' ? History : MessageCircle;
  return (
    <div className={styles.empty}>
      <Icon size={32} aria-hidden="true" />
      <h2>
        {kind === 'wishlist'
          ? 'Vos prochains coups de cœur'
          : kind === 'history'
            ? 'Vos découvertes commencent ici'
            : 'Vos demandes, au même endroit'}
      </h2>
      <p>
        {kind === 'wishlist'
          ? 'Touchez le cœur d’un produit pour le retrouver ici sur tous vos appareils.'
          : kind === 'history'
            ? 'Les produits que vous consultez apparaîtront ici, si votre historique est activé.'
            : 'Les demandes que vous préparez depuis une fiche produit seront conservées ici. Leur envoi et leur confirmation restent dans WhatsApp.'}
      </p>
      <Link className={styles.primary} href="/boutique">
        Découvrir la boutique <ArrowRight size={17} aria-hidden="true" />
      </Link>
    </div>
  );
}
function Wishlist({ userId }: { userId: string }) {
  const { data, error, reload } = useAccountResource<WishlistResponse>('wishlist', userId);
  const [pending, setPending] = useState('');
  const [actionError, setActionError] = useState('');
  async function remove(id: string) {
    setPending(id);
    setActionError('');
    try {
      await customerFetch(`wishlist/${id}`, { method: 'DELETE' });
      window.dispatchEvent(new Event('gainde-customer-wishlist-changed'));
    } catch (error) {
      setActionError(customerError(error));
    } finally {
      setPending('');
    }
  }
  return (
    <section aria-labelledby="favorites-title">
      <div className={styles.row}>
        <div>
          <h2 className={styles.formTitle} id="favorites-title">
            Mes favoris
          </h2>
          <p className={styles.description}>Vos envies, conservées dans votre compte.</p>
        </div>
        {data && (
          <span className={styles.hint}>
            {data.items.length} produit{data.items.length > 1 ? 's' : ''}
          </span>
        )}
      </div>
      {actionError && (
        <p role="alert" className={styles.error}>
          {actionError}
        </p>
      )}
      {error ? (
        <ResourceError message={error} retry={reload} />
      ) : !data ? (
        <p role="status">Chargement de vos favoris…</p>
      ) : data.items.length === 0 ? (
        <Empty kind="wishlist" />
      ) : (
        <div className={styles.grid}>
          {data.items.map((product) => (
            <ProductTile key={product.id} product={product}>
              <div className={styles.productFooter}>
                <span className={styles.hint}>Dans vos favoris</span>
                <button
                  className={styles.remove}
                  onClick={() => void remove(product.id)}
                  disabled={Boolean(pending)}
                  aria-label={`Retirer ${product.name} de mes favoris`}
                >
                  <Trash2 size={17} aria-hidden="true" />
                  {pending === product.id && 'Retrait…'}
                </button>
              </div>
            </ProductTile>
          ))}
        </div>
      )}
    </section>
  );
}
function BrowsingHistory({ userId }: { userId: string }) {
  const { data, error, reload } = useAccountResource<HistoryResponse>('history', userId);
  const [pending, setPending] = useState(false);
  const [enabledIntent, setEnabledIntent] = useState<boolean | null>(null);
  const [actionError, setActionError] = useState('');
  async function mutate(settings?: boolean) {
    setPending(true);
    if (settings !== undefined) setEnabledIntent(settings);
    setActionError('');
    try {
      await customerFetch(
        settings === undefined ? 'history' : 'history/settings',
        settings === undefined
          ? { method: 'DELETE' }
          : { method: 'PATCH', body: JSON.stringify({ enabled: settings }) },
      );
      reload();
    } catch (error) {
      setEnabledIntent(null);
      setActionError(customerError(error));
    } finally {
      setPending(false);
    }
  }
  return (
    <section aria-labelledby="history-title">
      <div className={styles.row}>
        <div>
          <h2 className={styles.formTitle} id="history-title">
            Mon historique
          </h2>
          <p className={styles.description}>Retrouvez vos dernières fiches produit consultées.</p>
        </div>
        {data && data.items.length > 0 && (
          <button className={styles.secondary} disabled={pending} onClick={() => void mutate()}>
            <Trash2 size={16} aria-hidden="true" />
            Effacer mon historique
          </button>
        )}
      </div>
      {data && (
        <div className={styles.notice}>
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={enabledIntent ?? data.enabled}
              disabled={pending}
              onChange={(event) => void mutate(event.target.checked)}
            />
            Enregistrer les produits que je consulte
          </label>
          <p className={styles.hint}>
            Désactiver cette option efface votre historique et arrête son enregistrement.
          </p>
        </div>
      )}
      {actionError && (
        <p className={styles.error} role="alert">
          {actionError}
        </p>
      )}
      {error ? (
        <ResourceError message={error} retry={reload} />
      ) : !data ? (
        <p role="status">Chargement de votre historique…</p>
      ) : data.items.length === 0 ? (
        <Empty kind="history" />
      ) : (
        <div className={styles.grid}>
          {data.items.map(({ product, viewedAt }) => (
            <ProductTile product={product} key={product.id}>
              <p className={styles.hint}>
                Consulté le{' '}
                {new Date(viewedAt).toLocaleDateString('fr-SN', { day: 'numeric', month: 'long' })}
              </p>
            </ProductTile>
          ))}
        </div>
      )}
    </section>
  );
}
function WhatsappRequests({ userId }: { userId: string }) {
  const { data, error, reload } = useAccountResource<RequestsResponse>('requests', userId);
  const [pending, setPending] = useState(false);
  const [actionError, setActionError] = useState('');
  async function clear() {
    setPending(true);
    setActionError('');
    try {
      await customerFetch('requests', { method: 'DELETE' });
      reload();
    } catch (error) {
      setActionError(customerError(error));
    } finally {
      setPending(false);
    }
  }
  return (
    <section aria-labelledby="requests-title">
      <div className={styles.row}>
        <h2 className={styles.formTitle} id="requests-title">
          Mes demandes WhatsApp
        </h2>
        {data && data.items.length > 0 && (
          <button className={styles.secondary} disabled={pending} onClick={() => void clear()}>
            <Trash2 size={16} aria-hidden="true" />
            Effacer mes demandes
          </button>
        )}
      </div>
      <p className={styles.notice}>
        Cet historique conserve vos demandes préparées à l’ouverture de WhatsApp. Il ne confirme ni
        l’envoi du message, ni une commande, ni un paiement. Les statuts de réception, d’expédition
        et de livraison sont renseignés par notre équipe après vérification.
      </p>
      {actionError && (
        <p className={styles.error} role="alert">
          {actionError}
        </p>
      )}
      {error ? (
        <ResourceError message={error} retry={reload} />
      ) : !data ? (
        <p role="status">Chargement de vos demandes…</p>
      ) : data.items.length === 0 ? (
        <Empty kind="requests" />
      ) : (
        <div>
          {data.items.map((item) => (
            <article className={styles.panel} key={item.id}>
              <div className={styles.row}>
                <h3>{item.productName}</h3>
                <time className={styles.hint} dateTime={item.createdAt}>
                  {new Date(item.createdAt).toLocaleDateString('fr-SN', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </time>
              </div>
              <p className={styles.description}>
                Quantité souhaitée : {item.quantity}
                {item.size ? ` · Taille : ${item.size}` : ''}
                {item.color ? ` · Couleur : ${item.color}` : ''}
              </p>
              <p>
                <strong>{requestStatusLabels[item.processingStatus ?? 'prepared']}</strong>
                {item.statusUpdatedAt &&
                  ` · ${new Date(item.statusUpdatedAt).toLocaleDateString('fr-SN')}`}
              </p>
              <p className={styles.description}>
                Prix unitaire affiché lors de la demande : {formatXof(item.priceXof)}
              </p>
              {item.product ? (
                <Link className={styles.textLink} href={`/boutique/${item.product.slug}`}>
                  Revoir le produit
                </Link>
              ) : (
                <p className={styles.hint}>Ce produit n’est plus proposé dans le catalogue.</p>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
function EmailVerification({ user }: { user: CustomerUser }) {
  const { emailEnabled } = useCustomer();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  async function resend() {
    setPending(true);
    setMessage('');
    setError('');
    try {
      const result = await customerFetch<{ queued: boolean; verified: boolean }>(
        'auth/resend-verification',
        { method: 'POST', body: '{}' },
      );
      setMessage(
        result.verified
          ? 'Votre adresse est déjà confirmée.'
          : result.queued
            ? 'Un lien de confirmation va vous être envoyé. Consultez aussi vos courriers indésirables.'
            : 'Un lien a été demandé récemment. Patientez une minute et vérifiez votre boîte e-mail.',
      );
      if (result.verified) notifyCustomerChange();
    } catch (error) {
      setError(customerError(error));
    } finally {
      setPending(false);
    }
  }
  if (!emailEnabled)
    return (
      <p className={styles.hint}>Les e-mails liés au compte ne sont pas activés pour le moment.</p>
    );
  return user.emailVerifiedAt ? (
    <p className={styles.hint}>Adresse e-mail confirmée.</p>
  ) : (
    <div className={styles.notice}>
      <p>Confirmez votre adresse e-mail pour recevoir les nouvelles de vos demandes.</p>
      <button className={styles.secondary} onClick={() => void resend()} disabled={pending}>
        {pending ? 'Envoi…' : 'Recevoir le lien de confirmation'}
      </button>
      {message && <p role="status">{message}</p>}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
function Profile({ user }: { user: CustomerUser }) {
  const { refresh } = useCustomer();
  const router = useRouter();
  const [pending, setPending] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deleting, setDeleting] = useState(false);
  async function submit(
    event: FormEvent<HTMLFormElement>,
    action: 'profile' | 'password' | 'delete',
  ) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    if (action === 'password' && fields.get('newPassword') !== fields.get('confirmPassword')) {
      setError('Les deux nouveaux mots de passe doivent être identiques.');
      return;
    }
    setPending(action);
    setError('');
    setSuccess('');
    try {
      if (action === 'profile') {
        await customerFetch('profile', {
          method: 'PATCH',
          body: JSON.stringify({ displayName: String(fields.get('displayName') || '').trim() }),
        });
        await refresh();
        setSuccess('Votre nom a été mis à jour.');
      } else {
        await customerFetch(action === 'password' ? 'auth/password' : 'profile', {
          method: action === 'password' ? 'POST' : 'DELETE',
          body: JSON.stringify(
            action === 'password'
              ? {
                  currentPassword: fields.get('currentPassword'),
                  newPassword: fields.get('newPassword'),
                }
              : { password: fields.get('deletePassword') },
          ),
        });
        notifyCustomerChange();
        await refresh();
        router.replace('/compte/connexion');
      }
      form.reset();
    } catch (error) {
      setError(customerError(error));
    } finally {
      setPending('');
    }
  }
  return (
    <section aria-labelledby="profile-title">
      <h2 className={styles.formTitle} id="profile-title">
        Mon profil
      </h2>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className={styles.success} role="status">
          {success}
        </p>
      )}
      <section className={styles.panel} aria-labelledby="profile-info">
        <h2 id="profile-info">Mes informations</h2>
        <p className={styles.description}>Adresse e-mail : {user.email}</p>
        <EmailVerification user={user} />
        <p className={styles.hint}>
          Membre depuis le{' '}
          {new Date(user.createdAt).toLocaleDateString('fr-SN', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </p>
        <form className={styles.form} onSubmit={(event) => void submit(event, 'profile')}>
          <div className={styles.field}>
            <label htmlFor="profileName">Votre nom</label>
            <input
              className={styles.input}
              id="profileName"
              name="displayName"
              required
              minLength={2}
              maxLength={100}
              autoComplete="name"
              defaultValue={user.displayName}
            />
          </div>
          <button className={styles.primary} disabled={Boolean(pending)}>
            {pending === 'profile' ? 'Enregistrement…' : 'Enregistrer mon nom'}
          </button>
        </form>
      </section>
      <section className={styles.panel} aria-labelledby="security-title">
        <h2 id="security-title">Mon mot de passe</h2>
        <p className={styles.description}>
          Le changement de mot de passe ferme toutes vos sessions. Vous pourrez ensuite vous
          reconnecter.
        </p>
        <form className={styles.form} onSubmit={(event) => void submit(event, 'password')}>
          <PasswordField
            id="currentPassword"
            label="Mot de passe actuel"
            autoComplete="current-password"
            minimum={1}
            hint={false}
          />
          <PasswordField id="newPassword" label="Nouveau mot de passe" />
          <PasswordField
            id="confirmPassword"
            label="Confirmer le nouveau mot de passe"
            hint={false}
          />
          <button className={styles.primary} disabled={Boolean(pending)}>
            {pending === 'password' ? 'Modification…' : 'Changer mon mot de passe'}
          </button>
        </form>
      </section>
      <section className={styles.panel} aria-labelledby="delete-title">
        <h2 id="delete-title">Supprimer mon compte</h2>
        <p className={styles.description}>
          La suppression retire votre profil, vos favoris, votre historique et vos demandes
          enregistrées de votre espace. Cette action est définitive.
        </p>
        {!deleting ? (
          <button className={styles.danger} onClick={() => setDeleting(true)}>
            Supprimer mon compte
          </button>
        ) : (
          <form className={styles.form} onSubmit={(event) => void submit(event, 'delete')}>
            <PasswordField
              id="deletePassword"
              label="Votre mot de passe"
              autoComplete="current-password"
              minimum={1}
              hint={false}
            />
            <label className={styles.checkbox}>
              <input type="checkbox" required />
              Je confirme la suppression définitive de mon compte.
            </label>
            <div className={styles.actions}>
              <button className={styles.danger} disabled={Boolean(pending)}>
                {pending === 'delete' ? 'Suppression…' : 'Confirmer la suppression'}
              </button>
              <button
                className={styles.secondary}
                type="button"
                onClick={() => setDeleting(false)}
                disabled={Boolean(pending)}
              >
                Annuler
              </button>
            </div>
          </form>
        )}
      </section>
    </section>
  );
}
const tabs = [
  { id: 'favorites', label: 'Mes favoris' },
  { id: 'history', label: 'Mon historique' },
  { id: 'requests', label: 'Mes demandes WhatsApp' },
  { id: 'profile', label: 'Mon profil' },
] as const;
export function AccountDashboard() {
  const router = useRouter();
  const { user, status, error, refresh, logout } = useCustomer();
  const [tab, setTab] = useState<(typeof tabs)[number]['id']>('favorites');
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  async function signOut() {
    setLoggingOut(true);
    setLogoutError('');
    try {
      await logout();
      router.replace('/compte/connexion');
    } catch (error) {
      setLogoutError(customerError(error));
    } finally {
      setLoggingOut(false);
    }
  }
  return (
    <div className={styles.root}>
      {status === 'loading' ? (
        <section className={styles.panel}>
          <h1 className={styles.formTitle}>Mon espace Gaindé</h1>
          <p role="status">Ouverture de votre espace…</p>
        </section>
      ) : !user ? (
        <section className={styles.panel}>
          <p className={styles.eyebrow}>Votre espace Gaindé</p>
          <h1 className={styles.title}>
            Tout ce qui vous plaît,
            <br />
            au même endroit.
          </h1>
          <p className={styles.description}>
            Connectez-vous pour retrouver vos favoris, vos découvertes et vos demandes WhatsApp.
          </p>
          {status === 'error' && <ResourceError message={error} retry={() => void refresh()} />}
          <div className={styles.actions} style={{ marginTop: 24 }}>
            <Link className={styles.primary} href="/compte/connexion">
              Me connecter
            </Link>
            <Link className={styles.secondary} href="/compte/inscription">
              Créer mon compte
            </Link>
          </div>
        </section>
      ) : (
        <>
          <header className={styles.header}>
            <div>
              <p className={styles.eyebrow}>Votre espace Gaindé</p>
              <h1 className={styles.title}>Bonjour, {user.displayName}</h1>
              <p className={styles.description}>Vos coups de cœur et vos prochaines découvertes.</p>
            </div>
            <button
              className={styles.secondary}
              onClick={() => void signOut()}
              disabled={loggingOut}
            >
              <LogOut size={17} aria-hidden="true" />
              {loggingOut ? 'Déconnexion…' : 'Se déconnecter'}
            </button>
          </header>
          {logoutError && (
            <p className={styles.error} role="alert">
              {logoutError}
            </p>
          )}
          <nav className={styles.tabs} aria-label="Mon compte">
            {tabs.map((item) => (
              <button
                className={styles.tab}
                key={item.id}
                onClick={() => setTab(item.id)}
                aria-pressed={tab === item.id}
              >
                {item.label}
              </button>
            ))}
          </nav>
          <div key={`${user.id}:${tab}`}>
            {tab === 'favorites' ? (
              <Wishlist userId={user.id} />
            ) : tab === 'history' ? (
              <BrowsingHistory userId={user.id} />
            ) : tab === 'requests' ? (
              <WhatsappRequests userId={user.id} />
            ) : (
              <Profile user={user} />
            )}
          </div>
        </>
      )}
    </div>
  );
}
