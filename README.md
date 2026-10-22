# Frontend Gaindé Sportif

Next.js 16, React 19, TypeScript strict et Tailwind CSS 4. Application mobile prioritaire, images réelles de la marque et PWA.

## Boutique et gestion privée — préparation locale du 20/10/2026

`/boutique` est l’unique catalogue : produits réellement publiés dans Nest ; `/boutique/[slug]` présente leur prix en XOF, leurs détails et leur galerie photos/vidéos. La demande d'achat ouvre WhatsApp avec le produit et les options choisis. Aucun paiement ou enregistrement de commande n'est annoncé par cette action. Les anciennes URL `/collections` redirigent vers cette boutique en conservant catégorie et recherche valides. Le menu Collections présente les dernières publications et les catégories du même catalogue, sans anciennes annonces statiques.

La sélection de produits de l’accueil utilise le même catalogue public, avec quatre publications récentes au maximum et les catégories gérées par l’équipe. Elle affiche les prix et les liens vers les fiches ; aucun produit statique ne remplace un catalogue vide ou inaccessible. Un brouillon reste privé ; un retrait disparaît à la prochaine lecture. Les visuels de marque du hero restent éditoriaux.

La loupe de l’en-tête est l’unique entrée de recherche et ouvre un panneau à droite (plein écran sur téléphone). Le champ prend le focus, les catégories servent de suggestions et les résultats proviennent de `/api/catalogue`, avec six cartes au maximum et accès à la liste complète. Requête uniquement à l’ouverture, saisie temporisée à 300 ms, anciennes réponses annulées et aucun remplacement par des produits fictifs en cas de panne. Fermeture par croix, Échap ou clic extérieur ; Tab reste dans le dialogue et le focus revient au bouton d’ouverture. Les paramètres `q` et `category` de `/boutique` sont pris en compte et conservés dans l’URL ; la loupe reprend le mot recherché quand on l’ouvre depuis cette page.

L'équipe dispose de `/administration` pour les brouillons, la publication et la suppression des produits. Un propriétaire crée les comptes administrateurs ; aucune inscription publique ni compte par défaut. Le premier propriétaire se crée par la console backend avec `npm run admin:create-owner`, en saisie masquée. La migration Boutique a été appliquée à Neon le 19/10/2026 après sauvegarde et restauration vérifiée. Création du compte et publication des applications restent distinctes ; voir `../ProjetContexte.md`.

Les appels privés passent par `/api/admin/*` : session en cookie HttpOnly, vérification d'origine sur les modifications et absence de cache. Les pages publiques et le navigateur ne reçoivent jamais le secret Cloudinary ou le jeton de session backend.

Les fichiers produit partent directement du navigateur vers Cloudinary après autorisation signée par Nest, puis vérification côté backend. Images et vidéos sont servies directement par Cloudinary ; les composants Image de ces produits utilisent `unoptimized` pour éviter le cache disque Next. Le VPS conserve uniquement les métadonnées en PostgreSQL. Les médias éditoriaux fournis dans `public/images` sont conservés.

L’import permet de choisir jusqu’à cinq images en une fois, dans la limite de cinq photos par produit et 10 Mio par image. Le lot est validé avant tout envoi, puis chaque image est envoyée et vérifiée séparément avec un compteur de progression. En cas d’erreur, les photos confirmées restent disponibles et le lot s’arrête ; vérifier ou retirer l’envoi en attente avant de sélectionner les images restantes. Les deux vidéos autorisées se chargent une par une. Le backend compte aussi les tickets en attente pour imposer le plafond de cinq photos malgré des demandes concurrentes.

La suppression retire d'abord l'annonce du catalogue public. Nest conserve une tâche durable jusqu'au nettoyage confirmé des médias Cloudinary, avec reprise en cas de panne et purge après expiration des autorisations d'upload. L'interface distingue retrait de l'annonce et nettoyage en attente. Une absence de configuration Cloudinary produit une erreur explicite ; aucun upload réel n'est simulé. Configuration du backend local et recette réelle d’un PNG/WebM avec suppression vérifiées le 20/10/2026 ; aucun fichier de test laissé dans Cloudinary. Cela n’active pas automatiquement la configuration du backend déjà publié sur le VPS.

