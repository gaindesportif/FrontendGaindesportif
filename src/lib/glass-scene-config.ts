export type GlassUniverse = 'dakar' | 'senegal' | 'accessoires';

export const glassPalettes = {
  dakar: { glass: '#24785d', edge: '#d6efcc', accent: '#e5bd65' },
  senegal: { glass: '#178a61', edge: '#a9e8c7', accent: '#edd376' },
  accessoires: { glass: '#9c7538', edge: '#f7dfb3', accent: '#9cd3b9' },
} as const satisfies Record<GlassUniverse, { glass: string; edge: string; accent: string }>;

/** Silhouette originale : étoile à cinq branches, pas le symbole de la référence. */
export function starOutline(outer = 1.65, inner = 0.8) {
  return Array.from({ length: 10 }, (_, index) => {
    const angle = Math.PI / 2 + (index * Math.PI) / 5;
    const radius = index % 2 === 0 ? outer : inner;
    return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
  });
}

export function scenePixelRatio(deviceRatio: number, width: number) {
  return Math.min(Math.max(deviceRatio, 1), width < 760 ? 1.25 : 1.5);
}

/** Refermer puis rouvrir le volume permet un changement de forme sans coupure nette. */
export function transitionPose(progress: number) {
  const normalized = Math.min(Math.max(progress, 0), 1);
  return {
    scale: Math.max(0.04, Math.abs(Math.cos(normalized * Math.PI))),
    turn: Math.sin(normalized * Math.PI * 2) * 0.8,
  };
}
