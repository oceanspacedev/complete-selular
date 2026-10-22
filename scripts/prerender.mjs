// Runs after `vite build` (see the package.json "build" script). Gives every route its own
// HTML file whose <head> already holds the page's title, description, canonical, Open Graph
// tags and JSON-LD. WhatsApp/Facebook link previews and non-JS crawlers never run our JS, so
// without this every shared link would preview as the generic home page.
//
//   node scripts/prerender.mjs [outDir]     outDir defaults to dist
//   SITE_URL=https://… (or VITE_SITE_URL)   origin for canonical/og:url/sitemap
//
// Also writes sitemap.xml, the Sitemap line of robots.txt, 404.html (the app shell that
// public/.htaccess serves with a real 404 status for unknown URLs) and the .htaccess 301s for
// duplicate product listings.
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.resolve(process.argv[2] ?? path.join(ROOT, 'dist'))

if (!process.env.SITE_URL && process.env.VITE_SITE_URL) process.env.SITE_URL = process.env.VITE_SITE_URL
// seo.js reads SITE_URL when it is first imported, so load it after the env is settled.
const { SITE_NAME, SITE_URL, DEFAULT_DESCRIPTION, absoluteUrl, buildHead, clampText, pageTitle, productTitle } =
  await import('../src/lib/seo.js')
const { formatPrice, productFeatures, productKind } = await import('../src/lib/format.js')

const readJson = async (file) => JSON.parse(await fs.readFile(file, 'utf8'))
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const attrs = (o) =>
  Object.entries(o)
    .map(([k, v]) => `${k}="${esc(v)}"`)
    .join(' ')
// `</script>` inside a string would end the tag early.
const ldJson = (data) => JSON.stringify(data).replace(/</g, '\\u003c')
const day = (iso) => (iso ? String(iso).slice(0, 10) : undefined)
const newest = (items) =>
  items
    .map((x) => day(x.date))
    .filter(Boolean)
    .sort()
    .at(-1)

const site = await readJson(path.join(ROOT, 'src/data/site.json'))
const { brands } = await readJson(path.join(ROOT, 'src/data/brands.json'))
const branches = await readJson(path.join(ROOT, 'src/data/branches.json'))
const products = await readJson(path.join(OUT, 'data/products.json'))
const posts = await readJson(path.join(OUT, 'data/posts.json'))
const DEFAULT_IMAGE_SIZE = { w: 1200, h: 630 }
// site.logo is white-on-transparent (invisible on Google's white UI); the app icon is on brand blue.
// Same logo as Home.jsx and ArticleDetail.jsx put in their JSON-LD.
const LOGO = absoluteUrl('/img/site/icon-512.png')

// Every listing is its own product page, exactly as in the store data (no variant merging).
const models = products.map((p) => ({ name: p.name, variants: [p] }))
const duplicates = []
const modelOf = new Map(models.flatMap((m) => m.variants.map((v) => [v.slug, m])))
const duplicateOf = new Map(duplicates.map((d) => [d.slug, d.keep]))

