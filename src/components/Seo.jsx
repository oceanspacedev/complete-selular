import { Helmet } from 'react-helmet-async'
import { useLocation } from 'react-router-dom'
import { buildHead } from '../lib/seo'

// title/description/image as before; plus
//   type     og:type — 'website' | 'product' | 'article'
//   noindex  for 404 / empty utility pages
//   jsonLd   schema.org object (or array) rendered as application/ld+json
export default function Seo({ title, description, image, type, noindex, jsonLd }) {
  const { pathname } = useLocation()
  const head = buildHead({ title, description, image, type, noindex, path: pathname })
  return (
    <Helmet>
      <title>{head.title}</title>
      {head.meta.map((m) => (
        <meta key={m.name ?? m.property} {...m} />
      ))}
      {head.links.map((l) => (
        <link key={l.rel} {...l} />
      ))}
      {jsonLd && <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>}
    </Helmet>
  )
}
