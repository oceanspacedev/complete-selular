import { Link } from 'react-router-dom'
import site from '../data/site.json'
import { brands } from '../data/brands.json'
import Breadcrumbs from '../components/Breadcrumbs'
import SectionHeader from '../components/SectionHeader'
import Img from '../components/Img'
import Seo from '../components/Seo'

// Same rhythm as Home: white bands on the grey canvas, 8px apart
const SECTION = 'band mt-2 py-6 sm:py-10'

// One plain line under each value, so the three words read as promises rather than labels
const VALUE_NOTES = {
  bersahabat: 'Pelayanan ramah di setiap cabang — tanya apa saja, tanpa harus langsung beli.',
  orisinil: 'Hanya produk resmi bergaransi dari distributor dan brand-nya langsung.',
  terkini: 'Seri terbaru dari brand ternama hadir lebih cepat di toko kami.',
}

// "Sejak 2009, … terkemuka. Complete Selular telah …" → lead sentence + the rest
function splitLead(text = '') {
  const m = text.match(/^(.+?[.!?])\s+(.*)$/s)
  return m ? { lead: m[1], rest: m[2] } : { lead: text, rest: '' }
}

export default function About() {
  const { about, rating } = site
  const values = about.values ?? []
  const intro = splitLead(about.intro)
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
        <div className="container-page max-w-4xl">
          <p className="text-brand-600 text-sm font-bold">Cerita kami</p>
          {/* Editorial opening: the first sentence as the lead, the rest as body text */}
          <p className="text-ink mt-2 text-xl leading-snug font-extrabold text-balance sm:text-2xl">{intro.lead}</p>
          {intro.rest && <p className="text-muted mt-3 text-[15px] leading-7 sm:text-base">{intro.rest}</p>}
        </div>
      </section>

      {about.vision && (
        <section className={SECTION}>
          <div className="container-page">
            <figure className="bg-brand-50 rounded-lg px-5 py-8 text-center sm:px-10 sm:py-12">
              <figcaption className="text-brand-700 text-sm font-bold">Visi kami</figcaption>
              <blockquote className="text-ink mx-auto mt-3 max-w-3xl text-xl leading-snug font-extrabold text-balance sm:text-3xl">
                “{about.vision}”
              </blockquote>
            </figure>
          </div>
        </section>
      )}

      {missions.length > 0 && (
        <section className={SECTION}>
          <div className="container-page">
            <h2 className="text-ink mb-4 text-lg font-extrabold sm:text-xl">Misi kami</h2>
            <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {missions.map((m, i) => (
                <li key={m} className="border-line rounded-lg border bg-white p-4">
                  <span className="text-brand-600 block text-2xl leading-none font-extrabold tabular-nums" aria-hidden>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <p className="text-ink mt-3 text-sm leading-relaxed">{m}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

      {values.length > 0 && (
        <section className={SECTION}>
          <div className="container-page">
            <h2 className="text-ink mb-4 text-lg font-extrabold sm:text-xl">Nilai kami</h2>
            <ul className="grid gap-3 sm:grid-cols-3">
              {values.map((v) => (
                <li key={v} className="border-line rounded-lg border p-4 sm:p-5">
                  <p className="text-brand-700 text-lg font-extrabold">{v}</p>
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
          <h2 className="text-lg font-extrabold sm:text-xl">Mampir ke toko kami</h2>
          <Link to="/daftar-toko-cabang" className="btn text-navy-800 shrink-0 bg-white hover:bg-white/90">
            Cari cabang terdekat
          </Link>
        </div>
      </section>
    </>
  )
}
