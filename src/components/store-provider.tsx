'use client';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowRight, Heart, Trash2 } from 'lucide-react';
import {
  catalogueCategoryLabel,
  formatXof,
  publicProductSchema,
  type PublicProduct,
} from '@/lib/catalogue';
import { customerFetch, customerError } from '@/lib/customer-client';
import { useCustomer } from './account/customer-provider';
import { CatalogueImage } from './catalogue/catalogue-image';
import { Dialog } from './dialog';
import { SearchDrawer } from './search-drawer';
import styles from './catalogue/favorites.module.css';

type Modal = 'search' | 'selection' | null;
type Store = {
  saved: Pick<PublicProduct, 'id' | 'slug'>[];
  toggleSaved: (product: PublicProduct) => void;
  saving: string[];
  accountLoading: boolean;
  openSearch: (initialQuery?: string) => void;
  searchOpen: boolean;
  openSelection: () => void;
};
const Context = createContext<Store | null>(null);
const legacyKey = 'gainde-selection-v2';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function useStore() {
  const value = useContext(Context);
  if (!value) throw new Error('StoreProvider manquant');
  return value;
}
function legacyIds(): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(legacyKey) || '[]');
    if (!Array.isArray(value)) return [];
    return [
      ...new Set(
        value.flatMap((item) =>
          typeof item?.id === 'string' && uuid.test(item.id) ? [item.id] : [],
        ),
      ),
    ].slice(0, 100);
  } catch {
    return [];
  }
}
type Selection = {
  owner: string;
  items: PublicProduct[];
  state: 'loading' | 'ready' | 'error';
  error?: string;
};

