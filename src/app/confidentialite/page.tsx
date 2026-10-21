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
        vous recontacter. Elles sont enregistrées dans la base PostgreSQL du serveur de Gaindé
        Sportif. Des sauvegardes privées et chiffrées au repos sont conservées chez Backblaze B2,
        dans sa région États-Unis Est. Le cadre de ces traitements et de ces hébergements doit être
        validé par l’entreprise avant lancement.
      </p>
      <h2>Votre compte et vos favoris</h2>
      <p>
        La création du compte utilise votre nom, votre adresse e-mail et un mot de passe. Le mot de
        passe est conservé sous une empreinte sécurisée, jamais en clair. Un cookie de session
        nécessaire au compte permet de rester connecté pendant 30 jours au maximum. Vous pouvez vous
        déconnecter à tout moment. Des liens à usage unique sont envoyés pour confirmer votre
        adresse (24 heures) ou réinitialiser votre mot de passe (30 minutes). Le nouveau mot de
        passe n’est jamais envoyé par e-mail.
      </p>
      <p>
        Vos favoris sont associés à votre compte pour les retrouver sur vos appareils. Si une
        ancienne sélection existe dans ce navigateur, sa récupération dans votre compte nécessite
        votre action explicite. Vous pouvez retirer vos favoris, modifier votre nom, changer votre
        mot de passe ou supprimer votre compte depuis votre espace.
      </p>
      <h2>Les e-mails liés à votre compte</h2>
      <p>
        Les messages de confirmation, de récupération et de suivi sont transmis via Gmail par Gaindé
        Sportif. Votre adresse et le contenu du message sont donc traités par Google pour leur
        acheminement. Les messages en attente sont chiffrés en base ; leur contenu est retiré après
        envoi, échec définitif ou expiration. Un état technique est conservé au maximum 30 jours. Il
        ne s’agit pas d’un abonnement publicitaire.
      </p>
      <h2>Historique et demandes WhatsApp</h2>
      <p>
        Lorsque vous êtes connecté et que cette option est activée, les 30 dernières fiches produit
        consultées sont conservées dans votre compte. Vous pouvez effacer cet historique ou
        désactiver son enregistrement. Les 50 dernières demandes préparées pour WhatsApp conservent
        les options choisies et le prix affiché à cet instant. Vous pouvez également les effacer.
      </p>
      <p>
        L’ouverture de WhatsApp ne confirme ni l’envoi du message, ni une commande, ni un paiement.
        Vous choisissez vous-même d’envoyer le message dans WhatsApp. L’équipe peut ensuite
        confirmer manuellement la réception, l’expédition, la livraison ou l’annulation d’une
        demande. Un e-mail de suivi est préparé si votre adresse est confirmée. Sans connexion à un
        compte, les consultations et demandes WhatsApp ne sont pas associées à un compte client par
        le site.
      </p>
      <p>
        La suppression du compte retire ses sessions, favoris et historiques de la base active. Une
        copie antérieure peut subsister temporairement dans les sauvegardes privées : celles-ci sont
        masquées après 14 jours puis éligibles à suppression un jour plus tard, selon le traitement
        du fournisseur. Les messages que vous avez vous-même envoyés à l’équipe dans WhatsApp
        relèvent d’un traitement distinct.
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
        Mise à jour : 21 octobre 2026. Aucun outil publicitaire ni mesure d’audience tiers ajouté à
        cette version.
      </p>
    </section>
  );
}
