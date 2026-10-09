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
- Accueil immersif : titre et boutons animés, emblème en verre 3D WebGL, défilement automatique des trois univers toutes les 6 secondes, transitions de volumes et pause commune ; emblème SVG léger dès le premier affichage, sans ancien collage de photos.
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

### Accueil et scène 3D

`src/components/home/home-hero.tsx` et `home-universes.tsx` sont des composants serveur ; `hero-motion.tsx` fournit le contrôle client commun de pause, visibilité et réduction des mouvements. `hero-scene.tsx` concentre les contrôles accessibles et le défilement automatique ; `glass-scene.tsx` pilote le chargement différé du moteur. Les contenus et photographies sont définis dans `src/lib/hero-universes.ts`, sans prix ni stock fictifs. Les styles locaux de l’accueil sont isolés dans `home.module.css`, en couche `components`, et complètent les tokens Tailwind existants.

La scène principale utilise **Three.js 0.186.1 / WebGL2**, chargé quand le visuel approche de l’écran, avec des géométries originales : étoile à cinq branches, sphère facettée et entrelacs. Ce sont des symboles de marque, pas des modèles de vêtements ni des produits garantis en vente. Le lion vient du logo fourni ; les petites photos et les liens conservent le lien avec les collections. `kinetic-title.tsx` rend le titre côté serveur : chaque ligne glisse depuis la droite dans un panneau découpé, avec une décélération fluide (1 050 ms, décalage de 220 ms entre les deux lignes), puis reste immobile. L’entrée démarre après hydratation seulement ; sans JavaScript ou avec mouvement réduit, le titre est immédiatement complet et statique. Cette adaptation s’inspire de l’entrée multiligne montrée dans https://youtube.com/shorts/PrjCCxVvrRQ, examinée jusqu’à sa fin le 09/10/2026 ; aucun média ou preset After Effects importé. Le nom complet du titre reste exposé aux lecteurs d’écran. Les phrases du paragraphe et les boutons conservent leur entrée courte. Ces effets CSS utilisent la pause commune et la réduction des mouvements, sans bibliothèque ou boucle JavaScript supplémentaires. Aucun `will-change` permanent ni flou appliqué au texte ; la scène 3D conserve son propre cycle automatique.

Après l’entrée, un reflet CSS traverse les lettres sur les deux lignes : ivoire/blanc et jaune/or clair, cycle de 6 s avec repos entre les passages et décalage de 220 ms. `titleSheen` anime uniquement la position du dégradé découpé dans le texte ; les lettres ne bougent plus. Début après 1,4 s, pause commune et suspension hors écran/onglet masqué conservées. Sans JavaScript ou avec mouvement réduit, couleurs pleines et aucun reflet animé.

Les univers Dakar → Sénégal → Accessoires tournent automatiquement toutes les **6 secondes**, avec fermeture/réouverture du volume (environ 0,95 s) et zoom discret de la photo. Une barre indique le prochain changement. Le survol de la scène, le focus clavier, un geste tactile en cours, la pause générale et la sortie d’écran suspendent le minuteur ; la reprise commence une nouvelle période complète, sans rattrapage accéléré. Les choix manuels restent possibles et relancent cette période. Le bouton Pause agit aussi sur le titre et le rendu GPU. Les changements automatiques ne sont pas annoncés en boucle aux lecteurs d’écran ; les choix manuels disposent d’une annonce polie. La préférence de mouvement réduit désactive également le défilement automatique.

`src/lib/glass-scene-engine.ts` gère les géométries, le matériau physique, le studio de reflets généré en code, la lumière et le cycle de rendu. Un reflet stylisé par shader complète le matériau sans post-traitement lourd. `glass-scene-config.ts` définit palettes, silhouette et limites de résolution. Aucun HDR, modèle externe, CDN, template ou script téléchargé depuis la vidéo n’est utilisé. La licence Three.js est conservée dans `public/licenses/Three-MIT.txt`.

