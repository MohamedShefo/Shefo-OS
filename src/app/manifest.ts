import type { MetadataRoute } from 'next';

/**
 * PWA installability foundation (no service worker / offline sync yet —
 * explicitly out of scope). Icons resolve to the generated app icon.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Shefo OS',
    short_name: 'Shefo OS',
    description: 'Personal Operating System & External Cognitive Cortex',
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0a0a',
    theme_color: '#0a0a0a',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  };
}
