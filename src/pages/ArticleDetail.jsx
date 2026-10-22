import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { usePost, usePosts } from '../lib/data'
import { formatDate } from '../lib/format'
import Breadcrumbs from '../components/Breadcrumbs'
import Img from '../components/Img'
import Seo from '../components/Seo'
import PageLoader from '../components/PageLoader'
import NotFound from './NotFound'

export default function ArticleDetail() {
  const { slug } = useParams()
  const { data: post, error } = usePost(slug)
  const { data: all } = usePosts()
  if (error) return <NotFound />
  if (!post) return <PageLoader />
  const more = all?.filter((a) => a.slug !== slug).slice(0, 3) ?? []

  return (
    <>
      <Seo title={post.title} description={post.excerpt} image={post.coverLarge?.src} />
      <article className="bg-white">
        <div className="container-page max-w-3xl py-8 sm:py-12">
          <Breadcrumbs items={[{ to: '/artikel-review', label: 'Artikel' }, { label: post.title }]} />
          {post.category && <p className="text-brand-700 text-sm font-semibold">{post.category}</p>}
          <h1 className="mt-2 text-3xl leading-tight font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            {post.title}
          </h1>
          <time dateTime={post.date} className="mt-3 block text-sm text-slate-500">
            {formatDate(post.date)}
          </time>
          {post.coverLarge && (
            <Img img={post.coverLarge} priority alt="" className="mt-8 aspect-[16/9] w-full rounded-3xl object-cover" />
          )}
          {/* Article HTML comes from our own WordPress snapshot (scripts/scrape.mjs strips scripts/iframes). */}
          <div className="prose-cs mt-8" dangerouslySetInnerHTML={{ __html: post.html }} />
          <Link to="/artikel-review" className="btn-ghost mt-10">
            <ArrowLeft className="size-4" /> Semua artikel
          </Link>
        </div>
      </article>

      {more.length > 0 && (
        <section className="container-page py-12">
          <h2 className="mb-5 text-xl font-bold text-slate-900">Baca juga</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {more.map((a) => (
              <Link key={a.slug} to={`/artikel/${a.slug}`} className="group card overflow-hidden">
                <Img img={a.cover} alt="" className="aspect-[16/9] w-full object-cover" />
                <h3 className="group-hover:text-brand-700 line-clamp-2 p-5 font-semibold text-slate-900">{a.title}</h3>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  )
}
