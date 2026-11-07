import type { MetadataRoute } from 'next';

// Lets GoatWise be added to a phone's home screen and open like an app.
// (On iPhone, notifications only work once it's been added this way.)
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'GoatWise',
    short_name: 'GoatWise',
    description: 'Farm management for goat farms',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    background_color: '#FAFAF9',
    theme_color: '#105040',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
