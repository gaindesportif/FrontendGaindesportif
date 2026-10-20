# Préparer le déploiement — cible VPS et gaindesportif.com

## Livraison demandée le 20/10/2026 — Dokploy

L’utilisateur autorise le déploiement et a choisi un guidage écran par écran. L’application **Frontend** (`gaindesportif-frontend-bagzkj`) existe dans Gaindesportif / production, à côté de Backend (`gaindesportif-backend-goa1gt`). Les projets Sonatel restent hors périmètre. L’agent ne dispose pas de session authentifiée Dokploy.

État observé le 20/10 : l’utilisateur a changé le A `@` de `2.57.91.91` vers `187.127.233.188`, TTL 300, et conservé le CNAME `www` vers le domaine racine. Résolution racine/www vérifiée vers le VPS. HTTPS/Let’s Encrypt activé sur la route racine, port 3000 ; certificat racine vérifié avec validation TLS système (expiration 18/01/2027). GET HTTPS retourne encore 502 avant lancement du frontend. Le CNAME ne crée pas la route Dokploy ni le certificat www : ces derniers restent à configurer et tester.

Les variables frontend runtime/build ont été montrées correctes et enregistrées. Les huit variables backend ont été transférées par presse-papiers privé, sans secret dans le chat ou les dépôts ; l’utilisateur confirme leur sauvegarde. La prise en compte au runtime nécessite une livraison. L’API actuellement publiée répond encore 404 sur `/api/v1/products` : déployer la version backend Boutique avant de valider le catalogue et l’administration distants.

| Paramètre frontend Dokploy | Valeur à saisir |
| --- | --- |
| Projet / environnement | Gaindesportif / production, après vérification dans le panel |
| Type de service | Application, nom Frontend |
| Dépôt Git | `https://github.com/gaindesportif/FrontendGaindesportif.git` |
| Branche | `main` ; vérifier le commit de livraison après publication Git |
| Build Path | `/` |
| Build Type | Dockerfile |
| Docker File / Context | `Dockerfile` / `.` |
| Docker Build Stage | Vide (stage final runner) |
| Port du domaine | `3000`, interne au conteneur ; aucun port hôte à publier |
| Build args publics | `NEXT_PUBLIC_SITE_URL=https://gaindesportif.com` et `NEXT_PUBLIC_ALLOW_INDEXING=false` |
| Runtime serveur | `BACKEND_URL=http://gaindesportif-backend-goa1gt:4000`, sans `/api/v1` ; résolution réseau à tester depuis Next |

Avant Deploy, publier les versions Boutique et administration vérifiées dans les deux dépôts et contrôler leur commit distant. Le nom du service backend a été relevé dans Dokploy ; vérifier sa résolution et sa réponse depuis le conteneur frontend lors de la recette. Le compte propriétaire et la migration Boutique existent déjà sur Neon : ne pas recréer le propriétaire, réinitialiser son mot de passe ou rejouer une initialisation de base pour ce déploiement. Contrôler seulement les migrations en attente et appliquer les éventuelles nouvelles migrations avec sauvegarde.

Dans Hostinger, lire la zone DNS avant modification. Après préparation des routes Dokploy, seul le raccordement web du domaine Gaindé sera modifié : destination A du domaine vers le VPS, traitement de `www` et des éventuels AAAA après inspection. Préserver les anciennes valeurs pour le retour arrière. Configurer HTTPS/Let’s Encrypt dans Domains et vérifier le certificat, le catalogue, la connexion privée et la PWA avant d’annoncer la publication réussie. URL d’administration prévue, non encore publiée : `https://gaindesportif.com/administration`.

## Décision du 19/10/2026 — préparation, aucune modification distante

L'utilisateur indique avoir acheté `gaindesportif.com` et prévoit de placer aussi le frontend sur le VPS existant. Le backend y est déjà publié dans son application séparée. La propriété du domaine, ses DNS, le réseau Docker privé et les certificats n'ont pas été vérifiés par cette préparation. Ne modifier aucune route, aucun DNS ni service existant sans accord explicite de publication/bascule.

La première boutique utilise **WhatsApp pour la demande d'achat**, en attendant le prestataire/API de paiement. Elle comprend un catalogue géré par l'équipe, des comptes privés, photos et vidéos Cloudinary. Ouvrir WhatsApp ne vaut ni commande enregistrée, ni paiement confirmé.

### Configuration à préparer

