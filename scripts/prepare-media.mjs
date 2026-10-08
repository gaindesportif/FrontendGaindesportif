import { readdir, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';

// Originaux conservés à la racine du projet. Exécuter depuis ce dépôt.
const source = resolve('../media');
const files = (await readdir(source)).filter((f) => f.endsWith('.jpeg')).sort();
const mapping = {
  logo: 3,
  'hero-dakar': 13,
  'dakar-street': 6,
  'dakar-duo': 15,
  'dakar-noir': 20,
  'dakar-blanc': 34,
  'dakar-portrait': 9,
  'senegal-vert': 44,
  'senegal-detail': 46,
  survetement: 50,
  'survetement-alt': 37,
  tote: 54,
  sac: 56,
  mug: 57,
  gourde: 58,
};
if (files.length !== 59) throw new Error('Vérifier les originaux : 59 médias attendus.');
await mkdir('public/images', { recursive: true });
await mkdir('public/icons', { recursive: true });
for (const [name, index] of Object.entries(mapping)) {
  await sharp(resolve(source, files[index]))
    .rotate()
    .resize({ width: name === 'logo' ? 180 : 1280, withoutEnlargement: true })
    .webp({ quality: 83 })
    .toFile(`public/images/${name}.webp`);
  console.log(`${name} ← ${files[index]}`);
}
for (const size of [192, 512]) {
  await sharp(resolve(source, files[3]))
    .resize(Math.round(size * 0.65), Math.round(size * 0.65), {
      fit: 'contain',
      background: '#ffffff',
    })
    .extend({
      top: Math.ceil(size * 0.175),
      bottom: size - Math.round(size * 0.65) - Math.ceil(size * 0.175),
      left: Math.ceil(size * 0.175),
      right: size - Math.round(size * 0.65) - Math.ceil(size * 0.175),
      background: '#ffffff',
    })
    .png()
    .toFile(`public/icons/icon-${size}.png`);
}
await sharp(resolve(source, files[3]))
  .resize(180, 180, { fit: 'contain', background: '#ffffff' })
  .png()
  .toFile('public/icons/apple-touch-icon.png');
await sharp(resolve(source, files[13]))
  .resize(1200, 630, { fit: 'cover', position: 'attention' })
  .webp({ quality: 83 })
  .toFile('public/images/social.webp');
