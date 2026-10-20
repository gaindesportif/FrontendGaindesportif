import { z } from 'zod';
import { contactDetails } from '@/lib/contact';

export const catalogueCategories = [
  { value: 'senegal', label: 'Sénégal' },
  { value: 'dakar', label: 'Dakar' },
  { value: 'accessoires', label: 'Accessoires' },
  { value: 'equipements', label: 'Équipements' },
  { value: 'personnalisation', label: 'Personnalisation' },
  { value: 'merchandising', label: 'Produits dérivés' },
] as const;

const cloudinaryUrl = z
  .url()
  .max(2000)
  .refine((value) => {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      url.hostname === 'res.cloudinary.com' &&
      !url.username &&
      !url.password
    );
  });

export const publicMediaSchema = z.object({
  id: z.string().min(1).max(200),
  type: z.enum(['image', 'video']),
  url: cloudinaryUrl,
  alt: z.string().max(500),
  position: z.number().int().nonnegative(),
});

// La projection exclut les identifiants Cloudinary internes et les champs d'administration.
export const publicProductSchema = z.object({
  id: z.string().min(1).max(200),
  slug: z
    .string()
    .min(1)
    .max(220)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().min(2).max(160),
  description: z.string().max(5000),
  category: z.enum([
    'senegal',
    'dakar',
    'accessoires',
    'equipements',
    'personnalisation',
    'merchandising',
  ]),
  priceXof: z.number().int().positive(),
  sizes: z.array(z.string().min(1).max(60)).max(30),
  colors: z.array(z.string().min(1).max(60)).max(30),
  availability: z.enum(['on_request', 'available', 'unavailable']),
  status: z.literal('published'),
  media: z
    .array(publicMediaSchema)
    .min(1)
    .max(8)
    .refine((items) => items.some((item) => item.type === 'image')),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const catalogueResponseSchema = z.object({
  items: z.array(publicProductSchema).max(100),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().min(1).max(100),
});

export type PublicProduct = z.infer<typeof publicProductSchema>;
export type PublicMedia = z.infer<typeof publicMediaSchema>;
export type CatalogueResponse = z.infer<typeof catalogueResponseSchema>;

export function catalogueCategoryLabel(category: string) {
  return catalogueCategories.find((item) => item.value === category)?.label || category;
}

export function formatXof(value: number) {
  return `${new Intl.NumberFormat('fr-SN', { maximumFractionDigits: 0 }).format(value)} F CFA`;
}

export function productWhatsappUrl(
  product: PublicProduct,
  selection: { quantity: number; size: string; color: string },
  origin: string,
) {
  if (
    product.availability === 'unavailable' ||
    !Number.isInteger(selection.quantity) ||
    selection.quantity < 1 ||
    selection.quantity > 99 ||
    (product.sizes.length > 0 && !product.sizes.includes(selection.size)) ||
    (product.colors.length > 0 && !product.colors.includes(selection.color))
  )
    return null;
  const productUrl = new URL(`/boutique/${encodeURIComponent(product.slug)}`, origin);
  const lines = [
    'Bonjour Gainde Sportif, je souhaite commander ce produit :',
    `Produit : ${product.name}`,
    `Référence : ${product.id}`,
    `Prix unitaire affiché : ${formatXof(product.priceXof)}`,
    `Quantité souhaitée : ${selection.quantity}`,
    ...(product.sizes.length ? [`Taille : ${selection.size}`] : []),
    ...(product.colors.length ? [`Couleur : ${selection.color}`] : []),
    `Sous-total produits : ${formatXof(product.priceXof * selection.quantity)}`,
    `Fiche produit : ${productUrl.href}`,
    'Merci de confirmer la disponibilité, le règlement et la livraison ou le retrait.',
  ];
  const whatsapp = new URL(contactDetails.whatsapp);
  whatsapp.searchParams.set('text', lines.join('\n'));
  return whatsapp.href;
}