État local du 20/10/2026 : variables Cloudinary présentes dans le `.env` privé du backend local, upload navigateur et suppression réels d’une image et d’une vidéo vérifiés. Le VPS/Dokploy n’a pas été modifié ; son environnement reste à configurer lors de la livraison autorisée. Les valeurs des clés ne doivent pas être copiées dans cette documentation.

1. Dans **le backend uniquement**, renseigner `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` et `CLOUDINARY_API_SECRET` par le gestionnaire de variables protégé. Ne jamais transmettre le secret dans le chat, Git, une capture ou une variable `NEXT_PUBLIC_`. Sans ces accès, les brouillons restent possibles, les uploads renvoient explicitement une indisponibilité.
2. Sur une base de développement distincte, vérifier d'abord toutes les nouvelles migrations et les tests. Pour la base cible : sauvegarde, puis `npm run db:migrate` lors d'une livraison autorisée ; aucune migration automatique au démarrage et aucun `db push/reset`. Ne pas exécuter les tests de suppression sur Neon.
3. Créer le premier propriétaire via `npm run admin:create-owner` dans un terminal protégé du backend. Le mot de passe est demandé en saisie masquée ; aucun mot de passe en argument ou compte par défaut. Les comptes suivants se gèrent dans l'administration par le propriétaire.
4. Préparer l'application frontend Docker distincte, port interne 3000. Au build : `NEXT_PUBLIC_SITE_URL=https://gaindesportif.com`, `NEXT_PUBLIC_ALLOW_INDEXING=false` jusqu'à validation. Au runtime : `BACKEND_URL` vers le nom de service backend réellement joignable sur le réseau Docker privé, port 4000, sans `/api/v1`. `localhost` désignerait le conteneur frontend lui-même. Ne pas réutiliser une IP ou un nom de service supposé.
5. Pour Nest, ajouter l'origine HTTPS finale exacte aux origines permises et vérifier les paramètres de proxy. Garder ports Node et base hors accès public direct. Les accès administrateur doivent passer par le frontend HTTPS : le cookie de session est Secure en production.
6. Après l'accord de publication et vérification de la zone DNS, préparer uniquement les routes/domaine/certificat Gaindé retenus. Ne pas changer `www`, l'ancien domaine ou les services Sonatel par défaut. Conserver un chemin de retour vers l'ancienne version.

### Médias et suppression

Les uploads signés sont envoyés **du navigateur à Cloudinary**, sans fichier enregistré sur le VPS. Les photos produit utilisent un affichage direct (`Image unoptimized`) ; les vidéos ont une URL Cloudinary et des contrôles, sans lecture automatique. Ne pas ajouter de proxy binaire, disque d'upload ou cache Next pour ces médias.

Le backend vérifie la propriété du ticket et l'asset distant avant de l'attacher au produit. Supprimer une annonce la retire immédiatement des résultats publics ; les identifiants de médias restent en base jusqu'à la suppression confirmée et à la purge défensive des tickets expirés. Une file durable reprend les échecs Cloudinary ; ne pas supprimer manuellement les lignes de nettoyage en attente. Le worker doit rester actif et son état doit être contrôlé après redémarrage.

