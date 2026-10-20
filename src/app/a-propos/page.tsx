import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
export const metadata: Metadata = { title: 'L’esprit Gaindé' };
export default function About() {
  return (
    <>
      <section className="about-hero section">
        <span className="eyebrow">L’esprit Gaindé / Bien plus qu’un style</span>
        <h1>
          Dakar dans le cœur.
          <br />
          <em>Le Sénégal dans l’âme.</em>
        </h1>
        <div className="about-grid">
          <Image
            src="/images/dakar-duo.webp"
            alt="La collection Dakar portée par deux personnes dans un cadre arboré"
            width={720}
            height={1080}
            sizes="(max-width: 760px) 100vw, 50vw"
          />
          <div>
            <span className="eyebrow">Notre point de départ</span>
            <h2>
              La fierté
              <br />
              qui nous rassemble.
            </h2>
            <p>
              Gaindé Sportif fait se rencontrer le sport, la culture et l’énergie du Sénégal. Nos
              collections racontent le lien avec un pays, une ville et une équipe.
            </p>
            <p>
              Les visuels Dakar rendent hommage au mouvement de la ville. Les tenues Sénégal font
              vibrer l’esprit du football. Et nos accessoires emmènent le lion dans le quotidien.
            </p>
            <Link href="/boutique" className="text-link">
              Explorer les collections <ArrowUpRight size={19} />
            </Link>
          </div>
        </div>
      </section>
      <section className="about-values section">
        <span className="eyebrow">Trois façons de nous reconnaître</span>
        <div>
          <article>
            <span>01</span>
            <h2>Une identité.</h2>
            <p>Afficher ce qui nous ressemble, du terrain à la rue.</p>
          </article>
          <article>
            <span>02</span>
            <h2>Un collectif.</h2>
            <p>Rassembler un club, une école ou une association autour de ses couleurs.</p>
          </article>
          <article>
            <span>03</span>
            <h2>Du caractère.</h2>
            <p>Porter le lion et faire vivre la fierté sénégalaise.</p>
          </article>
        </div>
      </section>
    </>
  );
}