Le moteur vise au maximum 30 images/s sur la petite scène mobile et 45 sur desktop, avec DPR plafonné à 1,25 / 1,5 ; ce ne sont pas des performances garanties sur tous les appareils. Les animations arrêtées, hors écran ou onglet masqué n’entretiennent pas de boucle de rendu. Géométries, textures, matériaux, contexte, observateurs et écouteurs sont libérés au démontage et en cas d’erreur de rendu. `hero-emblem.tsx` fournit un emblème SVG statique léger, présent dès le HTML et remplacé quand le canvas est prêt : le collage photographique précédent et ses styles ont été supprimés, pas seulement cachés. Ce même emblème sert de repli sans WebGL, en cas de perte de contexte, sans JavaScript ou avec mouvement réduit. Le titre, la petite photo de collection et les liens restent disponibles ; les médias originaux ne sont pas supprimés.

Sur mobile, les boutons ou un balayage horizontal permettent de changer d’univers ; le défilement vertical reste disponible. Un contrôle de pause, la préférence système de mouvement réduit et l’arrêt hors écran/onglet masqué limitent les mouvements. Sans JavaScript, les photos, le titre et les liens restent accessibles et les animations sont arrêtées. Vérifier le rendu sur de vrais téléphones Android/iOS en complément des tests Chromium.

## Médias et références

`node scripts/prepare-media.mjs` régénère les assets depuis `../media/` (59 originaux attendus). Les originaux sont conservés ; aucun média de tiers utilisé. Polices Manrope et Barlow Condensed auto-hébergées, licences OFL conservées.

Inspirations consultées : [On](https://www.on.com/fr-fr/shop/mens) (navigation et aperçus), [Nike](https://www.nike.com/fr/) (hiérarchie et photographie), [Patagonia](https://www.patagonia.com/home/) (récit), [démonstration de verre 3D fournie par l’utilisateur](https://www.youtube.com/watch?v=TuiF6yIeLG4) (volumes, reflets et transitions). L’identité, les formes implémentées et les médias restent ceux de Gaindé ; la référence n’est pas incorporée au site.

Le téléphone/WhatsApp provient des visuels fournis : il doit être confirmé par le propriétaire avant publication. Aucun horaire, délai de livraison, tarif ou témoignage inventé.

## Vérifications

```sh
npm run check
npx playwright install chromium
npm run test:e2e
```

Avec Chrome installé localement : `CHROME_PATH=/usr/bin/google-chrome npm run test:e2e`.

Vitest vérifie filtres, validation, proxy, références des médias et configuration des formes/résolution/transitions. Playwright couvre navigation, recherche, filtres, dialogues, sélection, formulaire (réponses serveur simulées), erreurs, axe, largeurs 320–1920 px et PWA hors connexion. Il vérifie aussi les univers 3D, la pause, le mouvement réduit, le clavier, les gestes tactiles synthétiques et le repli sans JavaScript. `home-autoplay.spec.ts` vérifie le cycle complet, les deux lignes animées et les suspensions avec une horloge simulée, sans GPU. `e2e/glass-scene.spec.ts` lance un contexte Chromium avec GPU logiciel de test pour vérifier un vrai rendu WebGL, l’arrêt de la boucle, un changement automatique avec horloge réelle, les changements d’univers, le repli sans WebGL et la perte de contexte. Un chargement JavaScript volontairement retardé vérifie aussi que l’ancien collage ne revient jamais avant l’hydratation et que la scène garde sa hauteur. Ces options de test ne sont jamais imposées aux visiteurs. Le test réel Next → Nest → Prisma → Neon est lancé dans le backend par `npm run test:smoke`.

Les tests axe ne constituent pas un audit humain complet d’accessibilité. L’installation PWA doit aussi être vérifiée sur de vrais appareils Android/iOS avant production.

`npm audit --omit=dev --audit-level=high` est utilisé en CI. L’audit complet signale actuellement des dépendances de l’outillage ESLint/Next (`braces`/`micromatch`) : ne pas rétrograder Next ni appliquer `audit fix --force` aveuglément. Suivre le correctif amont ; ces dépendances ne sont pas dans le serveur standalone publié.

## Publication future

Vercel est possible pour le frontend sans acheter un autre domaine. Docker/Dokploy est prévu pour le VPS. Les variables publiques de métadonnées doivent être définies avant le build ; `BACKEND_URL` reste une variable serveur à l’exécution. Voir [la préparation du déploiement](docs/DEPLOIEMENT.md).

GitHub Actions vérifie lint, tests, build et navigateur. Aucun déploiement externe effectué à cette étape.
