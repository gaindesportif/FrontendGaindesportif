'use client';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight, Heart, Search, Trash2, ArrowRight, Check } from 'lucide-react';
import { collections, filterCollections, type CollectionItem } from '@/lib/collections';
import { Dialog } from './dialog';

type Modal = 'search' | 'selection' | 'product' | null;
type Store = {
  saved: string[];
  toggle: (id: string) => void;
  openSearch: () => void;
  openSelection: () => void;
  preview: (item: CollectionItem) => void;
};
const Context = createContext<Store | null>(null);
export function useStore() {
  const ctx = useContext(Context);
  if (!ctx) throw new Error('StoreProvider manquant');
  return ctx;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [saved, setSaved] = useState<string[]>([]);
  const [modal, setModal] = useState<Modal>(null);
  const [item, setItem] = useState<CollectionItem | null>(null);
  const [query, setQuery] = useState('');
  const [activeImage, setActiveImage] = useState(0);
  const [announcement, setAnnouncement] = useState('');
  useEffect(() => {
    try {
      const stored: unknown = JSON.parse(localStorage.getItem('gainde-selection-v1') || '[]');
      if (Array.isArray(stored)) {
        const ids = stored.filter(
          (id): id is string => typeof id === 'string' && collections.some((i) => i.id === id),
        );
        // Restauration d'une préférence locale, jamais une donnée serveur.
        queueMicrotask(() => setSaved([...new Set(ids)]));
      }
    } catch {
      /* Navigation privée : la sélection reste utilisable en mémoire. */
    }
  }, []);
  function toggle(id: string) {
    const next = saved.includes(id) ? saved.filter((s) => s !== id) : [...saved, id];
    setSaved(next);
    try {
      localStorage.setItem('gainde-selection-v1', JSON.stringify(next));
    } catch {
      /* Stockage facultatif. */
    }
    setAnnouncement(next.includes(id) ? 'Ajouté à votre sélection.' : 'Retiré de votre sélection.');
  }
  function preview(product: CollectionItem) {
    setItem(product);
    setActiveImage(0);
    setModal('product');
  }
  const close = () => setModal(null);
  const results = filterCollections('all', query);
  return (
    <Context.Provider
      value={{
        saved,
        toggle,
        openSearch: () => {
          setQuery('');
          setModal('search');
        },
        openSelection: () => setModal('selection'),
        preview,
      }}
    >
      {children}
      <span className="sr-only" role="status" aria-live="polite">
        {announcement}
      </span>
      <Dialog
        open={modal === 'search'}
        onClose={close}
        title="À la recherche de votre style ?"
        className="search-dialog"
      >
        <h2>Trouvez votre Gaindé.</h2>
        <div className="search-field">
          <Search size={22} />
          <input
            autoFocus
            aria-label="Rechercher une collection"
            placeholder="Sénégal, Dakar, accessoires…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <span>{results.length}</span>
        </div>
        <p className="small muted">
          Explorez notre sélection visuelle. Les prix et disponibilités sont à confirmer avec
          l’équipe.
        </p>
        <div className="search-results">
          {results.map((p) => (
            <button key={p.id} className="search-result" onClick={() => preview(p)}>
              <Image src={p.image} alt="" width={70} height={85} />
              <span>
                <small>{p.categoryLabel}</small>
                <strong>{p.name}</strong>
              </span>
              <ArrowUpRight size={20} />
            </button>
          ))}
          {!results.length && (
            <div className="empty-state">
              <Search size={30} />
              <h3>Aucun résultat pour « {query} ».</h3>
              <p>Essayez « Dakar » ou « Sénégal ».</p>
              <button className="text-link" onClick={() => setQuery('')}>
                Voir toute la sélection <ArrowRight size={18} />
              </button>
            </div>
          )}
        </div>
      </Dialog>
      <Dialog
        open={modal === 'selection'}
        onClose={close}
        title={`Ma sélection · ${saved.length}`}
        className="drawer-dialog"
      >
        <h2>Vos coups de cœur.</h2>
        <p className="muted">Gardez vos inspirations ici. Ce n’est pas un panier de commande.</p>
        <div className="selection-list">
          {saved.map((id) => {
            const p = collections.find((p) => p.id === id)!;
            return (
              <div key={id} className="selection-item">
                <button className="selection-preview" onClick={() => preview(p)}>
                  <Image src={p.image} alt="" width={90} height={108} />
                  <span>
                    <small>{p.categoryLabel}</small>
                    <strong>{p.name}</strong>
                  </span>
                </button>
                <button
                  className="icon-button"
                  onClick={() => toggle(id)}
                  aria-label={`Retirer ${p.name}`}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            );
          })}
        </div>
        {!saved.length ? (
          <div className="empty-state">
            <Heart size={34} strokeWidth={1.3} />
            <h3>Votre histoire commence ici.</h3>
            <p>Touchez le cœur d’une pièce pour la retrouver dans votre sélection.</p>
            <Link href="/collections" className="button button-dark" onClick={close}>
              Découvrir les collections <ArrowRight size={18} />
            </Link>
          </div>
        ) : (
          <div className="drawer-bottom">
            <Link
              href={`/contact?subject=collection&selection=${encodeURIComponent(saved.map((id) => collections.find((p) => p.id === id)!.name).join(' / '))}`}
              onClick={close}
              className="button button-dark"
            >
              Parlons de votre sélection <ArrowUpRight size={18} />
            </Link>
            <p className="small muted">
              Votre sélection est conservée sur cet appareil uniquement.
            </p>
          </div>
        )}
      </Dialog>
      <Dialog
        open={modal === 'product' && !!item}
        onClose={close}
        title="Un regard de plus"
        className="product-dialog"
      >
        {item && (
          <div className="quick-view">
            <div className="quick-image">
              <Image
                src={activeImage === 0 ? item.image : item.alternate}
                alt={activeImage === 0 ? item.imageAlt : `Autre visuel de ${item.categoryLabel}`}
                width={720}
                height={900}
              />
              <div className="image-switch">
                <button
                  className={activeImage === 0 ? 'active' : ''}
                  onClick={() => setActiveImage(0)}
                  aria-label="Voir le premier visuel"
                  aria-pressed={activeImage === 0}
                >
                  01
                </button>
                <button
                  className={activeImage === 1 ? 'active' : ''}
                  onClick={() => setActiveImage(1)}
                  aria-label="Voir le second visuel"
                  aria-pressed={activeImage === 1}
                >
                  02
                </button>
              </div>
            </div>
            <div className="quick-content">
              <span className="eyebrow">{item.categoryLabel}</span>
              <h2>{item.name}</h2>
              <p>{item.description}</p>
              <div className="swatches" aria-label="Couleurs visibles dans la collection">
                {item.colors.map((c) => (
                  <span key={c} style={{ background: c }} />
                ))}
              </div>
              <div className="preview-note">
                <span className="status-dot" />
                <p>
                  Aperçu de collection
                  <br />
                  <small>Prix, tailles et disponibilités à confirmer avec l’équipe.</small>
                </p>
              </div>
              <Link
                className="button button-dark"
                href={`/contact?subject=collection&selection=${encodeURIComponent(item.name)}`}
                onClick={close}
              >
                Me renseigner sur cette pièce <ArrowUpRight size={18} />
              </Link>
              <button className="button button-outline" onClick={() => toggle(item.id)}>
                {saved.includes(item.id) ? <Check size={18} /> : <Heart size={18} />}
                {saved.includes(item.id) ? 'Retirer de ma sélection' : 'Garder dans ma sélection'}
              </button>
              <p className="small muted">Aucun achat ni paiement à cette étape.</p>
            </div>
          </div>
        )}
      </Dialog>
    </Context.Provider>
  );
}
