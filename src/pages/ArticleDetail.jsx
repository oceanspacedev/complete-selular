import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { usePost, usePosts } from '../lib/data'
import { formatDate, readableTitle } from '../lib/format'
import { SITE_NAME, SITE_URL, absoluteUrl } from '../lib/seo'
import Breadcrumbs from '../components/Breadcrumbs'
import SectionHeader from '../components/SectionHeader'
import Img from '../components/Img'
import Seo from '../components/Seo'
import PageLoader from '../components/PageLoader'
import ErrorState from '../components/ErrorState'
import { WhatsAppIcon } from '../components/icons'
import { topicOf } from './Articles'
import NotFound from './NotFound'

export default function ArticleDetail() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { data: post, error, retry } = usePost(slug)
  const { data: all } = usePosts()
  const body = useMemo(() => (post ? prepareBody(post) : null), [post])
  const headingRef = useRef(null)
  const errorRef = useRef(null)
  const retried = useRef(false)

  // "Coba lagi" unmounts while the article reloads, which would drop keyboard focus to <body>.
  useEffect(() => {
    if (!retried.current || !(post || error)) return
    retried.current = false
    if (post) headingRef.current?.focus()
    else errorRef.current?.querySelector('[role="alert"] button')?.focus()
  }, [post, error])

  if (error?.notFound) return <NotFound />
  if (error) {
    return (
      <div ref={errorRef} className="container-page max-w-3xl py-4 sm:py-6">
        <Seo title="Artikel" noindex />
        <Breadcrumbs items={[{ to: '/artikel-review', label: 'Artikel' }, { label: 'Gagal memuat' }]} />
        <ErrorState
          as="h1"
          title="Gagal memuat artikel"
          onRetry={() => {
            retried.current = true
            retry()
          }}
        />
      </div>
    )
  }
  if (!post) return <PageLoader variant="article" />

  const hero = post.cover?.srcset ? post.cover : (post.coverLarge ?? post.cover)
  const heroRatio = hero?.w && hero?.h ? hero.w / hero.h : 1
  const description = excerpt(post)
  const topic = topicOf(post.title)
  // Same topic first, then the newest of the rest (the list is already newest first)
  const others = all?.filter((a) => a.slug !== slug) ?? []
  const more = [
    ...others.filter((a) => topicOf(a.title) === topic),
    ...others.filter((a) => topicOf(a.title) !== topic),
  ].slice(0, 3)

  // The body is raw HTML, so its internal links are plain <a> tags; send them through the
  // router instead of reloading the whole app.
  const onBodyClick = (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    const a = e.target.closest?.('a[href]')
    if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return
    const url = new URL(a.href, window.location.href)
    const sameOrigin = url.origin === window.location.origin
    // Old WordPress permalinks were /<slug>/ on the production domain; posts now live under /artikel/.
    const legacySlug = url.pathname.match(/^\/([\w-]+)\/?$/)?.[1]
    const legacyPost =
      (sameOrigin || url.origin === new URL(SITE_URL).origin) && all?.some((p) => p.slug === legacySlug)
    if (!sameOrigin && !legacyPost) return
    // Leave in-page anchors and files (images, PDFs) to the browser.
    if (!legacyPost && (url.pathname === window.location.pathname || /\.\w{2,5}$/.test(url.pathname))) return
    e.preventDefault()
    navigate(legacyPost ? `/artikel/${legacySlug}` : url.pathname + url.search + url.hash)
  }

  return (
    <>
      <Seo
        title={post.title}
        description={description}
        image={(post.coverLarge ?? post.cover)?.src}
        type="article"
        jsonLd={articleJsonLd(post, description, post.coverLarge ?? post.cover)}
      />
      <article className="band">
        <div className="container-page max-w-3xl py-4 sm:py-6">
          <Breadcrumbs items={[{ to: '/artikel-review', label: 'Artikel' }, { label: post.title }]} />
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="text-ink text-xl leading-snug font-extrabold text-balance focus:outline-none sm:text-2xl"
          >
            {readableTitle(post.title)}
          </h1>
          <p className="text-muted mt-1.5 flex flex-wrap items-center gap-x-1.5 text-[13px]">
            <Link
              to={`/artikel-review?topik=${topic.id}`}
              aria-label={`Topik ${topic.label}`}
              // 44px tall hit area on touch without making the meta line taller
              className="text-brand-700 relative font-bold hover:underline pointer-coarse:before:absolute pointer-coarse:before:-inset-x-2 pointer-coarse:before:-inset-y-3 pointer-coarse:before:content-['']"
            >
              {topic.label}
            </Link>
            <span aria-hidden>·</span>
            <time dateTime={post.date}>{formatDate(post.date)}</time>
            <span aria-hidden>·</span>
            <span>{body.minutes} menit baca</span>
          </p>
          <ShareRow title={readableTitle(post.title)} />
          {/* Most covers are square posters: capped in height and centred on a tinted band (never
              cropped) so the opening paragraph still shows on tablets and desktops. */}
          {hero && (
            <div className="mt-4 flex justify-center overflow-hidden rounded-lg bg-slate-100">
              <Img
                img={hero}
                priority
                sizes={`(min-width: 768px) ${Math.round(Math.min(720, HERO_MAX_H * heroRatio))}px, calc(100vw - 32px)`}
                alt={body.coverAlt}
                className="h-auto max-w-full"
                style={{ width: `min(100%, min(45vh, ${HERO_MAX_H}px) * ${heroRatio})` }}
              />
            </div>
          )}
          {/* Article HTML comes from our own WordPress snapshot (scripts/scrape.mjs strips scripts/iframes). */}
          <div className="prose-cs mt-5" onClick={onBodyClick} dangerouslySetInnerHTML={{ __html: body.html }} />
          {/* "Baca juga" below already links to all articles */}
          {!more.length && (
            <Link to="/artikel-review" className="btn-ghost mt-6">
              Semua artikel
            </Link>
          )}
        </div>
      </article>

      {more.length > 0 && (
        <section className="band mt-2 mb-2 py-4 sm:py-6">
          <div className="container-page">
            <SectionHeader title="Baca juga" to="/artikel-review" />
            <ul className="grid gap-2 sm:gap-3 lg:grid-cols-3">
              {more.map((a) => (
                <li key={a.slug}>
                  <Link
                    to={`/artikel/${a.slug}`}
                    className="group border-line hover:border-brand-300 flex h-full items-center gap-3 rounded-lg border p-2 transition-colors"
                  >
                    <div className="w-16 shrink-0 overflow-hidden rounded bg-slate-100">
                      <Img img={a.cover} sizes="64px" alt="" className="aspect-square w-full object-contain" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-muted flex flex-wrap items-center gap-x-1.5 text-xs">
                        <span className="text-brand-700 font-bold">{topicOf(a.title).label}</span>
                        <span aria-hidden>·</span>
                        <time dateTime={a.date}>{formatDate(a.date)}</time>
                      </p>
                      <h3 className="group-hover:text-brand-700 text-ink mt-0.5 line-clamp-3 text-sm font-bold">
                        {readableTitle(a.title)}
                      </h3>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </>
  )
}

const HERO_MAX_H = 420

// "Bagikan ke WhatsApp" opens WhatsApp's chat picker with the title and link; "Salin link" copies the
// address. The result is announced politely and cleared after 2 seconds.
function ShareRow({ title }) {
  const [status, setStatus] = useState(null)
  const timer = useRef(0)
  useEffect(() => () => clearTimeout(timer.current), [])

  // The address without ?query or #hash, so the shared link points at the article itself
  const pageUrl = window.location.origin + window.location.pathname
  const waHref = `https://wa.me/?text=${encodeURIComponent(`${title}\n${pageUrl}`)}`

  const copy = async () => {
    const ok = await copyText(window.location.href)
    setStatus(ok ? 'ok' : 'fail')
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setStatus(null), 2000)
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <a href={waHref} target="_blank" rel="noopener" className="btn-ghost !px-3.5 !text-[13px]">
        <WhatsAppIcon className="size-4" /> Bagikan ke WhatsApp
        <span className="sr-only"> (buka di tab baru)</span>
      </a>
      <button type="button" onClick={copy} className="btn-ghost !px-3.5 !text-[13px]">
        Salin link
      </button>
      <span
        aria-live="polite"
        className={`text-[13px] font-semibold ${status === 'fail' ? 'text-accent-600' : 'text-wa-700'}`}
      >
        {status === 'ok' ? 'Link tersalin' : status === 'fail' ? 'Gagal menyalin link' : ''}
      </span>
    </div>
  )
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // No async clipboard (older browsers, plain-http pages): copy from a hidden field instead
    const field = document.createElement('textarea')
    field.value = text
    field.setAttribute('readonly', '')
    field.style.cssText = 'position:fixed;top:0;left:0;opacity:0'
    document.body.append(field)
    field.select()
    let ok = false
    try {
      ok = document.execCommand('copy')
    } catch {
      // stays false
    }
    field.remove()
    return ok
  }
}

const stem = (src = '') =>
  src
    .split('/')
    .pop()
    .replace(/\.\w+$/, '')
    .replace(/-\d{3,4}$/, '')
const attr = (tag, name) => tag.match(new RegExp(`\\s${name}=(["'])([\\s\\S]*?)\\1`, 'i'))?.[2]

function prepareBody(post) {
  const { html, coverAlt } = splitCover(post)
  const title = plain(post.title ?? '')
  return {
    html: dropRepeatedAlts(html, title),
    coverAlt: plain(coverAlt) === title ? '' : coverAlt,
    minutes: readingMinutes(html),
  }
}

// About 200 words a minute, never less than one minute.
function readingMinutes(html) {
  const words = decode(html.replace(/<[^>]+>/g, ' ')).match(/[\p{L}\p{N}]+/gu)?.length ?? 0
  return Math.max(1, Math.round(words / 200))
}

// Most posts repeat their cover as the first picture of the body. Keep the sharp, eagerly
// loaded hero and drop the copy from the body so the poster is shown once.
function splitCover(post) {
  const html = post.html ?? ''
  const cover = post.coverLarge ?? post.cover
  const m = cover && html.match(/(<a\b[^>]*>\s*)?(<img\b[^>]*>)(\s*<\/a>)?/i)
  if (!m || stem(attr(m[2], 'src')) !== stem(cover.src)) return { html, coverAlt: '' }
  // Drop a link that only wrapped the image too, so no empty link is left behind.
  const keep = m[1] && !m[3] ? m[1] : ''
  return {
    html: html.slice(0, m.index) + keep + html.slice(m.index + m[0].length),
    coverAlt: attr(m[2], 'alt') ?? '',
  }
}

const ENTITIES = {
  amp: '&',
  quot: '"',
  apos: "'",
  lt: '<',
  gt: '>',
  nbsp: ' ',
  hellip: '…',
  ndash: '–',
  mdash: '—',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
}
const decode = (s) =>
  s.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] !== '#') return ENTITIES[e.toLowerCase()] ?? m
    const code = /x/i.test(e[1]) ? parseInt(e.slice(2), 16) : Number(e.slice(1))
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : m
  })
