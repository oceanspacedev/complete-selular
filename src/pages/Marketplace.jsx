import { ExternalLink } from 'lucide-react'
import site from '../data/site.json'
import PageHeader from '../components/PageHeader'
import Img from '../components/Img'
import Seo from '../components/Seo'

export default function Marketplace() {
  return (
    <>
      <Seo
        title="Marketplace Resmi"
        description="Belanja di toko resmi Complete Selular di Tokopedia, Shopee, Lazada, Blibli, dan TikTok Shop."
      />
      <PageHeader
        title="Belanja Dimanapun, Kapanpun!"
        subtitle="Complete Selular Official Store hadir di marketplace favoritmu."
      />
      <div className="container-page py-10">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {site.marketplaces.map((m) => (
            <a
              key={m.name}
              href={m.url}
              target="_blank"
              rel="noopener"
              className="group card flex items-center gap-5 p-6 transition-shadow hover:shadow-[var(--shadow-lift)]"
            >
              <div className="flex h-14 w-28 shrink-0 items-center justify-center">
                {m.img ? (
                  <Img img={m.img} alt={m.name} className="max-h-full w-auto object-contain" />
                ) : (
                  <span className="font-bold">{m.name}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-900">{m.name}</p>
                <p className="text-sm text-slate-500">Complete Selular Official</p>
              </div>
              <ExternalLink className="group-hover:text-brand-600 size-5 text-slate-300" />
            </a>
          ))}
        </div>

        <h2 className="mt-14 mb-4 text-lg font-bold text-slate-900">Cicilan & pembayaran di toko</h2>
        <div className="flex flex-wrap gap-3">
          {site.payments.map((p) => (
            <span key={p.name} className="card px-4 py-3">
              <Img img={p.img} alt={p.name} className="h-7 w-auto" />
            </span>
          ))}
        </div>
      </div>
    </>
  )
}
