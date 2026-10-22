import { Link, useLocation } from 'react-router-dom'
import Seo from '../components/Seo'
import { SearchForm } from '../components/Layout'
import { WhatsAppIcon } from '../components/icons'
import { waLink } from '../lib/wa'

// Also rendered inline by detail pages when the slug is unknown. For those, the slug is usually the
// product or brand the shopper wanted, so it pre-fills the search box.
function guessQuery(pathname) {
  const m = pathname.match(/^\/(?:product|brand|artikel)\/([^/]+)/)
  if (!m) return ''
  try {
    return decodeURIComponent(m[1]).replace(/[-_]+/g, ' ').trim()
  } catch {
    return ''
  }
}

export default function NotFound() {
  const { pathname } = useLocation()
  return (
    <div className="band my-2 py-8 sm:py-10">
      <div className="container-page flex flex-col items-center text-center">
        <Seo title="Halaman tidak ditemukan" noindex />
        <p className="text-muted text-[13px] font-bold" aria-hidden>
          Error 404
        </p>
        <h1 tabIndex={-1} className="text-ink mt-1 text-xl font-extrabold focus:outline-none sm:text-2xl">
          Halaman tidak ditemukan
        </h1>
        <p className="text-muted mt-1.5 max-w-md text-sm text-pretty">
          Mungkin alamatnya salah ketik atau halamannya sudah dipindah. Coba cari produk yang kamu butuhkan:
        </p>
        <SearchForm withButton defaultQuery={guessQuery(pathname)} className="mt-4 max-w-md" />
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Link to="/" className="btn-primary">
            Ke Beranda
          </Link>
          <Link to="/katalog" className="btn-ghost">
            Lihat Katalog
          </Link>
        </div>
        <p className="text-muted mt-5 text-sm">
          Butuh bantuan?{' '}
          <a
            href={waLink('Halo admin Complete Selular, saya tidak menemukan halaman yang saya cari di website.')}
            target="_blank"
            rel="noopener"
            className="text-wa-700 inline-flex items-center gap-1 font-bold underline-offset-2 hover:underline pointer-coarse:min-h-11"
          >
            <WhatsAppIcon className="size-4" />
            Tanya admin via WhatsApp
          </a>
        </p>
      </div>
    </div>
  )
}
