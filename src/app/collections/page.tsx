import type { Metadata } from 'next';
import { Suspense } from 'react';
import { CollectionExplorer } from '@/components/collection-explorer';
export const metadata: Metadata = {
  title: 'Les collections',
  description: 'Découvrez les univers Sénégal, Dakar et les accessoires Gaindé Sportif.',
};
export default function CollectionsPage() {
  return (
    <Suspense
      fallback={
        <div className="section">
          <h1>Les collections.</h1>
          <p>Chargement de la sélection…</p>
        </div>
      }
    >
      <CollectionExplorer />
    </Suspense>
  );
}
