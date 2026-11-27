import { z } from 'zod';
export const articleCategories = {
  actualites: 'Actualités',
  interviews: 'Interviews',
  reportages: 'Reportages',
  analyses: 'Analyses',
} as const;
export type ArticleCategory = keyof typeof articleCategories;
export const articleImageSchema = z.object({
  id: z.string().uuid(),
  url: z.url().refine((v) => {
    const u = new URL(v);
    return (
      u.protocol === 'https:' && u.hostname === 'res.cloudinary.com' && !u.username && !u.password
    );
  }),
  alt: z.string(),
  caption: z.string(),
  credit: z.string(),
});
export const articleCardSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().max(160),
  excerpt: z.string(),
  category: z.enum(['actualites', 'interviews', 'reportages', 'analyses']),
  author: z.string(),
  featured: z.boolean().default(false),
  publishedAt: z.string().nullable(),
  updatedAt: z.string(),
  images: z.array(articleImageSchema),
});
export const articleSchema = articleCardSchema.extend({ body: z.string() });
export const articleListSchema = z.object({
  items: z.array(articleCardSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int(),
  pageSize: z.number().int(),
});
export type Article = z.infer<typeof articleSchema>;
export type ArticleCard = z.infer<typeof articleCardSchema>;
export type ArticleImage = z.infer<typeof articleImageSchema>;
export type AdminArticle = Article & { status: 'draft' | 'published'; version: number };
export const articleDate = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat('fr-SN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'Africa/Dakar',
      }).format(new Date(value))
    : '';
export const readingMinutes = (text: string) =>
  Math.max(1, Math.ceil(text.trim().split(/\s+/u).filter(Boolean).length / 220));

export function articleShareImage(source: string) {
  const image = new URL(source);
  const upload = image.pathname.match(/^\/[\w-]+\/image\/upload\//);
  if (!upload) return image.href;
  image.pathname =
    upload[0] + 'c_pad,b_auto,w_1200,h_630,f_jpg,q_auto/' + image.pathname.slice(upload[0].length);
  return image.href;
}
