# Préparer le déploiement — ne pas basculer l’ancien site maintenant

## Architecture

Navigateur → Next.js → proxy `/api/contact` → NestJS `/api/v1/contacts` → Prisma → Neon.

Les dépôts sont indépendants. Le backend n’est pas embarqué dans Vercel. Les secrets de base appartiennent uniquement à Nest. Les images de présentation sont statiques ; le catalogue dynamique viendra ensuite.

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
