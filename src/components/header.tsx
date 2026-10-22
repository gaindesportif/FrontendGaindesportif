'use client';
import { useCategories } from '@/components/catalogue/categories-provider';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { ArrowUpRight, ChevronDown, Heart, Menu, Search, UserRound, X } from 'lucide-react';
import { useStore } from './store-provider';
import { Dialog } from './dialog';
import { CollectionsMenuContent } from './collections-menu';
import styles from './collections-menu.module.css';

export function Header() {
  const { categories } = useCategories();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const store = useStore();
  const pathname = usePathname();
  const megaRef = useRef<HTMLDivElement>(null);
  const collectionsTrigger = useRef<HTMLButtonElement>(null);
  const openedByHover = useRef(false);
  useEffect(() => {
    function handle(e: KeyboardEvent) {
      if (e.key !== 'Escape' || !menuOpen) return;
      setMenuOpen(false);
      if (megaRef.current?.contains(document.activeElement)) collectionsTrigger.current?.focus();
    }
    function outside(e: MouseEvent) {
      // Une action interne peut retirer son propre bouton avant cet écouteur.
      if (!megaRef.current || !e.composedPath().includes(megaRef.current)) setMenuOpen(false);
    }
    document.addEventListener('keydown', handle);
    document.addEventListener('click', outside);
    return () => {
      document.removeEventListener('keydown', handle);
      document.removeEventListener('click', outside);
    };
  }, [menuOpen]);
  const close = () => {
    setMenuOpen(false);
    setMobileOpen(false);
  };
  return (
    <>
      <div className="announcement">
        <span>La fierté se porte. Au Sénégal et au-delà.</span>
        <span className="flag" role="img" aria-label="Sénégal">
          <i />
          <i />
          <i />
        </span>
        <Link href="/contact">
          Un projet d’équipe ? Parlons-en <ArrowUpRight size={13} />
        </Link>
      </div>
      <header className="site-header">
        <Link className="brand" href="/" aria-label="Gaindé Sportif — accueil" onClick={close}>
          <Image src="/images/logo.webp" width={52} height={52} alt="" priority />
          <span>
            GAINDÉ<small>SPORTIF</small>
          </span>
        </Link>
        <nav className="desktop-nav" aria-label="Navigation principale">
          <Link
            href="/boutique"
            className={`nav-link ${pathname.startsWith('/boutique') ? 'current' : ''}`}
            onClick={close}
          >
            La boutique
          </Link>
          <div
            className="mega-anchor"
            ref={megaRef}
            onMouseEnter={() => {
              if (!menuOpen) openedByHover.current = true;
              setMenuOpen(true);
            }}
            onMouseLeave={() => {
              if (!megaRef.current?.contains(document.activeElement)) setMenuOpen(false);
            }}
            onBlur={(event) => {
              if (event.relatedTarget) {
                if (!event.currentTarget.contains(event.relatedTarget)) setMenuOpen(false);
                return;
              }
              // Le bouton Réessayer disparaît pendant le chargement. Garder le menu
              // ouvert si le pointeur est encore dedans malgré la perte de focus.
              requestAnimationFrame(() => {
                const anchor = megaRef.current;
                if (!anchor?.contains(document.activeElement) && !anchor?.matches(':hover'))
                  setMenuOpen(false);
              });
            }}
          >
            <button
              ref={collectionsTrigger}
              className="nav-link"
              aria-expanded={menuOpen}
              aria-controls="collections-menu"
              onClick={(event) => {
                // A pointer click following hover keeps the freshly opened panel visible.
                if (event.detail > 0 && openedByHover.current) {
                  openedByHover.current = false;
                  return;
                }
                openedByHover.current = false;
                setMenuOpen(!menuOpen);
              }}
              onKeyDown={(event) => {
                if (event.key !== 'ArrowDown') return;
                event.preventDefault();
                setMenuOpen(true);
                requestAnimationFrame(() => {
                  megaRef.current?.querySelector<HTMLElement>('#collections-menu a')?.focus();
                });
              }}
            >
              Les collections <ChevronDown size={14} className={menuOpen ? 'rotated' : ''} />
            </button>
            {menuOpen && <CollectionsMenuContent onNavigate={close} />}
          </div>
          <Link
            href="/a-propos"
            className={`nav-link ${pathname === '/a-propos' ? 'current' : ''}`}
            onClick={close}
          >
            L’esprit Gaindé
          </Link>
          <Link href="/contact?subject=personnalisation" className="nav-link" onClick={close}>
            Votre équipe
          </Link>
        </nav>
        <div className="header-actions">
          <button
            className="icon-button"
            aria-label="Rechercher"
            aria-haspopup="dialog"
            aria-controls="product-search-dialog"
            aria-expanded={store.searchOpen}
            onClick={() => {
              close();
              store.openSearch(
                pathname === '/boutique'
                  ? new URLSearchParams(window.location.search).get('q') || ''
                  : '',
              );
            }}
          >
            <Search size={21} strokeWidth={1.6} />
          </button>
          <button
            className="icon-button selection-trigger"
            aria-label={`Ma sélection, ${store.saved.length} pièces`}
            onClick={() => {
              close();
              store.openSelection();
            }}
          >
            <Heart size={21} strokeWidth={1.6} />
            {store.saved.length > 0 && (
              <span className="selection-count">{store.saved.length}</span>
            )}
          </button>
          <Link href="/compte" className="icon-button" aria-label="Mon compte" onClick={close}>
            <UserRound size={21} strokeWidth={1.6} aria-hidden="true" />
          </Link>
          <Link href="/contact" className="header-contact">
            Parlons-en <ArrowUpRight size={16} />
          </Link>
          <button
            className="icon-button mobile-menu-button"
            onClick={() => setMobileOpen(true)}
            aria-label="Ouvrir le menu"
          >
            <Menu size={25} strokeWidth={1.5} />
          </button>
        </div>
      </header>
      <Dialog
        open={mobileOpen}
        onClose={close}
        title="Gaindé Sportif"
        className="mobile-menu-dialog"
      >
        <nav aria-label="Navigation mobile">
          <Link href="/" onClick={close}>
            Accueil <ArrowUpRight />
          </Link>
          <Link href="/boutique" onClick={close}>
            La boutique <ArrowUpRight />
          </Link>
          <p className={styles.mobileCollectionLabel}>Les collections</p>
          <div className="mobile-sub-links">
            {categories.map((category) => (
              <Link
                key={category.value}
                href={`/boutique?category=${category.value}`}
                onClick={close}
              >
                {category.label}
              </Link>
            ))}
          </div>
          <Link href="/a-propos" onClick={close}>
            L’esprit Gaindé <ArrowUpRight />
          </Link>
          <Link href="/contact?subject=personnalisation" onClick={close}>
            Votre équipe <ArrowUpRight />
          </Link>
          <Link href="/compte" onClick={close}>
            Mon compte <ArrowUpRight />
          </Link>
          <Link href="/contact" onClick={close}>
            Contact <ArrowUpRight />
          </Link>
        </nav>
        <p className="mobile-menu-signature">
          Dakar dans le cœur.
          <br />
          Le Sénégal dans l’âme.
        </p>
      </Dialog>
      {menuOpen && (
        <button
          className="mega-backdrop"
          tabIndex={-1}
          onClick={close}
          aria-label="Fermer les collections"
        >
          <X className="sr-only" />
        </button>
      )}
    </>
  );
}
