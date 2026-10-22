// Snapshot data + images from completeselular.co.id into this project.
//   node scripts/scrape.mjs [--per-brand 12] [--posts 24] [--refresh]
// HTML/JSON responses are cached in .cache/ so re-runs are cheap; --refresh ignores the cache.
import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import * as cheerio from 'cheerio'
import sharp from 'sharp'

const ORIGIN = 'https://completeselular.co.id'
const ROOT = path.resolve(import.meta.dirname, '..')
const CACHE = path.join(ROOT, '.cache')
const PUBLIC = path.join(ROOT, 'public')
const SRC_DATA = path.join(ROOT, 'src', 'data')
const PUB_DATA = path.join(PUBLIC, 'data')

const args = process.argv.slice(2)
const arg = (name, def) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? Number(args[i + 1]) : def
}
const PER_BRAND = arg('per-brand', 12)
const POST_LIMIT = arg('posts', 24)
const REFRESH = args.includes('--refresh')

// ---------- helpers ----------

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function pool(items, size, fn) {
  const out = new Array(items.length)
  let i = 0
  await Promise.all(
    Array.from({ length: size }, async () => {
      while (i < items.length) {
        const idx = i++
        out[idx] = await fn(items[idx], idx)
      }
    }),
  )
  return out
}

async function fetchText(url, { retries = 3 } = {}) {
  const key = crypto.createHash('md5').update(url).digest('hex')
  const file = path.join(CACHE, 'http', key)
  if (!REFRESH) {
    try {
      return await fs.readFile(file, 'utf8')
    } catch {}
  }
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'user-agent': 'CompleteSelular-Redesign-Snapshot/1.0' } })
      if (!res.ok) throw new Error(`${res.status} ${url}`)
      const text = await res.text()
      await fs.mkdir(path.dirname(file), { recursive: true })
      await fs.writeFile(file, text)
      await sleep(150)
      return text
    } catch (err) {
      if (attempt >= retries) throw err
      await sleep(1000 * attempt)
    }
  }
}

const fetchJson = async (url) => JSON.parse(await fetchText(url))

const decode = (s = '') => cheerio.load(`<p>${s}</p>`)('p').text().trim()
const clean = (s = '') => s.replace(/\s+/g, ' ').trim()
// Admins type prices like "5.599.000"; the APS plugin reads that as 5.599 and shows "Rp6".
// The original string survives in <meta itemprop="price">, so parse dots as thousand separators.
// Anything under Rp50.000 is leftover demo data (e.g. "229.99") and is treated as no price.
const MIN_PRICE = 50_000
const parsePrice = (s = '') => {
  s = String(s).replace(/[^\d.,]/g, '')
  const n = /^\d{1,3}([.,]\d{3})+$/.test(s) ? Number(s.replace(/[.,]/g, '')) : Math.round(Number(s.replace(',', '.')))
  return Number.isFinite(n) && n >= MIN_PRICE ? n : null
}
const abs = (u) => (u ? new URL(u, ORIGIN).href : u)
// WordPress thumbnails look like foo-128x128.webp; the original is foo.webp
const fullSize = (u) => u?.replace(/-\d+x\d+(?=\.\w+$)/, '')

// Download an image once and write a WebP copy for each requested width.
// Returns { src, w, h } for the largest width (or a map when several widths are asked for).
const imageJobs = new Map()
function image(url, folder, widths = [800]) {
  if (!url) return Promise.resolve(null)
  url = abs(url)
  const id = `${folder}|${url}|${widths.join(',')}`
  if (!imageJobs.has(id)) imageJobs.set(id, downloadImage(url, folder, widths))
  return imageJobs.get(id)
}

