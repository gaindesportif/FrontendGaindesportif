import localFont from 'next/font/local';
export const bodyFont = localFont({
  src: '../../public/fonts/manrope-latin.woff2',
  weight: '400 800',
  display: 'swap',
  variable: '--font-body',
});
export const titleFont = localFont({
  src: [
    { path: '../../public/fonts/barlow-500.woff2', weight: '500', style: 'normal' },
    { path: '../../public/fonts/barlow-600.woff2', weight: '600', style: 'normal' },
  ],
  display: 'swap',
  variable: '--font-title',
});