// The hero banner is the home page's LCP image, but the browser only finds it once the JS has
// rendered <Home>. Preloading it with the same srcset/sizes as the <img> lets the request start
// from the HTML and makes the preload and the image pick the same file. A preload whose sizes
// differ from the <img>'s fetches a second file, so the string is read from Home.jsx itself.
const homeSource = await fs.readFile(path.join(ROOT, 'src/pages/Home.jsx'), 'utf8').catch(() => '')
const HERO_SIZES = homeSource.match(/\bconst HERO_SIZES\s*=\s*(['"`])(.+?)\1/)?.[2]
if (!HERO_SIZES) console.warn('prerender: no HERO_SIZES in src/pages/Home.jsx, the hero banner is not preloaded')
function heroPreload() {
  if (!HERO_SIZES) return null
  const banner = site.hero?.[0] ?? {}
  const files = Object.keys(banner)
    .filter((k) => /^\d+$/.test(k))
    .map((k) => banner[k])
    .filter((v, i, all) => v?.src && all.findIndex((x) => x?.src === v.src) === i)
    .sort((a, b) => a.w - b.w)
  if (!files.length) return null
  return {
    href: files[0].src,
    imagesrcset: files.map((f) => `${f.src} ${f.w}w`).join(', '),
    imagesizes: HERO_SIZES,
  }
}

// ---------- build output: template, route chunks, font ----------

// Strip what an earlier run injected so the script can run twice on the same output.
const template = (await fs.readFile(path.join(OUT, 'index.html'), 'utf8'))
  .replace(/\s*<!-- prerender -->[\s\S]*?<!-- \/prerender -->/g, '')
  .replace(/\s*<(meta|link)\b[^>]*\bdata-rh="true"[^>]*>/g, '')
  .replace(/\s*<script\b[^>]*\bdata-rh="true"[^>]*>[\s\S]*?<\/script>/g, '')
if (!/<title>[\s\S]*?<\/title>/.test(template)) throw new Error(`No <title> in ${OUT}/index.html`)

// build.manifest maps each lazy page to its chunk, so a deep link can fetch its page code
// in parallel with the entry bundle instead of after it.
const manifestFile = path.join(OUT, '.vite/manifest.json')
const manifest = await readJson(manifestFile).catch(() => null)
function chunkFiles(key, seen = new Set()) {
  const chunk = manifest?.[key]
  if (!chunk || seen.has(key)) return []
  seen.add(key)
  return [chunk.file, ...(chunk.imports ?? []).flatMap((k) => chunkFiles(k, seen))]
}
const entryKey = manifest && Object.keys(manifest).find((k) => manifest[k].isEntry)
const entryFiles = new Set(chunkFiles(entryKey))
const pageModules = (key) => chunkFiles(key).filter((f) => !entryFiles.has(f))

// Text renders only after the JS runs, so the browser would discover the font late.
const font = (await fs.readdir(path.join(OUT, 'assets')).catch(() => [])).find((f) =>
  /^inter-latin-wght-normal-.*\.woff2$/.test(f),
)

// ---------- per-page metadata ----------
// Mirrors what each page passes to <Seo> (src/pages/*.jsx), so the prerendered head and the one
// react-helmet-async renders agree. When a page's <Seo> props change, change them here too.

// The largest variant makes the sharpest link preview; srcset is "url 400w, url 900w".
function bestImage(img) {
  if (!img) return null
  const variants = (img.srcset ?? '')
    .split(',')
    .map((c) => c.trim().split(/\s+/))
    .filter(([url, w]) => url && /^\d+w$/.test(w ?? ''))
    .map(([url, w]) => ({ src: url, w: parseInt(w, 10) }))
    .sort((a, b) => b.w - a.w)
  const top = variants[0]
  if (!top || (img.w && top.w <= img.w)) return { src: img.src, w: img.w, h: img.h }
  return { src: top.src, w: top.w, h: img.w && img.h ? Math.round((top.w * img.h) / img.w) : undefined }
}

// Home.jsx
const homeJsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: site.name,
    url: `${SITE_URL}/`,
    logo: LOGO,
    description: DEFAULT_DESCRIPTION,
    foundingDate: String(site.since),
    sameAs: site.socials.map((s) => s.url),
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: `+${site.whatsapp}`,
      contactType: 'customer service',
      areaServed: 'ID',
      availableLanguage: 'id',
    },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: site.name,
    url: `${SITE_URL}/`,
    inLanguage: 'id-ID',
    publisher: { '@id': `${SITE_URL}/#organization` },
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_URL}/katalog?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  },
]

// ProductDetail.jsx
function productHead(p) {
  const url = absoluteUrl(`/product/${p.slug}`)
  const images = p.gallery?.length ? p.gallery : [p.image].filter(Boolean)
  const features = productFeatures(p.features, productKind(p.name))
  const description = clampText(
    `${p.price ? `Harga ${p.name} ${formatPrice(p.price)}` : `Beli ${p.name}`} di Complete Selular. ` +
      features.map((f) => `${f.label} ${f.value}`).join(', '),
    160,
  )
  const trail = [
    { to: '/', label: 'Beranda' },
    { to: '/katalog', label: 'Katalog' },
    ...(p.brand && p.brandName ? [{ to: `/brand/${p.brand}`, label: p.brandName }] : []),
    { label: p.name },
  ]
  const breadcrumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.label,
      item: c.to ? absoluteUrl(c.to) : url,
    })),
  }
  // Google flags a Product without offers/reviews as an invalid item, so price-less products
  // ("Hubungi kami") only get the breadcrumb trail.
  const jsonLd = p.price
    ? [
        {
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: p.name,
          sku: p.slug,
          url,
          description,
          image: images.map((g) => absoluteUrl(g.src)),
          ...(p.brandName && { brand: { '@type': 'Brand', name: p.brandName } }),
          offers: {
            '@type': 'Offer',
            url,
            price: p.price,
            priceCurrency: 'IDR',
            seller: { '@type': 'Organization', name: 'Complete Selular' },
          },
        },
        breadcrumbs,
      ]
    : [breadcrumbs]
  const photo = bestImage(images[0])
  return {
    title: productTitle(p.name),
    heading: modelOf.get(p.slug)?.name ?? p.name,
    description,
    // Facebook drops og:image under 200px, which would leave the preview with no picture at all.
    image: photo && !(photo.w < 200) ? photo : undefined,
    type: 'product',
    jsonLd,
  }
}

