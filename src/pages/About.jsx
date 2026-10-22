import { Link } from 'react-router-dom'
import site from '../data/site.json'
import { brands } from '../data/brands.json'
import { waLink } from '../lib/wa'
import Breadcrumbs from '../components/Breadcrumbs'
import SectionHeader from '../components/SectionHeader'
import Img from '../components/Img'
import Seo from '../components/Seo'
import { WhatsAppIcon } from '../components/icons'

// Same rhythm as Home: white bands on the grey canvas, 8px apart
const SECTION = 'band mt-2 py-6 sm:py-10'

// One plain line under each value, so the three words read as promises rather than labels
const VALUE_NOTES = {
  bersahabat: 'Pelayanan ramah di setiap cabang — tanya apa saja, tanpa harus langsung beli.',
  orisinil: 'Hanya produk resmi bergaransi dari distributor dan brand-nya langsung.',
  terkini: 'Seri terbaru dari brand ternama hadir lebih cepat di toko kami.',
}

export default function About() {
  const { about, rating } = site
  const values = about.values ?? []
  const missions = about.missions ?? []
  const logos = brands.filter((b) => site.brandLogos[b.slug]).sort((a, b) => b.total - a.total)
  const stats = [
    [String(site.since), 'Berdiri sejak'],
    [site.branchCount, 'Cabang toko'],
    [`${rating.score.toLocaleString('id-ID')}/5`, `${rating.count.toLocaleString('id-ID')} ulasan Google`],
  ]

  return (
    <>
      <Seo title="Tentang Kami" description={about.tagline} />

      {/* Navy hero continues the header band: the company in one sentence, its numbers, its store */}
      <section className="bg-navy-800 text-white">
        <div className="container-page grid gap-6 py-6 sm:py-10 md:grid-cols-[1fr_minmax(0,18rem)] md:items-center md:gap-8 lg:grid-cols-[1fr_minmax(0,30rem)] lg:gap-12">
          <div>
            <Breadcrumbs onDark items={[{ label: 'Tentang Kami' }]} />
            <h1 className="mt-2 text-2xl leading-tight font-extrabold sm:text-4xl">Tentang Complete Selular</h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/80 sm:text-base">{about.tagline}</p>
            <dl className="mt-6 grid max-w-lg grid-cols-3 divide-x divide-white/15 border-y border-white/15 py-4">
              {stats.map(([value, label]) => (
                <div key={label} className="flex flex-col px-3 first:pl-0">
                  <dt className="order-last mt-1 text-xs leading-snug text-white/70">{label}</dt>
                  <dd className="text-xl font-extrabold tabular-nums sm:text-2xl">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
          {about.image && (
            <Img
              img={about.image}
              eager
              sizes="(min-width: 1024px) 480px, (min-width: 768px) 288px, (min-width: 640px) calc(100vw - 3rem), calc(100vw - 2rem)"
              alt="Tampak depan toko Complete Selular dengan papan merek OPPO, vivo, realme, Infinix, TECNO, dan itel"
              className="aspect-[16/9] w-full rounded-lg object-cover md:aspect-[4/3]"
            />
          )}
        </div>
      </section>

      <section className={SECTION}>
        <div className="container-page grid gap-4 lg:grid-cols-[16rem_1fr] lg:gap-12">
          <h2 className="text-ink text-lg font-extrabold sm:text-xl">Cerita kami</h2>
          <p className="text-ink max-w-[65ch] text-[15px] leading-7">{about.intro}</p>
        </div>
      </section>

      {(about.vision || missions.length > 0) && (
        <section className={SECTION}>
          <div className="container-page grid gap-8 lg:grid-cols-[16rem_1fr] lg:gap-12">
            {about.vision && (
              <>
                <h2 className="text-ink text-lg font-extrabold sm:text-xl">Visi</h2>
                <blockquote className="border-brand-600 text-ink max-w-[60ch] border-l-4 pl-4 text-lg leading-snug font-bold sm:text-xl">
                  {about.vision}
                </blockquote>
              </>
            )}
            {missions.length > 0 && (
              <>
                <h2 className="text-ink text-lg font-extrabold sm:text-xl">Misi</h2>
                <ol className="grid gap-x-6 sm:grid-cols-2">
                  {missions.map((m, i) => (
                    <li key={m} className="border-line flex gap-3 border-t py-3 text-sm leading-relaxed">
                      <span className="text-brand-600 w-6 shrink-0 font-extrabold tabular-nums">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span className="text-ink">{m}</span>
                    </li>
                  ))}
                </ol>
              </>
            )}
          </div>
        </section>
      )}

      {values.length > 0 && (
        <section className={SECTION}>
          <div className="container-page grid gap-4 lg:grid-cols-[16rem_1fr] lg:gap-12">
            <h2 className="text-ink text-lg font-extrabold sm:text-xl">Nilai kami</h2>
            <ul className="grid gap-3 sm:grid-cols-3">
              {values.map((v) => (
                <li key={v} className="border-line rounded-lg border p-4">
                  <p className="text-brand-700 text-base font-extrabold">{v}</p>
                  {VALUE_NOTES[v.toLowerCase()] && (
                    <p className="text-muted mt-1 text-sm leading-relaxed">{VALUE_NOTES[v.toLowerCase()]}</p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {logos.length > 0 && (
        <section className={SECTION}>
          <div className="container-page">
            <SectionHeader title="Brand resmi di toko kami" to="/semua-brand" />
            <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
              {logos.map((b) => (
                <li key={b.slug}>
                  <Link
                    to={`/brand/${b.slug}`}
                    className="border-line hover:border-brand-300 flex aspect-[3/2] items-center justify-center overflow-hidden rounded-lg border bg-white transition-colors"
                  >
                    <Img img={site.brandLogos[b.slug]} alt={b.name} className="size-full scale-125 object-contain" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section className="bg-navy-800 mt-2 text-white">
        <div className="container-page flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:py-8">
          <div>
            <h2 className="text-lg font-extrabold sm:text-xl">Mampir ke toko kami</h2>
            <p className="mt-1 text-sm text-white/80">
              Coba langsung produknya di salah satu dari {site.branchCount} cabang Complete Selular.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/daftar-toko-cabang" className="btn text-navy-800 bg-white hover:bg-white/90">
              Cari cabang terdekat
            </Link>
            <a href={waLink()} target="_blank" rel="noopener" className="btn-wa">
              <WhatsAppIcon className="size-4" /> Chat via WhatsApp
              <span className="sr-only"> (buka di tab baru)</span>
            </a>
          </div>
        </div>
      </section>
    </>
  )
}
