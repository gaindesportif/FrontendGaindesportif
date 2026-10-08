import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
export default function NotFound() {
  return (
    <section className="empty-page section">
      <span className="eyebrow">404 / Hors du terrain</span>
      <h1>
        On a perdu
        <br />
        cette page de vue.
      </h1>
      <p>Mais votre prochain Gaindé n’est pas loin.</p>
      <Link href="/" className="button button-dark">
        Retour à l’accueil <ArrowRight size={19} />
      </Link>
    </section>
  );
}
