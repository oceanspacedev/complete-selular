import { Helmet } from 'react-helmet-async'
const SITE = 'Complete Selular'
const DEFAULT_DESC =
  'Toko smartphone, tablet & aksesoris resmi dengan 60+ cabang. Harga terbaik, cicilan mudah, dan garansi resmi.'
export default function Seo({ title, description = DEFAULT_DESC, image }) {
  const full = title ? `${title} | ${SITE}` : `${SITE} — Toko HP & Gadget Resmi`
  return (
    <Helmet>
      <title>{full}</title>
      <meta name="description" content={description} />
      <meta property="og:title" content={full} />
      <meta property="og:description" content={description} />
      <meta property="og:site_name" content={SITE} />
      {image && <meta property="og:image" content={image} />}
    </Helmet>
  )
}
