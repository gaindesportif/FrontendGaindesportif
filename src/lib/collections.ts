export type Category = 'all' | 'senegal' | 'dakar' | 'accessoires';
export type CollectionItem = {
  id: string;
  name: string;
  category: Exclude<Category, 'all'>;
  categoryLabel: string;
  image: string;
  alternate: string;
  imageAlt: string;
  colors: string[];
  description: string;
  tag?: string;
};

// Sélection éditoriale des médias fournis, pas une source de prix/stock.
// Semaine 2 : remplacer cette source par le catalogue Nest et conserver les composants.
export const collections: CollectionItem[] = [
  {
    id: 'dakar-noir',
    name: 'Dakar, en toutes lettres.',
    category: 'dakar',
    categoryLabel: 'Collection Dakar',
    image: '/images/dakar-noir.webp',
    alternate: '/images/dakar-street.webp',
    imageAlt: 'T-shirt noir Dakar avec illustration d’un car rapide',
    colors: ['#1d201d', '#f2f0e8'],
    description:
      'Un clin d’œil aux rues de Dakar et à leurs cars rapides. Découvrez le visuel en noir et en blanc.',
    tag: 'Esprit Dakar',
  },
  {
    id: 'senegal-maillot',
    name: 'Le Sénégal, sur le cœur.',
    category: 'senegal',
    categoryLabel: 'Collection Sénégal',
    image: '/images/senegal-vert.webp',
    alternate: '/images/senegal-detail.webp',
    imageAlt: 'Ensemble de football vert aux couleurs du Sénégal',
    colors: ['#14533e', '#ede8d6'],
    description:
      'Du vert, du caractère et la passion du football. Un aperçu de notre univers Sénégal.',
    tag: 'Passion Sénégal',
  },
  {
    id: 'senegal-survetement',
    name: 'L’esprit d’équipe.',
    category: 'senegal',
    categoryLabel: 'Collection Sénégal',
    image: '/images/survetement.webp',
    alternate: '/images/survetement-alt.webp',
    imageAlt: 'Survêtement vert avec emblème du Sénégal',
    colors: ['#155b45', '#191e1a'],
    description:
      'L’allure sportive, sur le terrain comme en dehors. Parlez-nous de vos besoins de tailles et de personnalisation.',
  },
  {
    id: 'tote-lion',
    name: 'Le lion vous accompagne.',
    category: 'accessoires',
    categoryLabel: 'Accessoires',
    image: '/images/tote.webp',
    alternate: '/images/sac.webp',
    imageAlt: 'Sac en toile clair illustré du lion Gaindé Sportif',
    colors: ['#e5dfcb', '#134629'],
    description:
      'Des accessoires qui prolongent l’identité Gaindé. Retrouvez le lion sur un tote bag et un sac de sport.',
  },
  {
    id: 'dakar-blanc',
    name: 'Dakar, version claire.',
    category: 'dakar',
    categoryLabel: 'Collection Dakar',
    image: '/images/dakar-blanc.webp',
    alternate: '/images/dakar-duo.webp',
    imageAlt: 'T-shirt blanc Dakar avec illustration d’un car rapide',
    colors: ['#eeebe2', '#20241f'],
    description:
      'Le même esprit Dakar, dans une version blanche. Découvrez les images de la collection et demandez les disponibilités.',
  },
  {
    id: 'mug-gainde',
    name: 'Une dose de Gaindé.',
    category: 'accessoires',
    categoryLabel: 'Accessoires',
    image: '/images/mug.webp',
    alternate: '/images/gourde.webp',
    imageAlt: 'Mug blanc portant le logo Gaindé Sportif',
    colors: ['#ede8dc', '#195137'],
    description:
      'Du premier café à l’entraînement : le lion s’invite dans le quotidien. Aperçu mug et gourde.',
  },
];
export const categories: { id: Category; label: string }[] = [
  { id: 'all', label: 'Tout découvrir' },
  { id: 'senegal', label: 'Sénégal' },
  { id: 'dakar', label: 'Dakar' },
  { id: 'accessoires', label: 'Accessoires' },
];
export function filterCollections(category: Category = 'all', query = '') {
  const normalize = (s: string) =>
    s
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  const term = normalize(query.trim());
  return collections.filter(
    (item) =>
      (category === 'all' || item.category === category) &&
      normalize(`${item.name} ${item.categoryLabel} ${item.description}`).includes(term),
  );
}
export function isCategory(value: string | null): value is Category {
  return categories.some((c) => c.id === value);
}
