'use client';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import Link from 'next/link';
import { ArrowRight, Heart, Trash2 } from 'lucide-react';
import {
  catalogueCategoryLabel,
  formatXof,
  publicProductSchema,
  type PublicProduct,
} from '@/lib/catalogue';
import { CatalogueImage } from './catalogue/catalogue-image';
import { Dialog } from './dialog';
import { SearchDrawer } from './search-drawer';
import styles from './catalogue/favorites.module.css';

type SavedProduct = Pick<PublicProduct, 'id' | 'slug'>;
type Modal = 'search' | 'selection' | null;
type Store = {
  saved: SavedProduct[];
  toggleSaved: (product: PublicProduct) => void;
  openSearch: (initialQuery?: string) => void;
  searchOpen: boolean;
  openSelection: () => void;
};
const selectionKey = 'gainde-selection-v2';
const maxSaved = 24;
const Context = createContext<Store | null>(null);
export function useStore() {
  const ctx = useContext(Context);
  if (!ctx) throw new Error('StoreProvider manquant');
  return ctx;
}

function readSaved(): SavedProduct[] {
  try {
    // Les anciennes références éditoriales ne correspondent pas aux publications de la boutique.
    localStorage.removeItem('gainde-selection-v1');
    const stored: unknown = JSON.parse(localStorage.getItem(selectionKey) || '[]');
    if (!Array.isArray(stored)) return [];
    const seen = new Set<string>();
    return stored
      .filter((value): value is SavedProduct => {
        if (!value || typeof value !== 'object') return false;
        const reference = value as Partial<SavedProduct>;
        if (
          typeof reference.id !== 'string' ||
          !reference.id ||
          reference.id.length > 200 ||
          typeof reference.slug !== 'string' ||
          reference.slug.length > 220 ||
          !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(reference.slug) ||
          seen.has(reference.id)
        )
          return false;
        seen.add(reference.id);
        return true;
      })
      .slice(0, maxSaved)
      .map(({ id, slug }) => ({ id, slug }));
  } catch {
    return [];
  }
}

function persistSaved(references: SavedProduct[]) {
  try {
    localStorage.setItem(selectionKey, JSON.stringify(references));
  } catch {
    // Le stockage est facultatif ; la sélection reste utilisable en mémoire.
  }
}

type SelectionResource =
  | { key: string; state: 'loading' | 'error' }
  | { key: string; state: 'ready'; items: PublicProduct[] };