// ArticleDetail.jsx: drop the "Penulis : … | Editor : …" preamble the WordPress excerpts start with
function excerpt(post) {
  const text = (post.excerpt ?? '').replace(/\s+/g, ' ').trim()
  const preamble = text.match(/^.{0,240}?Complete\s?selular\s*[–—-]\s*/i)?.[0]
  return preamble
    ? text.slice(preamble.length)
    : text.replace(/^.{0,200}?Penulis\s*:[^|]*\|\s*Editor\s*:\s*\S+\s*/i, '')
}
const withZone = (date) => (date && !/(Z|[+-]\d\d:?\d\d)$/.test(date) ? `${date}+07:00` : date)

function articleHead(post) {
  const cover = post.coverLarge ?? post.cover
  const description = excerpt(post)
  return {
    title: post.title,
    description,
    image: bestImage(cover),
    type: 'article',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: post.title,
      description,
      image: cover ? [absoluteUrl(cover.src)] : undefined,
      datePublished: withZone(post.date),
      dateModified: withZone(post.modified ?? post.date),
      author: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
      publisher: {
        '@type': 'Organization',
        name: SITE_NAME,
        logo: { '@type': 'ImageObject', url: LOGO },
      },
      mainEntityOfPage: absoluteUrl(`/artikel/${post.slug}`),
    },
  }
}

const latestProduct = newest(products)
const pages = [
  {
    path: '/',
    heading: pageTitle(),
    jsonLd: homeJsonLd,
    preloadImage: heroPreload(),
    data: ['/data/products.json'],
    lastmod: latestProduct,
  },
  {
    path: '/katalog',
    title: 'Katalog Produk',
    description: 'Daftar harga HP, tablet & gadget terbaru di Complete Selular.',
    module: 'src/pages/Catalog.jsx',
    data: ['/data/products.json'],
    lastmod: latestProduct,
  },
  {
    path: '/semua-brand',
    title: 'Semua Brand',
    description: 'Belanja HP dari brand favoritmu: Samsung, Apple, Oppo, Vivo, Xiaomi, dan lainnya.',
    module: 'src/pages/Brands.jsx',
  },
  {
    path: '/promo',
    title: 'Promo',
    description: 'Promo dan penawaran terbaru Complete Selular.',
    module: 'src/pages/Promo.jsx',
  },
  {
    path: '/daftar-toko-cabang',
    title: 'Toko Cabang',
    description: `Daftar ${branches.length} toko cabang Complete Selular beserta alamat dan petunjuk arah lewat Google Maps.`,
    module: 'src/pages/Branches.jsx',
  },
  {
    path: '/tentang-kami',
    title: 'Tentang Kami',
    description: site.about?.tagline,
    module: 'src/pages/About.jsx',
  },
  {
    path: '/artikel-review',
    title: 'Artikel & Review',
    description: 'Berita, tips, dan review gadget terbaru dari Complete Selular.',
    module: 'src/pages/Articles.jsx',
    data: ['/data/posts.json'],
    lastmod: newest(posts),
  },
  {
    path: '/video-review',
    title: 'Video Review',
    description: 'Unboxing, komparasi, dan review HP terbaru dari channel YouTube Complete Selular.',
    module: 'src/pages/Videos.jsx',
    data: ['/data/videos.json'],
  },
  {
    path: '/marketplace',
    title: 'Marketplace Resmi',
    description: 'Belanja di toko resmi Complete Selular di Tokopedia, Shopee, Lazada, Blibli, dan TikTok Shop.',
    module: 'src/pages/Marketplace.jsx',
  },
  // The comparison depends on what each visitor picked, so it is never indexed (3 = compare.max).
  {
    path: '/bandingkan',
    title: 'Bandingkan Produk',
    description: 'Bandingkan harga dan spesifikasi hingga 3 HP, tablet, atau gadget sekaligus di Complete Selular.',
    module: 'src/pages/Compare.jsx',
    noindex: true,
  },
]

for (const brand of brands) {
  const own = products.filter((p) => p.brand === brand.slug)
  pages.push({
    path: `/brand/${brand.slug}`,
    title: `HP ${brand.name}`,
    heading: brand.name,
    description: `Daftar harga & spesifikasi HP ${brand.name} terbaru di Complete Selular.`,
    module: 'src/pages/BrandDetail.jsx',
    data: ['/data/products.json'],
    lastmod: newest(own),
    // An empty brand page is thin content: reachable, but kept out of the sitemap.
    inSitemap: own.length > 0,
  })
}

