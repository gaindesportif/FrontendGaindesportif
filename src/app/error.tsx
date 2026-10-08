'use client';
import Link from 'next/link';
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="empty-page section">
      <span className="eyebrow">Une pause imprévue</span>
      <h1>
        Reprenons
        <br />
        depuis ici.
      </h1>
      <p>
        Cette page n’a pas pu s’afficher. Vos informations n’ont pas été envoyées par cette action.
      </p>
      <button className="button button-dark" onClick={reset}>
        Réessayer
      </button>
      <Link className="text-link" href="/">
        Revenir à l’accueil
      </Link>
    </section>
  );
}