function PublishedSelection({
  references,
  removeMissing,
  remove,
  onClose,
}: {
  references: SavedProduct[];
  removeMissing: (ids: string[]) => void;
  remove: (id: string) => void;
  onClose: () => void;
}) {
  const [resource, setResource] = useState<SelectionResource>({ key: '', state: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const referencesKey = JSON.stringify(references);
  // Chaque ouverture remonte ce composant : aucun ancien prix ou produit en mémoire n'est affiché.
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    async function load() {
      const missingIds: string[] = [];
      const items = await Promise.all(
        references.map(async (reference) => {
          const response = await fetch(`/api/catalogue/${encodeURIComponent(reference.slug)}`, {
            cache: 'no-store',
            headers: { Accept: 'application/json' },
            signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
          });
          if (response.status === 404) {
            missingIds.push(reference.id);
            return null;
          }
          if (!response.ok) throw new Error('Catalogue inaccessible');
          const value: unknown = await response.json();
          const product = publicProductSchema.parse(value);
          if (product.id !== reference.id) {
            missingIds.push(reference.id);
            return null;
          }
          return product;
        }),
      );
      if (!active) return;
      if (missingIds.length) removeMissing(missingIds);
      setResource({
        key: referencesKey,
        state: 'ready',
        items: items.filter((item): item is PublicProduct => !!item),
      });
    }
    void load().catch(() => {
      if (active) setResource({ key: referencesKey, state: 'error' });
    });
    return () => {
      active = false;
      controller.abort();
    };
  }, [references, referencesKey, removeMissing, attempt]);
  const current =
    resource.key === referencesKey ? resource : { key: referencesKey, state: 'loading' as const };
  return (
    <>
      <h2>Vos coups de cœur.</h2>
      <p className={styles.note}>Votre sélection est conservée sur cet appareil uniquement.</p>
      {references.length > 0 && current.state === 'loading' && (
        <p className={styles.state} role="status">
          Vérification des produits…
        </p>
      )}
      {references.length > 0 && current.state === 'error' && (
        <div className={styles.state} role="status">
          <p>
            Votre sélection est momentanément inaccessible. Vérifiez votre connexion puis réessayez.
          </p>
          <button
            type="button"
            className="button button-outline"
            onClick={() => {
              setResource({ key: referencesKey, state: 'loading' });
              setAttempt((value) => value + 1);
            }}
          >
            Réessayer
          </button>
        </div>
      )}
      {references.length > 0 && current.state === 'ready' && (
        <div className={styles.list}>
          {current.items.map((product) => {
            const image = [...product.media]
              .sort((a, b) => a.position - b.position)
              .find((media) => media.type === 'image')!;
            return (
              <div key={product.id} className={styles.item} data-testid="saved-product">
                <Link
                  className={styles.productLink}
                  href={`/boutique/${product.slug}`}
                  onClick={onClose}
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
                  onClick={() => remove(product.id)}
                  aria-label={`Retirer ${product.name} de ma sélection`}
                >
                  <Trash2 size={18} aria-hidden="true" />
                </button>
              </div>
            );
          })}
        </div>
      )}
      {!references.length && (
        <div className="empty-state">
          <Heart size={34} strokeWidth={1.3} aria-hidden="true" />
          <h3>Votre sélection est vide.</h3>
          <p>Touchez le cœur d’un produit pour le retrouver ici.</p>
        </div>
      )}
      <div className={styles.bottom}>
        <Link href="/boutique" className="button button-dark" onClick={onClose}>
          Voir la boutique <ArrowRight size={18} aria-hidden="true" />
        </Link>
        <p className={styles.note}>
          Pour commander, ouvrez la fiche du produit et contactez l’équipe sur WhatsApp.
        </p>
      </div>
    </>
  );
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [saved, setSaved] = useState<SavedProduct[]>([]);
  const savedRef = useRef<SavedProduct[]>([]);
  const [modal, setModal] = useState<Modal>(null);
  const [query, setQuery] = useState('');
  const [announcement, setAnnouncement] = useState('');
  useEffect(() => {
    const references = readSaved();
    queueMicrotask(() => {
      savedRef.current = references;
      setSaved(references);
      persistSaved(references);
    });
  }, []);
  function replaceSaved(next: SavedProduct[]) {
    savedRef.current = next;
    setSaved(next);
    persistSaved(next);
  }
  // Référence stable : une réponse API ne doit pas relancer son propre chargement.
  const removeMissing = useCallback((ids: string[]) => {
    const next = savedRef.current.filter((reference) => !ids.includes(reference.id));
    savedRef.current = next;
    setSaved(next);
    persistSaved(next);
    setAnnouncement('Un produit retiré de la boutique a été retiré de votre sélection.');
  }, []);
  function remove(id: string) {
    replaceSaved(savedRef.current.filter((reference) => reference.id !== id));
    setAnnouncement('Retiré de votre sélection.');
  }
  function toggleSaved(product: PublicProduct) {
    if (savedRef.current.some((reference) => reference.id === product.id))
      return remove(product.id);
    if (savedRef.current.length >= maxSaved) {
      setAnnouncement(
        `Votre sélection peut contenir ${maxSaved} produits. Retirez une pièce avant d’en ajouter une autre.`,
      );
      return;
    }
    replaceSaved([...savedRef.current, { id: product.id, slug: product.slug }]);
    setAnnouncement('Ajouté à votre sélection.');
  }
  const close = () => setModal(null);
  return (
    <Context.Provider
      value={{
        saved,
        toggleSaved,
        searchOpen: modal === 'search',
        openSearch: (initialQuery = '') => {
          setQuery(initialQuery);
          setModal('search');
        },
        openSelection: () => setModal('selection'),
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
          <PublishedSelection
            references={saved}
            removeMissing={removeMissing}
            remove={remove}
            onClose={close}
          />
        )}
      </Dialog>
    </Context.Provider>
  );
}