Les appels de destruction demandent l'invalidation CDN. Sa propagation et les éventuelles sauvegardes Cloudinary restent soumises au service ; une suppression n'efface pas les copies déjà téléchargées par des visiteurs. Voir les [règles de suppression Cloudinary](https://cloudinary.com/documentation/delete_assets).

### Recette avant ouverture

Vérifier HTTPS, connexion/déconnexion/expiration et refus d'accès, comptes propriétaire/admin, brouillon invisible, publication réelle, images et vidéo Cloudinary, retrait de média, suppression d'annonce puis fin du nettoyage. Tester également une panne Cloudinary et la reprise de la file, le catalogue vide/indisponible, WhatsApp avec ses options, clavier, vrais téléphones et PWA sans cache privé. Utiliser des données de recette clairement identifiées, pas de fausses annonces commerciales.

Les accès Cloudinary réels, la recette fournisseur et la publication sont des validations séparées des tests locaux avec transport simulé.

Les proxys contact, catalogue et administration peuvent signer l'IP du visiteur avec `CONTACT_PROXY_SECRET` et `CONTACT_IP_HEADER`. Activer ce dernier seulement après contrôle d'un header **à IP unique**, réécrit par le proxy de confiance ; les chaînes `X-Forwarded-For` sont refusées. Sans cette configuration, la limite Nest reste mutualisée sur l'IP Next (60 requêtes/minute, connexion 5/minute). Vérifier ce raccordement avant ouverture : ne pas faire confiance à un header public arbitraire.

## Architecture

Navigateur → Next.js → proxy `/api/contact` → NestJS `/api/v1/contacts` → Prisma → Neon.

Les dépôts sont indépendants. Les secrets de base et Cloudinary appartiennent uniquement à Nest. Les images éditoriales restent statiques ; les médias du catalogue administrable sont dans Cloudinary. Next utilise `/api/catalogue` pour la lecture publique et `/api/admin` pour les appels privés en plus du contact.

## Frontend sur Vercel pour la démonstration

1. Connecter uniquement le dépôt FrontendGaindesportif.
2. Framework Next.js, Node 22, `npm ci`, `npm run build` ; Vercel gère le serveur, ne pas utiliser le Dockerfile.
3. Injecter `BACKEND_URL` vers l’API HTTPS du VPS, sans chemin `/api/v1` final. Cette variable n’est pas `NEXT_PUBLIC_`.
4. Configurer `NEXT_PUBLIC_SITE_URL` avec l’URL exacte de la démonstration si elle est stable. Garder `NEXT_PUBLIC_ALLOW_INDEXING=false` pour la préproduction. Reconstruire si une variable publique change.
5. Si limitation par visiteur souhaitée, partager `CONTACT_PROXY_SECRET` entre les deux serveurs, et définir `CONTACT_IP_HEADER` seulement après vérification du header IP imposé par la plateforme. Ne jamais envoyer ce secret au navigateur.
6. Vérifier le formulaire de bout en bout et les erreurs si Nest est indisponible.

Sans backend configuré, toutes les pages restent consultables, mais le contact affiche un échec explicite : pas de fausse confirmation.

## VPS existant avec Dokploy

- Deux applications Docker distinctes : Next (port 3000) et Nest (port 4000).
- Variables et secrets dans Dokploy, jamais dans les images ou les dépôts.
- Next : `BACKEND_URL` doit atteindre Nest. Sur le même VPS, préférer un réseau Docker privé et le nom de service ; jamais `localhost:4000` depuis le conteneur Next.
- Nest : `DATABASE_URL` poolée, éventuellement `DIRECT_URL`, `NODE_ENV=production`, `PORT=4000`, `FRONTEND_ORIGINS` HTTPS exactes. `TRUST_PROXY_HOPS` dépend de la topologie réelle.
- Variables Next publiques à fournir aussi au build Docker via build args : `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_ALLOW_INDEXING`.
- Faire une sauvegarde avant toute migration, exécuter `prisma migrate deploy` une seule fois avant la nouvelle version. La migration ne s’exécute pas au démarrage HTTP. La CLI/config est fournie dans l’image backend ; exécution ponctuelle `npm run db:migrate` avec les secrets configurés.
- Health checks : Nest `/api/v1/health/ready`, Next `/`.
- Mettre HTTPS avec Traefik/Dokploy ; laisser les ports applicatifs hors d’accès public direct. La PWA n’est pas installable depuis une simple IP HTTP publique.
- Prévoir les sauvegardes/restaurations Neon, logs sans données privées, monitoring et durée de conservation validée.

## Basculer le domaine seulement après accord

Les deux versions peuvent coexister : une URL de préproduction pour la nouvelle et le domaine actuel pour l’ancienne. Aucun arrêt préalable nécessaire.

Il faudra les accès au DNS du domaine, au VPS et à Dokploy. Après validation, configurer le domaine dans Dokploy, préparer le certificat HTTPS et changer la destination DNS. Conserver l’ancien déploiement pour un retour arrière pendant la propagation ; vérifier formulaires, images et PWA sur le domaine final avant de le retirer.

## Avant publication ouverte

- Confirmer téléphone/WhatsApp, contenus et droits sur les médias avec le manager.
- Finaliser mentions légales, politique de conservation et conformité de l’hébergement des contacts, avec un interlocuteur compétent.
- Remplacer le mot de passe Neon partagé et limiter les droits du compte applicatif.
- Valider les headers de proxy et la limitation par visiteur, notamment lorsque Vercel et le VPS sont séparés.
- Tester les vrais appareils mobiles et les scénarios hors connexion.
- Ne pas activer paiement ou notification commerciale sans intégration et recette réelles.
- Activer le CD Dokploy après ces contrôles et accord ; la CI seule est installée pour l’instant.
