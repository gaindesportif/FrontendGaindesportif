type JerseyColor = {
  name: string;
  fabric: string;
  trim: string;
  lettering: string;
  aliases?: readonly string[];
};

const lightLettering = '#fff8ee';
const darkLettering = '#162521';
const defaultColor: JerseyColor = {
  name: 'Vert',
  fabric: '#165647',
  trim: '#c9a774',
  lettering: lightLettering,
  aliases: ['green', 'vert fonce', 'vert bouteille', 'vert foret'],
};

export const jerseyColors: readonly JerseyColor[] = [
  {
    name: 'Blanc',
    fabric: '#f7f4ed',
    trim: '#d7d7d1',
    lettering: darkLettering,
    aliases: ['white', 'blanche'],
  },
  {
    name: 'Écru',
    fabric: '#eae2ca',
    trim: '#b9a781',
    lettering: darkLettering,
    aliases: ['creme', 'ivoire', 'cream', 'ivory', 'off white'],
  },
  {
    name: 'Noir',
    fabric: '#21262b',
    trim: '#555c63',
    lettering: lightLettering,
    aliases: ['black', 'noire'],
  },
  {
    name: 'Gris',
    fabric: '#999fa6',
    trim: '#6c747c',
    lettering: darkLettering,
    aliases: ['grey', 'gray', 'gris clair', 'grise'],
  },
  {
    name: 'Gris anthracite',
    fabric: '#353b41',
    trim: '#626a72',
    lettering: lightLettering,
    aliases: ['gris fonce', 'anthracite', 'charcoal'],
  },
  {
    name: 'Bleu',
    fabric: '#2058ac',
    trim: '#5283c8',
    lettering: lightLettering,
    aliases: ['blue', 'bleu roi', 'bleu royal', 'royal blue', 'bleue'],
  },
  {
    name: 'Bleu marine',
    fabric: '#172a4d',
    trim: '#3d557d',
    lettering: lightLettering,
    aliases: ['marine', 'navy', 'navy blue', 'bleu nuit', 'bleu fonce'],
  },
  {
    name: 'Bleu ciel',
    fabric: '#8fc9e9',
    trim: '#4d9acb',
    lettering: darkLettering,
    aliases: ['sky blue', 'light blue', 'bleu clair', 'bleu pastel'],
  },
  {
    name: 'Turquoise',
    fabric: '#48bdbe',
    trim: '#258a91',
    lettering: darkLettering,
    aliases: ['teal', 'bleu turquoise', 'vert turquoise'],
  },
  {
    name: 'Rouge',
    fabric: '#c8273f',
    trim: '#ec6470',
    lettering: lightLettering,
    aliases: ['red', 'rouge vif'],
  },
  {
    name: 'Bordeaux',
    fabric: '#742738',
    trim: '#aa5260',
    lettering: lightLettering,
    aliases: ['burgundy', 'maroon', 'rouge bordeaux', 'rouge fonce', 'grenat'],
  },
  defaultColor,
  {
    name: 'Vert clair',
    fabric: '#8fc081',
    trim: '#5f9860',
    lettering: darkLettering,
    aliases: ['light green', 'vert pomme', 'vert pastel'],
  },
  {
    name: 'Jaune',
    fabric: '#f0d23d',
    trim: '#d2a926',
    lettering: darkLettering,
    aliases: ['yellow', 'jaune vif', 'jaune citron'],
  },
  {
    name: 'Or',
    fabric: '#d0a640',
    trim: '#ab7d2f',
    lettering: darkLettering,
    aliases: ['gold', 'dore', 'doree', 'jaune or'],
  },
  {
    name: 'Orange',
    fabric: '#eb7d31',
    trim: '#b55223',
    lettering: darkLettering,
    aliases: ['orange vif'],
  },
  {
    name: 'Rose',
    fabric: '#e5a0b9',
    trim: '#c05c8a',
    lettering: darkLettering,
    aliases: ['pink', 'rose clair', 'rose pastel'],
  },
  {
    name: 'Violet',
    fabric: '#6546a1',
    trim: '#8a70be',
    lettering: lightLettering,
    aliases: ['purple', 'violette'],
  },
  {
    name: 'Marron',
    fabric: '#6b4634',
    trim: '#9a6e53',
    lettering: lightLettering,
    aliases: ['brown', 'brun', 'brune'],
  },
  {
    name: 'Beige',
    fabric: '#d8c3a5',
    trim: '#ad9473',
    lettering: darkLettering,
    aliases: ['sable', 'sand'],
  },
];

function colorKey(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/[\s_-]+/g, ' ');
}

export function matchJerseyColor(label: string) {
  const key = colorKey(label);
  return jerseyColors.find((color) => colorKey(color.name) === key || color.aliases?.includes(key));
}

export type JerseyDesign = { main: string; trim: string };
export type JerseyPreviewAsset =
  | { url: `/models/jerseys/${string}.glb`; letteringColor: string; description: string }
  | { design: JerseyDesign; letteringColor: string; description: string };

type ExactPreview = Extract<JerseyPreviewAsset, { url: string }> & { color: string };

// Pour les futurs modèles exacts, lier une référence publique et une couleur vérifiées.
const exactPreviews: Record<string, readonly ExactPreview[] | undefined> = {};

export function getExactJerseyPreview(productId: string, color: string) {
  return exactPreviews[productId]?.find((preview) => preview.color === color);
}

const standardPreviews = new Map<JerseyColor, JerseyPreviewAsset>(
  jerseyColors.map((color) => [
    color,
    {
      design: { main: color.fabric, trim: color.trim },
      letteringColor: color.lettering,
      description:
        'Maillot standard pour visualiser le flocage. Consultez les photos pour les détails du produit.',
    },
  ]),
);

export function standardJerseyPreview(color?: JerseyColor) {
  return standardPreviews.get(color ?? defaultColor)!;
}

export const defaultJerseyColor = defaultColor.name;