const productPages = new Map()
for (const item of products) {
  if (duplicateOf.has(item.slug)) continue
  const detail = await readJson(path.join(OUT, `data/products/${item.slug}.json`)).catch(() => null)
  if (!detail) console.warn(`prerender: no data/products/${item.slug}.json, using the list entry`)
  const p = { ...item, ...detail }
  const page = {
    path: `/product/${p.slug}`,
    ...productHead(p),
    module: 'src/pages/ProductDetail.jsx',
    data: [`/data/products/${p.slug}.json`],
    lastmod: day(p.date),
  }
  productPages.set(p.slug, page)
  pages.push(page)
}

// Old URLs of hidden duplicate listings: public/.htaccess answers them with a 301 (see below);
// on any other host this page sends people on and tells crawlers which URL is the real one.
// It carries the kept listing's title and Open Graph tags, so a link shared before the merge
// still previews as that phone.
for (const { slug, keep } of duplicates) {
  const kept = productPages.get(keep)
  if (!kept) continue
  pages.push({
    path: `/product/${slug}`,
    title: kept.title,
    heading: kept.heading,
    description: kept.description,
    image: kept.image,
    type: kept.type,
    canonical: kept.path,
    redirect: kept.path,
    noindex: true,
    inSitemap: false,
  })
}

for (const item of posts) {
  const detail = await readJson(path.join(OUT, `data/posts/${item.slug}.json`)).catch(() => null)
  if (!detail) console.warn(`prerender: no data/posts/${item.slug}.json, using the list entry`)
  const post = { ...item, ...detail }
  pages.push({
    path: `/artikel/${post.slug}`,
    ...articleHead(post),
    module: 'src/pages/ArticleDetail.jsx',
    data: [`/data/posts/${post.slug}.json`],
    lastmod: day(post.modified ?? post.date),
  })
}

// ---------- HTML ----------

function render(page) {
  // buildHead leaves the canonical out of noindex pages, but a redirect page must still name the
  // URL it stands in for, so its head is built for that URL and the noindex is added here.
  const head = buildHead({
    ...page,
    path: page.canonical ?? page.path,
    noindex: page.noindex && !page.canonical,
    image: page.image?.src,
  })
  if (page.noindex && page.canonical) head.meta.push({ name: 'robots', content: 'noindex' })
  const size = page.image ? page.image : DEFAULT_IMAGE_SIZE
  // The image size lets Facebook/WhatsApp lay out the preview on the very first share.
  const meta = head.meta.flatMap((m) =>
    m.property === 'og:image' && size.w && size.h
      ? [m, { property: 'og:image:width', content: size.w }, { property: 'og:image:height', content: size.h }]
      : [m],
  )
  // data-rh marks the tags react-helmet-async owns, so it replaces them instead of adding twins.
  const helmet = [
    `<title>${esc(head.title)}</title>`,
    ...(page.redirect ? [`<meta http-equiv="refresh" content="0;url=${esc(page.redirect)}" />`] : []),
    ...meta.map((m) => `<meta ${attrs(m)} data-rh="true" />`),
    ...head.links.map((l) => `<link ${attrs(l)} data-rh="true" />`),
    ...(page.jsonLd ? [`<script type="application/ld+json" data-rh="true">${ldJson(page.jsonLd)}</script>`] : []),
  ]
  // A redirect page is left at once, so nothing on it is worth fetching early.
  const hints = page.redirect
    ? []
    : [
        ...(page.preloadImage
          ? [`<link rel="preload" as="image" ${attrs(page.preloadImage)} fetchpriority="high">`]
          : []),
        ...(page.module ? pageModules(page.module) : []).map(
          (f) => `<link rel="modulepreload" crossorigin href="/${f}">`,
        ),
        // crossorigin makes the preload match fetch()'s default cors/same-origin mode, so it is reused.
        ...(page.data ?? []).map((u) => `<link rel="preload" href="${esc(u)}" as="fetch" crossorigin>`),
        ...(font ? [`<link rel="preload" href="/assets/${font}" as="font" type="font/woff2" crossorigin>`] : []),
      ]
  const indent = '\n    '
  const body = page.redirect
    ? `<p>Halaman produk ini sudah pindah. <a href="${esc(page.redirect)}">Buka ${esc(page.heading ?? 'halaman produknya')}</a>.</p>`
    : `<p>${esc(head.meta.find((m) => m.name === 'description').content)}</p>
        <p>Halaman ini butuh JavaScript. Aktifkan JavaScript di browser kamu, atau chat kami lewat <a href="https://wa.me/${esc(site.whatsapp)}">WhatsApp</a>.</p>`
  const noscript = `<noscript>
      <div style="max-width:40rem;margin:0 auto;padding:2rem 1rem;font-family:system-ui,sans-serif;line-height:1.6;color:#0f172a">
        <h1 style="font-size:1.5rem;line-height:1.3">${esc(page.heading ?? page.title ?? pageTitle())}</h1>
        ${body}
      </div>
    </noscript>`

  // Replacer functions, because data-derived text may contain "$&"-style patterns.
  let html = template.replace(/<title>[\s\S]*?<\/title>/, () => helmet.join(indent))
  html = html.replace(
    /(\s*)<\/head>/,
    (_, ws) => `${indent}<!-- prerender -->${indent}${hints.join(indent)}${indent}<!-- /prerender -->${ws}</head>`,
  )
  html = /<noscript>[\s\S]*?<\/noscript>/.test(html)
    ? html.replace(/<noscript>[\s\S]*?<\/noscript>/, () => noscript)
    : html.replace(/<\/body>/, () => `  ${noscript}\n  </body>`)
  return html
}

