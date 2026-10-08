# Frontend Gaindé Sportif

Next.js 16, React 19, TypeScript strict et Tailwind CSS 4. Application mobile prioritaire, images réelles de la marque et PWA.

## Démarrer en local

Node 22.12 minimum. Depuis ce dossier :

```sh
npm ci
npm run dev
```

Ouvrir `http://localhost:3000`. Le backend doit tourner sur le port 4000 pour enregistrer un contact. `.env.local` contient uniquement la configuration du frontend ; jamais de secret Neon. Sur un nouveau poste, créer ce fichier à partir de `.env.example`.

Tester la version compilée et la PWA :

```sh
npm run build
npm start
```

Le script de démarrage prépare les assets de Next standalone et charge l’environnement local. Les tests automatiques utilisent le port 3100. La PWA est désactivée en développement pour éviter les anciens assets ; elle fonctionne en version compilée sous HTTPS ou localhost.

## Livré en semaine 1

- Accueil éditorial, navigation desktop avec menu de collections, menu mobile accessible.
- Collections Sénégal, Dakar, accessoires : filtres, recherche, aperçus de deux visuels.
- Coups de cœur conservés uniquement sur l’appareil, sans compte ni panier fictif.
- Pages esprit de marque, contact et confidentialité de préproduction.
- Formulaire validé, accès à Nest via un proxy serveur ; succès réel ou erreur explicite.
- Responsive, navigation clavier, respect de la réduction des animations, dialogues natifs.
- PWA installable, icônes de marque et repli hors connexion. Aucune donnée de contact mise en cache.

Les collections sont une sélection éditoriale, pas un catalogue commercial. Aucun prix, stock, compte administrateur, commande, paiement ou notification automatique n’est simulé. Le catalogue dynamique et l’administration commencent en semaine 2.

## Organisation

```text
src/app/             Routes, métadonnées, pages et proxy de contact
src/components/      Navigation, cartes, dialogues, formulaire et PWA
src/lib/             Données éditoriales, schéma de validation, polices
public/images/       Images WebP issues des originaux fournis
public/icons/        Icônes PWA
public/sw.js         Service worker public, sans cache API
e2e/                 Parcours Playwright desktop et mobile + axe
docs/                Architecture, déploiement et validation
```

Tailwind porte les tokens (Gaindé, ivoire, jaune, polices) et les utilitaires de composition. `globals.css` conserve dans `@layer components` les éléments éditoriaux spécifiques : hero, menu, cartes, mises en page et animations. Les utilitaires Tailwind peuvent donc les compléter sans dupliquer toute la charte. Pour une nouvelle fonctionnalité, préférer des composants courts et réutilisables ; éviter d’ajouter des blocs CSS de correction successifs.

`src/lib/collections.ts` sera remplacé par des données de l’API en semaine 2. Il n’est pas une source de prix/stock. Les détails sont des aperçus de collections : le second visuel peut représenter une autre pièce de la même collection, pas une variante garantie en vente.

## Médias et références

`node scripts/prepare-media.mjs` régénère les assets depuis `../media/` (59 originaux attendus). Les originaux sont conservés ; aucun média de tiers utilisé. Polices Manrope et Barlow Condensed auto-hébergées, licences OFL conservées.

Inspirations consultées : [On](https://www.on.com/fr-fr/shop/mens) (navigation et aperçus), [Nike](https://www.nike.com/fr/) (hiérarchie et photographie), [Patagonia](https://www.patagonia.com/home/) (récit). L’identité et les médias restent ceux de Gaindé.

Le téléphone/WhatsApp provient des visuels fournis : il doit être confirmé par le propriétaire avant publication. Aucun horaire, délai de livraison, tarif ou témoignage inventé.

## Vérifications

```sh
npm run check
npx playwright install chromium
npm run test:e2e
```

Avec Chrome installé localement : `CHROME_PATH=/usr/bin/google-chrome npm run test:e2e`.

Vitest vérifie filtres, validation et proxy. Playwright couvre navigation, recherche, filtres, dialogues, sélection, formulaire (réponses serveur simulées), erreurs, axe, largeurs 320–1440 px et PWA hors connexion. Le test réel Next → Nest → Prisma → Neon est lancé dans le backend par `npm run test:smoke`.

Les tests axe ne constituent pas un audit humain complet d’accessibilité. L’installation PWA doit aussi être vérifiée sur de vrais appareils Android/iOS avant production.

`npm audit --omit=dev --audit-level=high` est utilisé en CI. L’audit complet signale actuellement des dépendances de l’outillage ESLint/Next (`braces`/`micromatch`) : ne pas rétrograder Next ni appliquer `audit fix --force` aveuglément. Suivre le correctif amont ; ces dépendances ne sont pas dans le serveur standalone publié.

## Publication future

Vercel est possible pour le frontend sans acheter un autre domaine. Docker/Dokploy est prévu pour le VPS. Les variables publiques de métadonnées doivent être définies avant le build ; `BACKEND_URL` reste une variable serveur à l’exécution. Voir [la préparation du déploiement](docs/DEPLOIEMENT.md).

GitHub Actions vérifie lint, tests, build et navigateur. Aucun déploiement externe effectué à cette étape.
