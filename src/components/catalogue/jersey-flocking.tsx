'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { formatXof } from '@/lib/catalogue';
import { validFlockingName, validFlockingNumber, type Flocking } from '@/lib/jersey-flocking';
import {
  matchJerseyColor,
  standardJerseyPreview,
  type JerseyPreviewAsset,
} from './jersey-preview-assets';
import styles from './catalogue.module.css';

const JerseyPreview = dynamic(
  () => import('./jersey-preview').then((module) => module.JerseyPreview),
  {
    ssr: false,
    loading: () => <p role="status">Chargement du visualiseur 3D…</p>,
  },
);

export function JerseyFlocking({
  enabled,
  priceXof,
  flocking,
  exactPreview,
  productColor,
  fallbackColor,
  selectProductColor,
  onToggle,
  onChange,
}: {
  enabled: boolean;
  priceXof: number;
  flocking: Flocking;
  exactPreview?: JerseyPreviewAsset;
  productColor: string;
  fallbackColor?: string | null;
  selectProductColor: boolean;
  onToggle: (enabled: boolean) => void;
  onChange: (flocking: Flocking) => void;
}) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [useStandard, setUseStandard] = useState(false);
  const selectedColor = matchJerseyColor(productColor) ?? matchJerseyColor(fallbackColor ?? '');
  const exact = !useStandard && exactPreview;
  const preview = selectProductColor
    ? undefined
    : exact || (selectedColor && standardJerseyPreview(selectedColor));
  const validName = validFlockingName(flocking.name);
  const validNumber = validFlockingNumber(flocking.number);

  return (
    <fieldset className={styles.flocking}>
      <legend>Flocage</legend>
      <div className={styles.flockingChoices}>
        <label>
          <input
            type="radio"
            name="product-flocking"
            checked={!enabled}
            onChange={() => {
              onToggle(false);
              setPreviewOpen(false);
            }}
          />
          Sans flocage
        </label>
        <label>
          <input
            type="radio"
            name="product-flocking"
            checked={enabled}
            onChange={() => onToggle(true)}
          />
          Avec flocage
        </label>
      </div>
      <p>Supplément avec flocage : {formatXof(priceXof)} par maillot.</p>
      {enabled && (
        <>
          <div className={styles.flockingFields}>
            <label className={styles.field}>
              Nom à floquer
              <input
                maxLength={24}
                autoComplete="off"
                value={flocking.name}
                aria-invalid={!!flocking.name && !validName}
                aria-describedby="flocking-hint"
                onChange={(event) => onChange({ ...flocking, name: event.target.value })}
              />
            </label>
            <label className={styles.field}>
              Numéro à floquer
              <input
                maxLength={2}
                inputMode="numeric"
                autoComplete="off"
                value={flocking.number}
                aria-invalid={!!flocking.number && !validNumber}
                aria-describedby="flocking-hint"
                onChange={(event) => onChange({ ...flocking, number: event.target.value })}
              />
            </label>
          </div>
          <p id="flocking-hint">Nom de 24 caractères maximum et numéro de 1 ou 2 chiffres.</p>
          <button
            className="button button-outline"
            type="button"
            disabled={!preview || (!previewOpen && (!validName || !validNumber))}
            aria-expanded={previewOpen}
            aria-controls="jersey-preview"
            onClick={() => {
              setUseStandard(false);
              setPreviewOpen(!previewOpen);
            }}
          >
            {previewOpen ? 'Fermer l’aperçu 3D' : 'Aperçu 3D à 360°'}
          </button>
          {!preview && (
            <p>
              {selectProductColor
                ? 'Choisissez la couleur du produit pour afficher son aperçu.'
                : 'La couleur de ce maillot reste à préciser pour activer l’aperçu 3D.'}
            </p>
          )}
          <div id="jersey-preview" hidden={!previewOpen || !preview}>
            {previewOpen && preview && (
              <>
                <p>{preview.description}</p>
                <JerseyPreview
                  key={exact ? exact.description : selectedColor?.name}
                  asset={preview}
                  onStandard={
                    'url' in preview && selectedColor ? () => setUseStandard(true) : undefined
                  }
                  flocking={{
                    name: validName ? flocking.name.trim() : '',
                    number: validNumber ? flocking.number : '',
                  }}
                />
              </>
            )}
          </div>
        </>
      )}
    </fieldset>
  );
}
