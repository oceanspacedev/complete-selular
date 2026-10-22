import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// One variable for the whole build: SITE_URL also feeds import.meta.env.VITE_SITE_URL, so the
// canonicals <Seo> renders at runtime match the ones scripts/prerender.mjs writes.
if (process.env.SITE_URL && !process.env.VITE_SITE_URL) process.env.VITE_SITE_URL = process.env.SITE_URL

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Tailwind v4 runs as a Vite plugin; an empty PostCSS config stops Vite from
  // picking up stray postcss.config files in parent folders.
  css: { postcss: {} },
  build: {
    // scripts/prerender.mjs reads it to modulepreload each route's lazy chunk, then deletes it.
    manifest: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom', 'react-helmet-async'],
        },
      },
    },
  },
})