La prochaine cible déclarée par l'utilisateur est le frontend sur le VPS existant avec `gaindesportif.com`. Voir `docs/DEPLOIEMENT.md` ; cette préparation locale ne constitue pas un déploiement ni une configuration DNS.

Références consultées pour les médias produit : [galeries et médias Shopify](https://help.shopify.com/en/manual/products/product-media/add-media), [upload signé Cloudinary](https://cloudinary.com/documentation/upload_images) et [suppression/invalidation Cloudinary](https://cloudinary.com/documentation/delete_assets). Aucun contenu commercial ou média de tiers copié.

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

## Interface préparée en local

- Accueil éditorial, navigation desktop avec menu de collections, menu mobile accessible.
- Accueil immersif : titre et boutons animés, étoile en verre 3D WebGL réduite, cinq piliers nommés et boutique centrale, défilement automatique des trois univers toutes les 6 secondes, transitions de volumes et pause commune ; emblème SVG léger dès le premier affichage, sans ancien collage de photos.
- Collections accessibles comme filtres du catalogue publié ; une recherche commune depuis la loupe de l’en-tête.
- Coups de cœur des produits publiés conservés uniquement sur l’appareil, sans compte ni panier fictif. À chaque ouverture, les fiches sont relues : prix actuel, retrait pris en compte et erreur explicite sans ancien produit affiché.
- Pages esprit de marque, contact et confidentialité de préproduction.
- Formulaire validé, accès à Nest via un proxy serveur ; succès réel ou erreur explicite.
- Responsive, navigation clavier, respect de la réduction des animations, dialogues natifs.
- PWA installable, icônes de marque et repli hors connexion. Aucune donnée de contact mise en cache.

Le catalogue dynamique et l'administration sont préparés localement ; propriétaire créé sur Neon, import d’images et vidéos visible dans les fiches produit. Créer d’abord un brouillon, puis importer les fichiers directement dans Cloudinary et publier la fiche complète. La configuration Cloudinary réelle, les contenus commerciaux et la mise en ligne restent à finaliser. Aucun prix, stock, commande payée ou notification automatique n'est simulé.

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

Les photographies locales de marque et leurs originaux sont conservés pour le récit visuel de l’accueil. Les anciennes cartes et leur aperçu de collection ont été retirés du parcours commercial. Accueil marchand, boutique, menu Collections, recherche et favoris lisent les publications de l’API ; les photos/vidéos produit proviennent de Cloudinary. La clé de favoris éditoriaux `gainde-selection-v1` est abandonnée ; la version v2 conserve uniquement id et slug (24 produits maximum), puis valide chaque fiche auprès de l’API avant de l’afficher.

### Accueil et scène 3D

Les styles globaux sont importés avant les composants du layout afin d’établir les couches Tailwind avant les modules CSS ; vérifier cet ordre sur le build de production lors d’ajouts au StoreProvider.

`src/components/home/home-hero.tsx` et `home-universes.tsx` sont des composants serveur ; `hero-motion.tsx` fournit le contrôle client commun de pause, visibilité et réduction des mouvements. `hero-scene.tsx` concentre les contrôles accessibles et le défilement automatique ; `glass-scene.tsx` pilote le chargement différé du moteur. Les contenus et photographies sont définis dans `src/lib/hero-universes.ts`, sans prix ni stock fictifs. Les styles locaux de l’accueil sont isolés dans `home.module.css`, en couche `components`, et complètent les tokens Tailwind existants.

La scène principale utilise **Three.js 0.186.1 / WebGL2**, chargé quand le visuel approche de l’écran, avec une étoile à cinq branches permanente. Chaque branche porte un pilier (TECH, INFRA, EVENT, MEDIA, KIDS) en HTML ; un lien Boutique occupe le centre et ouvre le catalogue. Le volume est réduit et l’inclinaison limitée pour garder cette carte lisible pendant les animations. La présentation repliable sous la scène décrit la vision des cinq piliers, sans annoncer leurs services comme disponibles. L’étoile est un symbole de marque, pas un modèle de vêtement ni un produit garanti en vente. Le lion vient du logo fourni ; les petites photos et les liens conservent le lien avec les collections. `kinetic-title.tsx` rend le titre côté serveur : chaque ligne glisse depuis la droite dans un panneau découpé, avec une décélération fluide (1 050 ms, décalage de 220 ms entre les deux lignes), puis reste immobile. L’entrée démarre après hydratation seulement ; sans JavaScript ou avec mouvement réduit, le titre est immédiatement complet et statique. Cette adaptation s’inspire de l’entrée multiligne montrée dans https://youtube.com/shorts/PrjCCxVvrRQ, examinée jusqu’à sa fin le 09/10/2026 ; aucun média ou preset After Effects importé. Le nom complet du titre reste exposé aux lecteurs d’écran. Les phrases du paragraphe et les boutons conservent leur entrée courte. Ces effets CSS utilisent la pause commune et la réduction des mouvements, sans bibliothèque ou boucle JavaScript supplémentaires. Aucun `will-change` permanent ni flou appliqué au texte ; la scène 3D conserve son propre cycle automatique.

Après l’entrée, un reflet CSS traverse les lettres sur les deux lignes : ivoire/blanc et jaune/or clair, cycle de 6 s avec repos entre les passages et décalage de 220 ms. `titleSheen` anime uniquement la position du dégradé découpé dans le texte ; les lettres ne bougent plus. Début après 1,4 s, pause commune et suspension hors écran/onglet masqué conservées. Sans JavaScript ou avec mouvement réduit, couleurs pleines et aucun reflet animé.

Les univers Dakar → Sénégal → Accessoires tournent automatiquement toutes les **6 secondes**, avec fermeture/réouverture du volume (environ 0,95 s) et changement de photo. L’étoile conserve sa silhouette sur les trois palettes : les collections de la boutique restent distinctes des cinq piliers. Une barre indique le prochain changement. Le survol de la scène, le focus clavier, un geste tactile en cours, la pause générale et la sortie d’écran suspendent le minuteur ; la reprise commence une nouvelle période complète, sans rattrapage accéléré. Les choix manuels restent possibles et relancent cette période. Le bouton Pause agit aussi sur le titre et le rendu GPU. Les changements automatiques ne sont pas annoncés en boucle aux lecteurs d’écran ; les choix manuels disposent d’une annonce polie. La préférence de mouvement réduit désactive également le défilement automatique.

`src/lib/glass-scene-engine.ts` gère les géométries, le matériau physique, le studio de reflets généré en code, la lumière et le cycle de rendu. Un reflet stylisé par shader complète le matériau sans post-traitement lourd. `glass-scene-config.ts` définit palettes, silhouette et limites de résolution. Aucun HDR, modèle externe, CDN, template ou script téléchargé depuis la vidéo n’est utilisé. La licence Three.js est conservée dans `public/licenses/Three-MIT.txt`.

Le moteur vise au maximum 30 images/s sur la petite scène mobile et 45 sur desktop, avec DPR plafonné à 1,25 / 1,5 ; ce ne sont pas des performances garanties sur tous les appareils. Les animations arrêtées, hors écran ou onglet masqué n’entretiennent pas de boucle de rendu. Géométries, textures, matériaux, contexte, observateurs et écouteurs sont libérés au démontage et en cas d’erreur de rendu. `hero-emblem.tsx` fournit un emblème SVG statique léger, présent dès le HTML et remplacé quand le canvas est prêt : le collage photographique précédent et ses styles ont été supprimés, pas seulement cachés. Ce même emblème sert de repli sans WebGL, en cas de perte de contexte, sans JavaScript ou avec mouvement réduit. Les cinq noms de piliers, le lien Boutique, le titre, la petite photo de collection et les liens restent disponibles ; les médias originaux ne sont pas supprimés.

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


## Espace client — extension locale du 21/10/2026

Entrée « Mon compte » dans le header ordinateur/mobile, routes `/compte`, `/compte/connexion`, `/compte/inscription` et `/compte/recuperation`. Le parcours reprend la présentation crème/vert profond du site. L’administration reste séparée.

- **Livraison actuelle sans envoi d’e-mail** : comptes, favoris, historiques et demandes WhatsApp restent utilisables. Le BFF `GET /api/customer/config` ne transmet que la disponibilité de l’envoi ; sur erreur, les actions d’envoi restent désactivées. Aucun secret SMTP n’est exposé.
- Inscription et connexion par e-mail/mot de passe. Confirmation d’adresse et récupération par liens e-mail à usage unique, avec erreurs honnêtes si SMTP n’est pas configuré. Aucun mot de passe, jeton ou historique dans le stockage Web.
- Session côté serveur via BFF `/api/customer/*`, cookie HttpOnly, Secure en production, SameSite Lax et chemin `/api/customer`, distinct du cookie administrateur. Origine exacte obligatoire sur toute écriture, routes/méthodes autorisées explicitement, corps JSON borné, projections de réponses strictes, pas de cache privé.
- Cliquer sur un cœur hors connexion conduit à la connexion/inscription ; la fiche et l’intention de favori sont reprises ensuite. Les favoris sont conservés par compte et relus avec prix/disponibilité actuels. Une sélection de l’ancienne version peut être importée explicitement depuis le panneau « Ma sélection ».
- Espace personnel : favoris, 30 consultations récentes avec effacement/désactivation, 50 demandes WhatsApp préparées, profil, changement de mot de passe et suppression du compte. Les réponses tardives d’un ancien compte et les déconnexions entre onglets sont prises en compte ; aucune fusion automatique d’un appareil partagé.
- WhatsApp garde son lien direct et reste utilisable sans compte. Pour un client connecté, l’ouverture du lien enregistre la préparation et les options côté API ; une panne de cet historique n’empêche pas d’ouvrir WhatsApp. Ni message envoyé ni commande confirmée ne sont annoncés.
- Pages privées non indexables et `no-store` ; PWA exclut explicitement `/compte` et toutes les API. Pas de profil/favoris/historique mis en cache hors connexion.

Tests : `e2e/customer-account.spec.ts`, adaptation des anciens tests de favoris dans `e2e/unified-shop.spec.ts`, unités BFF client et retour interne sécurisé. Les tests navigateur utilisent des données synthétiques sur Chrome ordinateur et Pixel 7 simulé. La recette complète HTTP/SQL locale et les captures sont référencées dans le contexte parent ; elles ne valent pas publication ni acceptation manager.

Le backend et sa migration cliente doivent être livrés avant ce frontend, après accord. La production actuelle continue à servir la version précédemment déployée. La source unique de suivi reste `../ProjetContexte.md`.


### E-mails et suivi des demandes

- Tant que l’envoi est désactivé, aucun lien de récupération ni bouton de confirmation/renvoi n’est proposé ; `/compte/recuperation` affiche l’indisponibilité et l’accès au contact sans formulaire ni faux succès.
- Lorsque l’envoi sera activé, `/compte/recuperation` demandera un lien par e-mail ; `/compte/reinitialiser#token=…` ouvre le choix du nouveau mot de passe. `/compte/confirmer-email#token=…` exige un clic de confirmation. Le fragment est retiré de l’URL après lecture ; aucun jeton conservé dans le stockage navigateur ou le cache PWA.
- Le profil propose le renvoi du lien de confirmation. Après inscription, le site indique si le lien a été mis en file ; si le service est absent, le compte reste utilisable et aucun envoi n’est annoncé.
- `/administration/demandes` affiche les demandes préparées par les clients connectés. L’équipe vérifie WhatsApp et confirme manuellement réception, expédition, livraison ou annulation. Dialogue de confirmation, version contre modifications concurrentes, état d’e-mail et erreurs réessayables. Aucun suivi transporteur ni API WhatsApp supposé.
- Le compte client affiche ces statuts, avec la date de mise à jour. L’administrateur confirme le statut sans annoncer d’e-mail envoyé lorsque l’envoi est désactivé. Les notifications se limitent aux adresses confirmées. Les réglages Gmail et la clé de chiffrement appartiennent uniquement à l’environnement backend ; aucun secret `NEXT_PUBLIC_*`.
- Les migrations backend doivent être appliquées avant déploiement des deux applications ; ne pas redéployer le conteneur PostgreSQL pour exécuter une migration.
