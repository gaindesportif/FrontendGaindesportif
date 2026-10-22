import Link from 'next/link';
import { ArrowUpRight, ArrowRight } from 'lucide-react';
import { contactDetails } from '@/lib/contact';
import { InstallApp } from './install-app';
export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-top">
        <div>
          <span className="eyebrow">Le terrain nous rassemble.</span>
          <h2>
            Et si on écrivait
            <br />
            la suite ensemble ?
          </h2>
          <Link href="/contact" className="footer-cta">
            Parlons de votre projet <ArrowUpRight size={23} />
          </Link>
        </div>
        <div className="footer-navigation">
          <div>
            <h3>Explorer</h3>
            <Link href="/boutique">
              La boutique <ArrowUpRight size={13} />
            </Link>
            <Link href="/boutique?category=maillots">
              Maillots <ArrowUpRight size={13} />
            </Link>
            <Link href="/boutique?category=t-shirts-polos">
              T-shirts et polos <ArrowUpRight size={13} />
            </Link>
            <Link href="/boutique?category=accessoires">
              Accessoires <ArrowUpRight size={13} />
            </Link>
            <Link href="/a-propos">
              L’esprit Gaindé <ArrowUpRight size={13} />
            </Link>
          </div>
          <div>
            <h3>Restons proches</h3>
            <Link href="/contact">
              Nous contacter <ArrowUpRight size={13} />
            </Link>
            <a href={contactDetails.whatsapp} target="_blank" rel="noopener noreferrer">
              WhatsApp <ArrowUpRight size={13} />
            </a>
            <a href={contactDetails.phoneHref}>{contactDetails.phone}</a>
            <InstallApp />
          </div>
        </div>
      </div>
      <div className="footer-wordmark" aria-hidden="true">
        <div className="footer-brand-name">
          GAINDÉ<span className="footer-brand-symbol">✳</span>
        </div>
        <span className="footer-brand-sportif">SPORTIF</span>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} Gaindé Sportif</span>
        <span className="footer-motto">
          Dakar dans le cœur. Le Sénégal dans l’âme. <ArrowRight size={14} />
        </span>
        <Link href="/confidentialite">Confidentialité</Link>
        <Link href="/administration">Espace de gestion</Link>
      </div>
    </footer>
  );
}
