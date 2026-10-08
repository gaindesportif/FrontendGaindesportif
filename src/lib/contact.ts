import { z } from 'zod';
export const contactSchema = z
  .object({
    name: z.string().trim().min(2, 'Indiquez au moins 2 caractères.').max(100),
    email: z.email('Indiquez une adresse email valide.').max(254),
    phone: z
      .string()
      .trim()
      .regex(/^[+\d\s().-]{7,25}$/, 'Indiquez un numéro de téléphone valide.'),
    subject: z.enum(['collection', 'personnalisation', 'partenariat', 'autre']),
    message: z
      .string()
      .trim()
      .min(10, 'Écrivez au moins 10 caractères.')
      .max(2000, 'Maximum 2 000 caractères.'),
    consent: z.literal(true, { error: 'Votre accord est nécessaire pour vous recontacter.' }),
    website: z.string().max(0),
  })
  .strict();
export const contactDetails = {
  phone: '+221 77 513 53 53',
  phoneHref: 'tel:+221775135353',
  whatsapp: 'https://wa.me/221775135353',
};
