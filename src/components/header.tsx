'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { ArrowUpRight, ChevronDown, Heart, Menu, Search, X } from 'lucide-react';
import { useStore } from './store-provider';
import { Dialog } from './dialog';

const links = [
  {
    href: '/collections?category=senegal',
    title: 'L’esprit Sénégal',
    sub: 'Le football dans la peau.',
    image: '/images/senegal-vert.webp',
  },
  {
    href: '/collections?category=dakar',
    title: 'Dakar au quotidien',
    sub: 'L’énergie de nos rues.',
    image: '/images/dakar-duo.webp',
  },
  {
    href: '/collections?category=accessoires',
    title: 'Les essentiels Gaindé',
    sub: 'Le lion vous accompagne.',
    image: '/images/tote.webp',
  },
];

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const store = useStore();
  const pathname = usePathname();
  const megaRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handle(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false);
    }
    function outside(e: MouseEvent) {
      if (!megaRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('keydown', handle);
    document.addEventListener('click', outside);
    return () => {
      document.removeEventListener('keydown', handle);
      document.removeEventListener('click', outside);
    };
  }, []);
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
          <div
            className="mega-anchor"
            ref={megaRef}
            onMouseEnter={() => setMenuOpen(true)}
            onMouseLeave={() => setMenuOpen(false)}
          >
            <button
              className={`nav-link ${pathname === '/collections' ? 'current' : ''}`}
              aria-expanded={menuOpen}
              aria-controls="collections-menu"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              Les collections <ChevronDown size={14} className={menuOpen ? 'rotated' : ''} />
            </button>
            {menuOpen && (
              <div id="collections-menu" className="mega-menu">
                <div className="mega-intro">
                  <span className="eyebrow">À chacun son Gaindé.</span>
                  <h2>
                    Une identité.
                    <br />
                    Plusieurs façons
                    <br />
                    de la porter.
                  </h2>
                  <Link onClick={close} href="/collections" className="text-link">
                    Tout découvrir <ArrowRightIcon />
                  </Link>
                </div>
                <div className="mega-collections">
                  {links.map((l) => (
                    <Link key={l.href} href={l.href} onClick={close}>
                      <div className="mega-image">
                        <Image src={l.image} alt="" width={220} height={220} />
                      </div>
                      <strong>
                        {l.title} <ArrowUpRight size={16} />
                      </strong>
                      <small>{l.sub}</small>
                    </Link>
                  ))}
                </div>
              </div>
            )}
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
            onClick={() => {
              close();
              store.openSearch();
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
          <Link href="/collections" onClick={close}>
            Les collections <ArrowUpRight />
          </Link>
          <div className="mobile-sub-links">
            {links.map((l) => (
              <Link key={l.href} href={l.href} onClick={close}>
                {l.title}
              </Link>
            ))}
          </div>
          <Link href="/a-propos" onClick={close}>
            L’esprit Gaindé <ArrowUpRight />
          </Link>
          <Link href="/contact?subject=personnalisation" onClick={close}>
            Votre équipe <ArrowUpRight />
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
function ArrowRightIcon() {
  return <ArrowUpRight size={18} />;
}
