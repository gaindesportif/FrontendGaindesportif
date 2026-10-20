# Frontend — règles de reprise

Lire `../ProjetContexte.md` s'il est disponible, puis README et docs. Maintenir le contexte parent après changement significatif. Respecter Next App Router, TypeScript strict et Tailwind 4 ; CSS éditorial dans la couche components. Ne pas introduire de secrets Neon, prix/stock inventés, faux succès ou paiement fictif. Préserver les médias et licences. Vérifier `npm run check`, Playwright desktop/mobile et les états réseau. Déploiement, DNS et suppression de l’ancien site nécessitent un accord explicite.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