const fileFor = (route) => (route === '/' ? path.join(OUT, 'index.html') : path.join(OUT, route.slice(1), 'index.html'))

for (const page of pages) {
  const file = fileFor(page.path)
  await fs.mkdir(path.dirname(file), { recursive: true })
  await fs.writeFile(file, render(page))
}

await fs.writeFile(
  path.join(OUT, '404.html'),
  render({
    path: '/404',
    title: 'Halaman tidak ditemukan',
    heading: 'Halaman tidak ditemukan',
    description: 'Halaman yang kamu cari tidak ada atau sudah dipindah. Lihat produk terbaru kami di katalog.',
    noindex: true,
    module: 'src/pages/NotFound.jsx',
  }),
)

// ---------- sitemap.xml + robots.txt ----------

const urls = pages
  .filter((p) => !p.noindex && p.inSitemap !== false)
  .map((p) => {
    const img = p.image ? `<image:image><image:loc>${esc(absoluteUrl(p.image.src))}</image:loc></image:image>` : ''
    const lastmod = p.lastmod ? `<lastmod>${p.lastmod}</lastmod>` : ''
    return `  <url><loc>${esc(absoluteUrl(p.path))}</loc>${lastmod}${img}</url>`
  })
await fs.writeFile(
  path.join(OUT, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls.join('\n')}
</urlset>
`,
)

// public/robots.txt holds the rules; only the Sitemap line depends on the deploy origin.
const robotsFile = path.join(OUT, 'robots.txt')
const robots = await fs.readFile(robotsFile, 'utf8').catch(() => 'User-agent: *\nAllow: /\n')
const sitemapLine = `Sitemap: ${absoluteUrl('/sitemap.xml')}`
await fs.writeFile(
  robotsFile,
  /^Sitemap:/im.test(robots)
    ? robots.replace(/^Sitemap:.*$/im, () => sitemapLine)
    : `${robots.trimEnd()}\n\n${sitemapLine}\n`,
)

// ---------- .htaccess: 301 for each hidden duplicate listing ----------
// public/.htaccess marks where the rules go; they must sit before the rule that serves a page
// folder, or Apache would answer with the redirect page instead of a real 301.
const htaccessFile = path.join(OUT, '.htaccess')
const htaccess = await fs.readFile(htaccessFile, 'utf8').catch(() => null)
const REDIRECTS = /(# @duplicate-listings\r?\n)[\s\S]*?(# @end-duplicate-listings)/
const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const redirects = duplicates.filter((d) => productPages.has(d.keep))
if (htaccess && REDIRECTS.test(htaccess)) {
  const rules = redirects
    .map(({ slug, keep }) => `RewriteRule ^product/${reEsc(slug)}/?$ /product/${keep} [L,R=301]\n`)
    .join('')
  await fs.writeFile(
    htaccessFile,
    htaccess.replace(REDIRECTS, (_, start, end) => `${start}${rules}${end}`),
  )
} else if (redirects.length) {
  console.warn('prerender: no "# @duplicate-listings" block in .htaccess, duplicates only get a redirect page')
}

// The manifest only feeds this script; no reason to deploy it.
await fs.rm(path.dirname(manifestFile), { recursive: true, force: true })

console.log(
  `prerender: ${pages.length} pages + 404.html, sitemap.xml with ${urls.length} URLs, ` +
    `${redirects.length} duplicate listings redirected (${SITE_URL})` +
    (manifest ? '' : ' — no .vite/manifest.json, route chunks not preloaded'),
)
