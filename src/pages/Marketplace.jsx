import { ExternalLink } from 'lucide-react'
import site from '../data/site.json'
import PageHeader from '../components/PageHeader'
import SectionHeader from '../components/SectionHeader'
import Img from '../components/Img'
import Seo from '../components/Seo'

// Older snapshots stored slug-like payment names; map them to the names customers know.
const PAYMENT_NAMES = {
  kredivo: 'Kredivo',
  akulaku: 'Akulaku',
  spaylater: 'SPayLater',
  homecredit: 'Home Credit',
  blibliinstore: 'Blibli InStore',
  baf: 'BAF',
  travelokaspayl: 'Traveloka PayLater',
  samsungfplus: 'Samsung Finance+',
}
const paymentName = (name) => PAYMENT_NAMES[name] ?? name

export default function Marketplace() {
  return (
    <>
      <Seo
        title="Marketplace Resmi"
        description="Belanja di toko resmi Complete Selular di Tokopedia, Shopee, Lazada, Blibli, dan TikTok Shop."
      />
      <PageHeader title="Marketplace Resmi" />

      <section className="band mt-2 py-4 sm:py-6">
        <div className="container-page">
          <SectionHeader title="Toko resmi kami" />
          <ul className="grid gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
            {site.marketplaces.map((m) => (
              <li key={m.name}>
                <a
                  href={m.url}
                  target="_blank"
                  rel="noopener"
                  className="group border-line hover:border-brand-300 flex h-full items-center gap-3 rounded-lg border bg-white p-3 transition-colors"
                >
                  <span className="flex h-10 w-20 shrink-0 items-center justify-center">
                    {m.img ? (
                      <Img img={m.img} alt="" className="max-h-8 w-auto max-w-full object-contain" />
                    ) : (
                      <span className="text-ink text-sm font-bold" aria-hidden>
                        {m.name}
                      </span>
                    )}
                  </span>
                  <span className="text-ink min-w-0 flex-1 text-sm font-bold">{m.name}</span>
                  <span className="text-brand-600 group-hover:text-brand-700 inline-flex shrink-0 items-center gap-1 text-[13px] font-bold group-hover:underline">
                    Buka toko
                    <ExternalLink className="size-3.5" aria-hidden />
                  </span>
                  <span className="sr-only">(buka di tab baru)</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="band mt-2 mb-2 py-4 sm:py-6">
        <div className="container-page">
          <SectionHeader title="Cicilan & pembayaran di toko" />
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3 lg:grid-cols-8">
            {site.payments.map((p) => (
              <li
                key={p.name}
                className="border-line flex flex-col items-center justify-center gap-1.5 rounded-lg border px-2 py-3 text-center"
              >
                <Img img={p.img} alt="" className="h-8 w-auto max-w-full object-contain" />
                <span className="text-ink text-xs">{paymentName(p.name)}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  )
}
