import { Link } from 'react-router-dom'
import { Award, Eye, MapPin, Star } from 'lucide-react'
import site from '../data/site.json'
import PageHeader from '../components/PageHeader'
import Img from '../components/Img'
import Seo from '../components/Seo'

export default function About() {
  const { about } = site
  const stats = [
    [Award, site.since, 'Berdiri sejak'],
    [MapPin, site.branchCount, 'Cabang toko'],
    [Star, site.rating.score, 'Rating Google'],
  ]
  return (
    <>
      <Seo title="Tentang Kami" description={about.tagline} />
      <PageHeader title="Tentang Complete Selular" subtitle={about.tagline} />

      <div className="container-page py-10 sm:py-14">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <p className="text-lg leading-relaxed text-slate-700">{about.intro}</p>
            <dl className="mt-8 grid grid-cols-3 gap-4">
              {stats.map(([Icon, v, l]) => (
                <div key={l} className="card flex flex-col items-center p-4 text-center">
                  <Icon className="text-brand-600 size-5" />
                  <dd className="mt-2 text-2xl font-extrabold text-slate-900">{v}</dd>
                  <dt className="text-xs text-slate-500">{l}</dt>
                </div>
              ))}
            </dl>
          </div>
          {about.image && <Img img={about.image} alt="Complete Selular" className="w-full rounded-3xl" />}
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-[1fr_1.4fr]">
          {about.vision && (
            <section className="from-brand-700 to-brand-900 rounded-3xl bg-gradient-to-br p-8 text-white">
              <Eye className="text-brand-200 size-7" />
              <h2 className="text-brand-200 mt-4 text-sm font-semibold tracking-wider uppercase">Visi</h2>
              <p className="mt-2 text-2xl leading-snug font-bold">“{about.vision}”</p>
            </section>
          )}
          {about.missions.length > 0 && (
            <section className="card p-8">
              <h2 className="text-brand-600 text-sm font-semibold tracking-wider uppercase">Misi</h2>
              <ol className="mt-4 space-y-3">
                {about.missions.map((m, i) => (
                  <li key={m} className="flex gap-3">
                    <span className="bg-brand-50 text-brand-700 grid size-7 shrink-0 place-items-center rounded-full text-sm font-bold">
                      {i + 1}
                    </span>
                    <span className="pt-0.5 text-slate-700">{m}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>

        <div className="mt-14 text-center">
          <Link to="/daftar-toko-cabang" className="btn-primary !px-8 !py-3">
            <MapPin className="size-4" /> Kunjungi cabang terdekat
          </Link>
        </div>
      </div>
    </>
  )
}