export function StoreProvider({ children }: { children: ReactNode }) {
  const { user, status } = useCustomer();
  const router = useRouter();
  const pathname = usePathname();
  const owner = status === 'authenticated' && user ? user.id : '';
  const identity = useRef(owner);
  useLayoutEffect(() => {
    identity.current = owner;
  }, [owner]);
  const generation = useRef(0);
  const [selection, setSelection] = useState<Selection>({ owner: '', items: [], state: 'loading' });
  const [busy, setBusy] = useState<{ owner: string; ids: string[] }>({ owner: '', ids: [] });
  const locks = useRef(new Set<string>());
  const [legacy, setLegacy] = useState<string[]>([]);
  const [modal, setModal] = useState<Modal>(null);
  const [query, setQuery] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const current =
    selection.owner === owner && owner
      ? selection
      : { owner, items: [], state: 'loading' as const };
  const saved = current.items.map(({ id, slug }) => ({ id, slug }));
  const refresh = useCallback(async () => {
    const account = identity.current;
    if (!account) return;
    const request = ++generation.current;
    setSelection({ owner: account, items: [], state: 'loading' });
    try {
      const result = await customerFetch<{ items: unknown[] }>('wishlist');
      const items = result.items.map((item) => publicProductSchema.parse(item));
      if (identity.current === account && request === generation.current)
        setSelection({ owner: account, items, state: 'ready' });
    } catch (error) {
      if (identity.current === account && request === generation.current)
        setSelection({ owner: account, items: [], state: 'error', error: customerError(error) });
    }
  }, []);
  useEffect(() => {
    queueMicrotask(() => setLegacy(legacyIds()));
    const clear = () => {
      identity.current = '';
      generation.current++;
      locks.current.clear();
      setSelection({ owner: '', items: [], state: 'loading' });
      setBusy({ owner: '', ids: [] });
      setAnnouncement('');
    };
    const changed = () => {
      void refresh();
    };
    window.addEventListener('gainde-customer-private-cleared', clear);
    window.addEventListener('gainde-customer-wishlist-changed', changed);
    return () => {
      window.removeEventListener('gainde-customer-private-cleared', clear);
      window.removeEventListener('gainde-customer-wishlist-changed', changed);
    };
  }, [refresh]);
  useEffect(() => {
    generation.current++;
    if (!owner) return;
    let active = true;
    const authenticationPage = [
      '/compte/connexion',
      '/compte/inscription',
      '/compte/recuperation',
      '/compte/reinitialiser',
      '/compte/confirmer-email',
    ].includes(pathname);
    const id = authenticationPage
      ? null
      : new URLSearchParams(window.location.search).get('favorite');
    void (async () => {
      if (id && uuid.test(id)) {
        try {
          await customerFetch(`wishlist/${id}`, { method: 'PUT' });
          if (active && identity.current === owner) setAnnouncement('Ajouté à votre sélection.');
        } catch (error) {
          if (active && identity.current === owner) setAnnouncement(customerError(error));
        }
        if (active && identity.current === owner) {
          const url = new URL(window.location.href);
          url.searchParams.delete('favorite');
          window.history.replaceState(
            window.history.state,
            '',
            url.pathname + url.search + url.hash,
          );
        }
      }
      if (active && identity.current === owner) await refresh();
    })();
    return () => {
      active = false;
    };
  }, [owner, pathname, refresh]);
  function requireAccount(product?: PublicProduct) {
    setModal(null);
    const params = new URLSearchParams({ next: window.location.pathname + window.location.search });
    if (product) params.set('favorite', product.id);
    router.push(`/compte/connexion?${params.toString()}`);
  }
  async function change(product: PublicProduct, remove = false) {
    if (!owner) {
      requireAccount(product);
      return;
    }
    const account = owner;
    const lock = `${account}:${product.id}`;
    if (locks.current.has(lock)) return;
    locks.current.add(lock);
    setBusy((prev) => ({
      owner: account,
      ids: [...(prev.owner === account ? prev.ids : []), product.id],
    }));
    const selected = remove || current.items.some((item) => item.id === product.id);
    try {
      await customerFetch(`wishlist/${product.id}`, { method: selected ? 'DELETE' : 'PUT' });
      if (identity.current !== account) return;
      setAnnouncement(selected ? 'Retiré de votre sélection.' : 'Ajouté à votre sélection.');
      window.dispatchEvent(new Event('gainde-customer-wishlist-changed'));
      await refresh();
    } catch (error) {
      if (identity.current === account) setAnnouncement(customerError(error));
    } finally {
      locks.current.delete(lock);
      if (identity.current === account)
        setBusy((prev) => ({ owner: account, ids: prev.ids.filter((id) => id !== product.id) }));
    }
  }
  async function importLegacy() {
    const account = owner;
    if (!account) return;
    try {
      await customerFetch('wishlist/merge', {
        method: 'POST',
        body: JSON.stringify({ productIds: legacy }),
      });
      if (identity.current !== account) return;
      localStorage.removeItem(legacyKey);
      setLegacy([]);
      setAnnouncement('Votre ancienne sélection a été récupérée dans ce compte.');
      window.dispatchEvent(new Event('gainde-customer-wishlist-changed'));
      await refresh();
    } catch (error) {
      if (identity.current === account) setAnnouncement(customerError(error));
    }
  }
  const close = () => setModal(null);
  return (
    <Context.Provider
      value={{
        saved,
        toggleSaved: (product) => {
          void change(product);
        },
        saving: busy.owner === owner ? busy.ids : [],
        accountLoading: status === 'loading',
        searchOpen: modal === 'search',
        openSearch: (initialQuery = '') => {
          setQuery(initialQuery);
          setModal('search');
        },
        openSelection: () => {
          setModal('selection');
          if (owner) void refresh();
        },
      }}
    >
      {children}
      <span className="sr-only" role="status" aria-live="polite">
        {announcement}
      </span>
      <SearchDrawer open={modal === 'search'} onClose={close} initialQuery={query} />
      <Dialog
        open={modal === 'selection'}
        onClose={close}
        title={`Ma sélection · ${saved.length}`}
        className="drawer-dialog"
      >
        {modal === 'selection' && (
          <>
            <h2>Vos coups de cœur.</h2>
            {!owner ? (
              <div className={styles.state}>
                <Heart size={34} strokeWidth={1.3} aria-hidden="true" />
                <p>
                  Connectez-vous pour enregistrer votre liste d’envies et la retrouver sur vos
                  appareils.
                </p>
                <Link
                  href="/compte/connexion?next=/compte"
                  className="button button-dark"
                  onClick={close}
                >
                  Me connecter
                </Link>
                <Link href="/compte/inscription" className={styles.note} onClick={close}>
                  Créer mon compte
                </Link>
                {status === 'error' && (
                  <p role="status">
                    Le compte est momentanément inaccessible. Réessayez depuis votre espace client.
                  </p>
                )}
              </div>
            ) : (
              <>
                <p className={styles.note}>
                  Votre sélection est enregistrée dans votre compte. Les prix et disponibilités sont
                  vérifiés à chaque ouverture.
                </p>
                {legacy.length > 0 && (
                  <div className={styles.state}>
                    <p>
                      Une ancienne sélection existe sur cet appareil. Récupérez-la uniquement si
                      elle vous appartient.
                    </p>
                    <button
                      type="button"
                      className="button button-outline"
                      onClick={() => {
                        void importLegacy();
                      }}
                    >
                      Récupérer mon ancienne sélection
                    </button>
                  </div>
                )}
                {current.state === 'loading' && (
                  <p role="status" className={styles.state}>
                    Chargement de votre sélection…
                  </p>
                )}
                {current.state === 'error' && (
                  <div className={styles.state} role="alert">
                    <p>{current.error}</p>
                    <button
                      className="button button-outline"
                      onClick={() => {
                        void refresh();
                      }}
                    >
                      Réessayer
                    </button>
                  </div>
                )}
                {current.state === 'ready' && !current.items.length && (
                  <div className="empty-state">
                    <Heart size={34} aria-hidden="true" />
                    <h3>Votre sélection est vide.</h3>
                    <p>Touchez le cœur d’un produit pour le retrouver ici.</p>
                  </div>
                )}
                {current.state === 'ready' && (
                  <div className={styles.list}>
                    {current.items.map((product) => {
                      const image = product.media.find((item) => item.type === 'image')!;
                      return (
                        <div key={product.id} className={styles.item} data-testid="saved-product">
                          <Link
                            className={styles.productLink}
                            href={`/boutique/${product.slug}`}
                            onClick={close}
                          >
                            <span className={styles.image}>
                              <CatalogueImage media={{ ...image, alt: '' }} sizes="80px" />
                            </span>
                            <span className={styles.details}>
                              <small>{catalogueCategoryLabel(product.category)}</small>
                              <strong>{product.name}</strong>
                              <span>{formatXof(product.priceXof)}</span>
                            </span>
                          </Link>
                          <button
                            type="button"
                            className={styles.removeButton}
                            disabled={busy.owner === owner && busy.ids.includes(product.id)}
                            onClick={() => {
                              void change(product, true);
                            }}
                            aria-label={`Retirer ${product.name} de ma sélection`}
                          >
                            <Trash2 size={18} aria-hidden="true" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
                <Link href="/compte" className={styles.note} onClick={close}>
                  Voir mon espace client
                </Link>
              </>
            )}
            <div className={styles.bottom}>
              <Link href="/boutique" className="button button-dark" onClick={close}>
                Voir la boutique <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <p className={styles.note}>
                Pour commander, ouvrez la fiche du produit et contactez l’équipe sur WhatsApp.
              </p>
            </div>
          </>
        )}
      </Dialog>
    </Context.Provider>
  );
}
