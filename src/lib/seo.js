// Plain JS (no JSX) so both <Seo> and scripts/prerender.mjs build identical head tags.

export const SITE_NAME = 'Complete Selular'
// Vite exposes VITE_SITE_URL in the browser build; the Node prerender script uses SITE_URL.
export const SITE_URL = (
  import.meta.env?.VITE_SITE_URL ||
  globalThis.process?.env?.SITE_URL ||
  'https://completeselular.co.id'
).replace(/\/$/, '')
export const DEFAULT_DESCRIPTION =
  'Toko smartphone, tablet & aksesoris resmi dengan 60+ cabang. Harga terbaik, cicilan mudah, dan garansi resmi.'
export const DEFAULT_IMAGE = '/img/og-default.jpg'

// Collapse whitespace and cut on a word boundary.
export function clampText(text = '', max = 160) {
  const s = String(text).replace(/\s+/g, ' ').trim()
  if (s.length <= max) return s
  return s.slice(0, s.lastIndexOf(' ', max - 1)).replace(/[\s,.;:–-]+$/, '') + '…'
}

export const absoluteUrl = (pathOrUrl) => new URL(pathOrUrl, SITE_URL + '/').href

// Short enough that Google shows it whole: "Harga Samsung Galaxy A27 5G 8/256GB | Complete Selular"
export const productTitle = (name) => `Harga ${name}`

export function pageTitle(title) {
  return title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} — Toko HP & Gadget Resmi`
}

// Returns { title, meta: [{name|property, content}], links: [{rel, href}] }
export function buildHead({ title, description, image, path = '/', type = 'website', noindex = false }) {
  const full = pageTitle(title)
  const desc = clampText(description || DEFAULT_DESCRIPTION, 160)
  const url = absoluteUrl(path)
  const img = absoluteUrl(image || DEFAULT_IMAGE)
  return {
    title: full,
    meta: [
      { name: 'description', content: desc },
      { property: 'og:title', content: full },
      { property: 'og:description', content: desc },
      { property: 'og:type', content: type },
      { property: 'og:url', content: url },
      { property: 'og:image', content: img },
      { property: 'og:site_name', content: SITE_NAME },
      { property: 'og:locale', content: 'id_ID' },
      { name: 'twitter:card', content: 'summary_large_image' },
      ...(noindex ? [{ name: 'robots', content: 'noindex' }] : []),
    ],
    links: noindex ? [] : [{ rel: 'canonical', href: url }],
  }
}
