// Mise en scène des photographies existantes, pas un catalogue ni des modèles de produits 3D.
export const heroUniverses = [
  {
    id: 'dakar',
    label: 'Dakar',
    title: 'L’énergie de la ville.',
    image: '/images/hero-dakar.webp',
    detail: '/images/dakar-noir.webp',
    alt: 'Deux personnes portant les t-shirts Dakar noir et blanc dans le Grand Dakar',
    description: 'Les rues de Dakar, les couleurs d’ici. Une identité qui ne passe pas inaperçue.',
    heading: 'Dans la rue.',
  },
  {
    id: 'senegal',
    label: 'Sénégal',
    title: 'Tout un pays sur le cœur.',
    image: '/images/survetement.webp',
    detail: '/images/senegal-vert.webp',
    alt: 'Ensemble sportif vert aux couleurs et à l’emblème du Sénégal',
    description: 'L’esprit du collectif. La passion du terrain. Le Sénégal dans l’âme.',
    heading: 'Sur le terrain.',
  },
  {
    id: 'accessoires',
    label: 'Accessoires',
    title: 'Le lion vous accompagne.',
    image: '/images/tote.webp',
    detail: '/images/mug.webp',
    alt: 'Sac en toile clair avec le lion Gaindé Sportif',
    description: 'Des détails qui font la différence, pour emporter un peu de Gaindé partout.',
    heading: 'Au quotidien.',
  },
] as const;
