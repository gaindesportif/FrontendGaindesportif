import type { Metadata } from 'next';
import Link from 'next/link';
import { contactDetails } from '@/lib/contact';
export const metadata: Metadata = { title: 'Vos informations et votre confidentialité' };
export default function Privacy() {
  return (
    <section className="legal-page section">
      <span className="eyebrow">Confidentialité / Version de préproduction</span>
      <h1>
        Vos informations
        <br />
        restent vos informations.
      </h1>
      <p className="legal-note">
        Cette première version sert à valider le nouveau site. Les coordonnées juridiques de
        l’entreprise, la durée définitive de conservation et les conditions commerciales doivent
        être validées avant l’ouverture publique.
      </p>
      <h2>Le formulaire de contact</h2>
      <p>
        Gaindé Sportif reçoit votre nom, votre adresse email, votre téléphone, le sujet et le
        contenu du message, avec votre accord. Ces informations servent à traiter votre demande et à
        vous recontacter. Elles sont enregistrées dans une base PostgreSQL hébergée chez Neon ;
        l’infrastructure de base indiquée pour ce projet se situe aux États-Unis. La conformité du
        traitement et de cet hébergement doit être validée par l’entreprise avant lancement.
      </p>
      <h2>Votre sélection</h2>
      <p>
        Vos coups de cœur sont enregistrés localement dans votre navigateur, sur cet appareil. Ils
        ne sont pas associés à un compte. Vous pouvez les retirer depuis « Ma sélection » ou effacer
        les données du site dans votre navigateur.
      </p>
      <h2>Installation et mode hors connexion</h2>
      <p>
        Le site peut conserver quelques ressources publiques pour proposer une page de repli sans
        connexion. Les formulaires, réponses de l’API et données privées ne sont pas mis en cache.
        Aucun message n’est envoyé hors ligne.
      </p>
      <h2>Vos demandes</h2>
      <p>
        Pour demander l’accès, la correction ou la suppression des informations transmises,
        contactez Gaindé Sportif au <a href={contactDetails.phoneHref}>{contactDetails.phone}</a> ou
        via <Link href="/contact">le formulaire de contact</Link>. Le responsable de l’entreprise
        doit confirmer les modalités et la durée de conservation avant publication.
      </p>
      <p className="small muted">
        Mise à jour : 8 octobre 2026. Aucun outil publicitaire ni mesure d’audience tiers ajouté à
        cette version.
      </p>
    </section>
  );
}