async function downloadImage(url, folder, widths) {
  const base = path
    .basename(new URL(url).pathname)
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[^a-z0-9-_]+/gi, '-')
    .toLowerCase()
    .slice(0, 60)
  const hash = crypto.createHash('md5').update(url).digest('hex').slice(0, 6)
  const name = `${base}-${hash}`
  const rawFile = path.join(CACHE, 'img', hash + '-' + base)
  let buf
  try {
    buf = await fs.readFile(rawFile)
  } catch {
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`${res.status}`)
      buf = Buffer.from(await res.arrayBuffer())
      await fs.mkdir(path.dirname(rawFile), { recursive: true })
      await fs.writeFile(rawFile, buf)
    } catch (err) {
      console.warn(`  ! image failed ${url}: ${err.message}`)
      return null
    }
  }
  const out = {}
  try {
    for (const w of widths) {
      const suffix = widths.length > 1 ? `-${w}` : ''
      const rel = `/img/${folder}/${name}${suffix}.webp`
      const dest = path.join(PUBLIC, rel)
      await fs.mkdir(path.dirname(dest), { recursive: true })
      const info = await sharp(buf, { animated: false })
        .resize({ width: w, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(dest)
      out[w] = { src: rel, w: info.width, h: info.height }
    }
  } catch (err) {
    console.warn(`  ! convert failed ${url}: ${err.message}`)
    return null
  }
  return widths.length > 1 ? out : out[widths[0]]
}

async function writeJson(file, data) {
  await fs.mkdir(path.dirname(file), { recursive: true })
  await fs.writeFile(file, JSON.stringify(data, null, 0))
}

const load = async (pathname) => cheerio.load(await fetchText(ORIGIN + pathname))

// ---------- site-wide assets ----------

async function scrapeSite() {
  console.log('• Site assets')
  const $ = await load('/')
  const imgs = $('img')
    .map((_, el) => ({
      src: $(el).attr('data-src') || $(el).attr('src'),
      href: $(el).closest('a').attr('href') || '',
      alt: $(el).attr('alt') || '',
    }))
    .get()
    .filter((x) => x.src && !x.src.startsWith('data:'))
  const find = (re) => imgs.filter((x) => re.test(x.src))

  const favicon = $('link[rel="icon"]').last().attr('href')
  const heroUrls = [...new Set(find(/BANNER|banner|slider/i).map((x) => fullSize(x.src)))]
  const brandLogos = find(/brand_[a-z]+@/i).map((x) => ({
    slug: x.src.match(/brand_([a-z]+)@/i)[1].toLowerCase(),
    url: x.src,
  }))
  const payments = find(/(kredivo|akulaku|spaylater|homecredit|blibliinstore|baf|travelokaspayl|samsungfplus)@/i)
  const socials = [
    ['instagram', 'https://www.instagram.com/officialcompleteselular/'],
    ['facebook', 'https://www.facebook.com/officialcompleteseluler/'],
    ['youtube', 'https://www.youtube.com/channel/UCVIvTp186hbzgDwlRC-3U5g'],
    ['tiktok', 'https://www.tiktok.com/@officialcompleteselular'],
  ]

  // Product slugs the homepage features in "Khusus Buatmu"
  const homeSlugs = [
    ...new Set(
      $('a[href*="/product/"]')
        .map(
          (_, el) =>
            $(el)
              .attr('href')
              .match(/\/product\/([^/]+)/)?.[1],
        )
        .get()
        .filter(Boolean),
    ),
  ]

  const $m = await load('/marketplace/')
  const marketLogos = $m('#content img')
    .map((_, el) => $m(el).attr('data-src') || $m(el).attr('src'))
    .get()
    .filter((s) => s && !s.startsWith('data:'))

  const marketplaces = [
    { name: 'Tokopedia', url: 'https://www.tokopedia.com/complete-selular/product', match: /tokopedia/i },
    { name: 'Shopee', url: 'https://shopee.co.id/complete.selular', match: /shopee/i },
    { name: 'Lazada', url: 'https://www.lazada.co.id/shop/completeselular1629968371', match: /lazada/i },
    { name: 'Blibli', url: 'https://www.blibli.com/merchant/complete-selular/COR-70000', match: /blibli/i },
    { name: 'TikTok Shop', url: 'https://www.tiktok.com/@officialcompleteselular', match: /tiktok/i },
  ]

  const site = {
    name: 'Complete Selular',
    whatsapp: '6281121101168',
    since: 2009,
    branchCount: '60+',
    rating: { score: 4.9, count: 2432, source: 'Google' },
    logo: await image(find(/logo-cs-1/i)[0]?.src, 'site', [480]),
    logoAlt: await image(find(/Logo-Complete-Selular/i)[0]?.src, 'site', [500]),
    hero: (await Promise.all(heroUrls.map((u) => image(u, 'banners', [768, 1600])))).filter(Boolean),
    brandLogos: Object.fromEntries(
      (await Promise.all(brandLogos.map(async (b) => [b.slug, await image(b.url, 'brands', [240])]))).filter(
        ([, v]) => v,
      ),
    ),
    payments: (
      await Promise.all(
        payments.map(async (p) => ({
          name: p.src.match(/\/([a-z]+)@/i)[1],
          img: await image(p.src, 'partners', [240]),
        })),
      )
    ).filter((p) => p.img),
    marketplaces: await Promise.all(
      marketplaces.map(async ({ match, ...m }) => ({
        ...m,
        img: await image(
          marketLogos.find((s) => match.test(s)),
          'partners',
          [320],
        ),
      })),
    ),
    socials: socials.map(([name, url]) => ({ name, url })),
  }

  if (favicon) {
    const fav = await fetch(abs(favicon))
      .then((r) => r.arrayBuffer())
      .catch(() => null)
    if (fav) {
      await fs.mkdir(path.join(PUBLIC, 'img/site'), { recursive: true })
      await sharp(Buffer.from(fav)).resize(64, 64).png().toFile(path.join(PUBLIC, 'img/site/favicon.png'))
    }
  }

  return { site, homeSlugs }
}

// ---------- products ----------

async function scrapeProducts(extraSlugs) {
  console.log('• Brands & categories')
  const brands = await fetchJson(`${ORIGIN}/wp-json/wp/v2/aps-brands?per_page=100&_fields=id,name,slug,count`)
  const cats = await fetchJson(`${ORIGIN}/wp-json/wp/v2/aps-cats?per_page=100&_fields=id,name,slug,count`)

  console.log(`• Product list (${PER_BRAND}/brand)`)
  const embed = '_embed=wp:featuredmedia,wp:term'
  const lists = await pool(brands, 4, (b) =>
    fetchJson(`${ORIGIN}/wp-json/wp/v2/aps-products?aps-brands=${b.id}&per_page=${PER_BRAND}&orderby=date&${embed}`),
  )
  const bySlug = new Map()
  for (const p of lists.flat()) bySlug.set(p.slug, p)
  const missing = extraSlugs.filter((s) => !bySlug.has(s))
  if (missing.length) {
    const extra = await fetchJson(
      `${ORIGIN}/wp-json/wp/v2/aps-products?slug=${missing.join(',')}&per_page=100&${embed}`,
    )
    for (const p of extra) bySlug.set(p.slug, p)
  }

  const raw = [...bySlug.values()]
  console.log(`• Product pages (${raw.length})`)
  let done = 0
  const products = await pool(raw, 4, async (p) => {
    const product = await scrapeProduct(p)
    if (++done % 25 === 0) console.log(`  ${done}/${raw.length}`)
    return product
  })

  const index = products
    .filter(Boolean)
    .sort((a, b) => b.date.localeCompare(a.date))
    .map(({ gallery, specs, features, ...rest }) => ({
      ...rest,
      highlights: features.filter((f) => /RAM|Storage/i.test(f.label)).map((f) => f.value),
    }))

  for (const p of products.filter(Boolean)) {
    await writeJson(path.join(PUB_DATA, 'products', `${p.slug}.json`), p)
  }
  await writeJson(path.join(PUB_DATA, 'products.json'), index)

  const counts = Object.groupBy(index, (p) => p.brand)
  return {
    brands: brands
      .map((b) => ({ name: b.name, slug: b.slug, total: b.count, count: counts[b.slug]?.length ?? 0 }))
      .filter((b) => b.count > 0),
    categories: cats
      .map((c) => ({ name: c.name, slug: c.slug, count: index.filter((p) => p.category === c.slug).length }))
      .filter((c) => c.count > 0),
    index,
  }
}

async function scrapeProduct(p) {
  let $
  try {
    $ = await load(`/product/${p.slug}/`)
  } catch (err) {
    console.warn(`  ! ${p.slug}: ${err.message}`)
    return null
  }
  const root = $('.aps-single-product').first()
  const terms = (p._embedded?.['wp:term'] || []).flat()
  const brand = terms.find((t) => t.taxonomy === 'aps-brands')
  const cat = terms.find((t) => t.taxonomy === 'aps-cats')

  const features = root
    .find('.aps-features-list li')
    .map((_, li) => ({
      label: clean($(li).find('strong').first().text()),
      value: clean($(li).find('.aps-feature-info > span').first().text()),
    }))
    .get()
    .filter((f) => f.label && f.value)

  const specs = $('.aps-group')
    .map((_, g) => {
      const $g = $(g)
      $g.find('.aps-tooltip-data').remove()
      return {
        group: clean($g.find('.aps-group-title').text()),
        rows: $g
          .find('tr')
          .map((_, tr) => ({
            label: clean($(tr).find('.aps-attr-title').text()),
            value: clean($(tr).find('.aps-attr-value').text()),
          }))
          .get()
          .filter((r) => r.label && r.value && r.value !== '-'),
      }
    })
    .get()
    .filter((g) => g.group && g.rows.length)

  const media = p._embedded?.['wp:featuredmedia']?.[0]
  const featured = media?.source_url
  const galleryUrls = [
    ...new Set(
      [
        featured,
        ...root
          .find('.aps-thumb-item img')
          .map((_, el) => fullSize($(el).attr('src')))
          .get(),
      ].filter((u) => u && !/aps-products\/img\/product-/.test(u)),
    ),
  ].slice(0, 6)

  const [main, ...rest] = await Promise.all(
    galleryUrls.map((u, i) => image(u, 'products', i === 0 ? [400, 900] : [900])),
  )
  if (!main) return null

  return {
    slug: p.slug,
    name: decode(p.title.rendered),
    date: p.date,
    brand: brand?.slug ?? null,
    brandName: brand?.name ?? null,
    category: cat?.slug ?? null,
    categoryName: cat?.name ?? null,
    price: parsePrice(
      root.find('.aps-product-price meta[itemprop="price"]').attr('content') ??
        root.find('.aps-product-price .aps-price-value').first().text(),
    ),
    image: main[400],
    gallery: [main[900], ...rest.filter(Boolean)],
    features,
    specs,
  }
}

// ---------- content pages ----------

async function scrapePosts() {
  console.log(`• Articles (${POST_LIMIT})`)
  const posts = await fetchJson(`${ORIGIN}/wp-json/wp/v2/posts?per_page=${POST_LIMIT}&_embed=wp:featuredmedia,wp:term`)
  const index = []
  for (const p of posts) {
    const $ = cheerio.load(p.content.rendered, null, false)
    $('script, style, iframe[src*="facebook"]').remove()
    // Bring inline images local too
    for (const el of $('img').toArray()) {
      const src = $(el).attr('data-src') || $(el).attr('src')
      const img = src && !src.startsWith('data:') ? await image(fullSize(src), 'posts', [900]) : null
      if (img) {
        $(el).attr({ src: img.src, width: String(img.w), height: String(img.h), loading: 'lazy', decoding: 'async' })
        $(el).removeAttr('srcset').removeAttr('sizes').removeAttr('data-src').removeAttr('class').removeAttr('style')
      } else $(el).remove()
    }
    $('a[href^="https://completeselular.co.id/product/"]').each((_, a) => {
      $(a).attr('href', $(a).attr('href').replace(ORIGIN, ''))
    })
    const cover = await image(p._embedded?.['wp:featuredmedia']?.[0]?.source_url, 'posts', [480, 1200])
    const entry = {
      slug: p.slug,
      title: decode(p.title.rendered),
      date: p.date,
      excerpt: clean(decode(p.excerpt.rendered))
        .replace(/\s*\[…\]|\s*\[&hellip;\]/, '…')
        .slice(0, 220),
      category: (p._embedded?.['wp:term'] || []).flat().find((t) => t.taxonomy === 'category')?.name ?? null,
      cover: cover?.[480] ?? null,
    }
    index.push(entry)
    await writeJson(path.join(PUB_DATA, 'posts', `${p.slug}.json`), {
      ...entry,
      coverLarge: cover?.[1200] ?? null,
      html: $.html(),
    })
  }
  await writeJson(path.join(PUB_DATA, 'posts.json'), index)
}

async function scrapeBranches() {
  console.log('• Branches')
  const $ = await load('/daftar-toko-cabang/')
  // Each branch is one item of an Essential Addons "feature list" widget
  const branches = []
  $('#content .eael-feature-list-item').each((_, item) => {
    const $item = $(item)
    const name = clean($item.find('h2').first().text())
    const address = clean($item.find('p').first().text())
    const maps = $item.find('a[href*="goo"]').first().attr('href') ?? null
    if (name && address) branches.push({ name, address, maps })
  })
  const titleCase = (s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
  const cityOf = (addr) => {
    const m =
      addr.match(/\b(?:Kota|Kabupaten|Kab\.)\s+([a-z]+)/i) ||
      addr.match(/\b(Cirebon|Cilacap|Kuningan|Indramayu|Majalengka|Brebes|Tegal|Pemalang|Purwokerto|Banyumas)\b/i)
    return m ? titleCase(m[1]) : 'Lainnya'
  }
  return branches.map((b) => ({ ...b, city: cityOf(b.address) }))
}

async function scrapeAbout() {
  console.log('• About')
  const $ = await load('/tentang-kami/')
  const text = clean($('#content').text())
  const img = $('#content img')
    .map((_, el) => $(el).attr('data-src') || $(el).attr('src'))
    .get()
    .find((s) => /tentangkami/i.test(s))
  const after = (marker) => text.split(marker)[1] ?? ''
  const vision = after('visi :').match(/“([^”]+)”/)?.[1] ?? null
  // Missions are "1. …<br>2. …" inside the paragraph that starts with "Dengan misi"
  const missionHtml =
    $('#content p')
      .filter((_, p) => /misi\s*:/i.test($(p).text()))
      .first()
      .html() ?? ''
  const missions = missionHtml
    .split(/<br\s*\/?>/i)
    .map((line) => clean(cheerio.load(line).text()))
    .filter((line) => /^\d+\./.test(line))
    .map((line) => line.replace(/^\d+\.\s*/, '').replace(/\s+,/g, ','))
  const intro = text.match(/Sejak didirikan[^.]+\.[^.]+\./)?.[0] ?? null
  const values =
    text
      .match(/Tagline\s+(.+?)\s+Kami percaya/)?.[1]
      .split(/,\s*/)
      .map((v) => v.trim()) ?? []
  return {
    tagline:
      'Complete Selular merupakan perusahaan penyedia jasa layanan telekomunikasi yang terbaik, terlengkap dan berkualitas.',
    intro,
    vision,
    missions,
    values,
    image: await image(fullSize(img), 'site', [900]),
  }
}

async function scrapePromos() {
  console.log('• Promos')
  const $ = await load('/promo/')
  const urls = $('#content img')
    .map((_, el) => $(el).attr('data-src') || $(el).attr('src'))
    .get()
    .filter((s) => s && /uploads/.test(s) && !/logo/i.test(s))
  const howTo = $('#content a')
    .filter((_, a) => /klik/i.test($(a).text()))
    .attr('href')
  const items = (
    await Promise.all([...new Set(urls.map(fullSize))].map((u) => image(u, 'promos', [480, 1200])))
  ).filter(Boolean)
  return { howTo: howTo ?? null, items: items.map((i) => ({ thumb: i[480], full: i[1200] })) }
}

async function scrapeVideos() {
  console.log('• Videos')
  const $ = await load('/video-review/')
  const seen = new Set()
  const vids = $('.ayg-thumbnail[data-id]')
    .map((_, el) => ({ id: $(el).attr('data-id'), title: clean($(el).attr('data-title') || '') }))
    .get()
    .filter((v) => v.id && !seen.has(v.id) && seen.add(v.id))
    .slice(0, 36)
  return pool(vids, 4, async (v) => ({
    ...v,
    thumb: await image(`https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`, 'videos', [480]),
  }))
}

// ---------- run ----------

const t0 = Date.now()
const { site, homeSlugs } = await scrapeSite()
const { brands, categories, index } = await scrapeProducts(homeSlugs)
site.featured = homeSlugs.filter((s) => index.some((p) => p.slug === s))
await scrapePosts()
const branches = await scrapeBranches()
const about = await scrapeAbout()
const promos = await scrapePromos()
const videos = await scrapeVideos()

await writeJson(path.join(SRC_DATA, 'site.json'), { ...site, about, promos })
await writeJson(path.join(SRC_DATA, 'brands.json'), { brands, categories })
await writeJson(path.join(SRC_DATA, 'branches.json'), branches)
await writeJson(
  path.join(PUB_DATA, 'videos.json'),
  videos.filter((v) => v.thumb),
)

console.log(
  `\n✓ ${index.length} products, ${brands.length} brands, ${branches.length} branches, ${videos.length} videos ` +
    `— ${((Date.now() - t0) / 1000).toFixed(0)}s`,
)
