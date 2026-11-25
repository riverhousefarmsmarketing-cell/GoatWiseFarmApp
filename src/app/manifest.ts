import type { MetadataRoute } from 'next';

// Web app manifest (Next serves this at /manifest.webmanifest and links it
// automatically). Makes GoatWise installable to a phone home screen and run
// standalone.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'GoatWise — Farm Management',
    short_name: 'GoatWise',
    description: 'Track your herd health, breeding, milk production and finances.',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color: '#105040',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