// Comparable text: tags and entities gone, case and spacing folded, edge punctuation trimmed.
const plain = (s) =>
  decode(s.replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')

// Spec-card pictures are often labelled with just the model name from the heading right above
// ("1. Poco X5 5G" over an image called "Poco X5 5G"), so a screen reader would announce it twice;
// such an image adds no text, so it becomes decorative.
function dropRepeatedAlts(html, title) {
  let heading = title
  return html.replace(/<(h[1-6])\b[^>]*>([\s\S]*?)<\/\1>|<img\b[^>]*>/gi, (tag, level, inner) => {
    if (level) {
      heading = plain(inner).replace(/^\d+[.)]\s*/, '')
      return tag
    }
    const alt = attr(tag, 'alt')
    return alt && plain(alt).replace(/^\d+[.)]\s*/, '') === heading
      ? tag.replace(/\salt=(["'])[\s\S]*?\1/i, ' alt=""')
      : tag
  })
}

// Older WordPress excerpts open with the title, a "Penulis : … | Editor : …" byline and a
// "Completeselular –" dateline before the first real sentence.
function excerpt(post) {
  const text = (post.excerpt ?? '').replace(/\s+/g, ' ').trim()
  const preamble = text.match(/^.{0,240}?Complete\s?selular\s*[–—-]\s*/i)?.[0]
  return preamble
    ? text.slice(preamble.length)
    : text.replace(/^.{0,200}?Penulis\s*:[^|]*\|\s*Editor\s*:\s*\S+\s*/i, '')
}

// WordPress stores `date` in the shop's local time (WIB) without an offset.
const withZone = (date) => (date && !/(Z|[+-]\d\d:?\d\d)$/.test(date) ? `${date}+07:00` : date)

function articleJsonLd(post, description, image) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description,
    image: image ? [absoluteUrl(image.src)] : undefined,
    datePublished: withZone(post.date),
    dateModified: withZone(post.modified ?? post.date),
    author: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      logo: { '@type': 'ImageObject', url: absoluteUrl('/img/site/icon-512.png') },
    },
    mainEntityOfPage: absoluteUrl(`/artikel/${post.slug}`),
  }
}
