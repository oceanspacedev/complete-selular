import { Link } from 'react-router-dom'
import { usePosts } from '../lib/data'
import { formatDate } from '../lib/format'
import PageHeader from '../components/PageHeader'
import Img from '../components/Img'
import Seo from '../components/Seo'

export default function Articles() {
  const { data } = usePosts()
  const [lead, ...rest] = data ?? []

  return (
    <>
      <Seo title="Artikel & Review" description="Berita, tips, dan review gadget terbaru dari Complete Selular." />
      <PageHeader
        title="Artikel & Review"
        subtitle="Berita, tips, dan review gadget terbaru dari tim Complete Selular."
      />
      <div className="container-page py-10">
        {!data ? (
          <div className="grid gap-6 md:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="skeleton aspect-[4/3] rounded-[var(--radius-card)]" />
            ))}
          </div>
        ) : (
          <>
            {lead && (
              <Link to={`/artikel/${lead.slug}`} className="group card mb-8 grid overflow-hidden md:grid-cols-2">
                <Img img={lead.cover} priority alt="" className="aspect-[16/10] size-full object-cover" />
                <div className="flex flex-col justify-center p-6 sm:p-10">
                  <Meta post={lead} />
                  <h2 className="group-hover:text-brand-700 mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                    {lead.title}
                  </h2>
                  <p className="mt-3 line-clamp-3 text-slate-600">{lead.excerpt}</p>
                </div>
              </Link>
            )}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((a) => (
                <Link key={a.slug} to={`/artikel/${a.slug}`} className="group card flex flex-col overflow-hidden">
                  <div className="overflow-hidden">
                    <Img
                      img={a.cover}
                      alt=""
                      className="aspect-[16/9] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <Meta post={a} />
                    <h3 className="group-hover:text-brand-700 mt-2 line-clamp-2 font-semibold text-slate-900">
                      {a.title}
                    </h3>
                    <p className="mt-2 line-clamp-2 text-sm text-slate-600">{a.excerpt}</p>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  )
}

function Meta({ post }) {
  return (
    <p className="flex items-center gap-2 text-xs text-slate-500">
      {post.category && <span className="text-brand-700 font-semibold">{post.category}</span>}
      {post.category && <span aria-hidden>·</span>}
      <time dateTime={post.date}>{formatDate(post.date)}</time>
    </p>
  )
}
