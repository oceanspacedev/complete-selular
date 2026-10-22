// Groups the store's listings into models with RAM/storage variants, like marketplaces do
// ("Tecno Pova 8 5G" with 6/128GB · 8/128GB · 8/256GB). Plain JS: used by the React UI and by
// scripts/scrape.mjs. The store types capacities many ways — "8/256 GB", "(16GB/1TB)",
// "RAM 2GB ROM 16GB", "6GB 128GB", "3/32", "(2TB)" — so each pattern below is one of those.

const toGB = (n, unit) => (/tb/i.test(unit ?? '') ? n * 1024 : n)
const fmt = (gb) => (gb >= 1024 && gb % 1024 === 0 ? `${gb / 1024}TB` : `${gb}GB`)
const isRam = (n) => n >= 1 && n <= 24

// Each returns { ram, storage, match } or null. Order matters: most specific first.
const PATTERNS = [
  // RAM 2GB ROM 16GB
  (s) => {
    const m = s.match(/\bRAM\s*(\d{1,2})\s*GB\s*ROM\s*(\d{1,4})\s*(GB|TB)\b/i)
    return m && { ram: +m[1], storage: toGB(+m[2], m[3]), match: m[0] }
  },
  // 8/256 GB · 12GB/256GB · (6GB / 128GB) · 16/1 TB · 3/32 · RAM 8GB/256GB
  (s) => {
    const m = s.match(/(?:\bRAM\s*)?\b(\d{1,2})\s*(?:GB)?\s*\/\s*(\d{1,4})\s*(GB|TB)?(?![\w/])/i)
    if (!m || !isRam(+m[1])) return null
    const storage = toGB(+m[2], m[3])
    return storage >= 8 ? { ram: +m[1], storage, match: m[0] } : null
  },
  // 6GB 128GB
  (s) => {
    const m = s.match(/\b(\d{1,2})\s*GB\s+(\d{2,4}|[1-4])\s*(GB|TB)\b/i)
    return m && isRam(+m[1]) && { ram: +m[1], storage: toGB(+m[2], m[3]), match: m[0] }
  },
  // (2TB) · 128GB — storage only; small "4GB" alone is too ambiguous to call storage
  (s) => {
    const m = s.match(/\b(\d{2,4}|[1-4])\s*(GB|TB)\b/i)
    if (!m) return null
    const storage = toGB(+m[1], m[2])
    return storage >= 16 ? { ram: null, storage, match: m[0] } : null
  },
]

function findCapacity(name) {
  for (const p of PATTERNS) {
    const hit = p(name)
    if (hit) return hit
  }
  return null
}

const labelOf = (ram, storage) => (storage ? (ram ? `${ram}/${fmt(storage)}` : fmt(storage)) : null)

export function parseVariant(name = '') {
  const hit = findCapacity(name)
  if (!hit) return { ram: null, storage: null, label: null }
  return { ram: hit.ram, storage: hit.storage, label: labelOf(hit.ram, hit.storage) }
}

// The listing name without its capacity: "Xiaomi Redmi 17 (6GB / 128GB)" → "Xiaomi Redmi 17"
export function modelName(name = '') {
  const hit = findCapacity(name)
  let s = hit ? name.replace(hit.match, ' ') : name
  return s
    .replace(/\(\s*\)/g, ' ') // parentheses that only held the capacity
    .replace(/\s+\/\s*/g, ' ') // "K3 /2020" left over from "3GB 32GB/2020"
    .replace(/\s+/g, ' ')
    .replace(/[\s,|–-]+$/, '')
    .trim()
}

// Same model regardless of how it was typed: case, spaces and punctuation are ignored, but "+"
// is kept because "PRO" and "PRO+" are different phones.
export function modelKey(brand, name) {
  const base = modelName(name)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9+]/g, '')
  return `${brand ?? ''}|${base}`
}

// ["4 GB", "128 GB"] from the spec sheet, for listings whose name has no capacity
function fromHighlights(highlights = []) {
  const gb = highlights
    .map((h) => h.match(/^(\d+(?:\.\d+)?)\s*(GB|TB)$/i))
    .filter(Boolean)
    .map((m) => toGB(+m[1], m[2]))
  const ram = gb.find(isRam) ?? null
  const storage = gb.find((n) => n >= 16 && n !== ram) ?? null
  return storage ? { ram, storage, label: labelOf(ram, storage) } : { ram: null, storage: null, label: null }
}

const isAllCaps = (s) => s === s.toUpperCase()

// Brands that write themselves in capitals, and spellings that are not simple title case
const KEEP = new Set(['OPPO', 'TECNO', 'ZTE', 'HONOR', 'ROG', 'POCO', 'HP', 'TWS', 'NFC', 'LTE'])
const SPECIAL = { IQOO: 'iQOO', IPAD: 'iPad', IPHONE: 'iPhone' }

// "ITEL S26 ULTRA" → "Itel S26 Ultra". Model codes (anything with a digit) and short tokens
// like SE/GT/XT stay uppercase; names the store already wrote in mixed case are left alone.
export function displayName(name = '') {
  if (!isAllCaps(name)) return name
  return name
    .split(' ')
    .map((word) => {
      const bare = word.replace(/[^A-Z]/g, '')
      if (SPECIAL[bare]) return word.replace(bare, SPECIAL[bare])
      if (KEEP.has(bare) || /\d/.test(word) || bare.length <= 2) return word
      return word.replace(/[A-Z]+/, (w) => w[0] + w.slice(1).toLowerCase())
    })
    .join(' ')
}
const newestFirst = (a, b) => (b.date ?? '').localeCompare(a.date ?? '')
// The listing to keep when one capacity is listed twice: a priced one, then the newest
const keeperOrder = (a, b) => !!b.price - !!a.price || newestFirst(a, b)

// → { models, duplicates }
//   models[]:     { key, name, slug, brand, brandName, category, categoryName, date, image,
//                   minPrice, maxPrice, variants[] } — variants are the listings plus
//                   { variantLabel, ram, storage }, sorted by RAM then storage
//   duplicates[]: { slug, keep } — listings hidden because another one has the same capacity
export function groupModels(products = []) {
  const groups = new Map()
  for (const p of products) {
    const key = modelKey(p.brand, p.name)
    if (!groups.has(key)) groups.set(key, [])
    let v = parseVariant(p.name)
    // No 1–2 GB phone ships with ≥256 GB storage: that is a typo in the listing name, so trust
    // the spec sheet ("Asus ROG Phone 5S 1GB 512GB" is really 16/512GB).
    const implausible = v.ram && v.ram < 2 && v.storage >= 256
    if (!v.label || implausible) v = fromHighlights(p.highlights).label ? fromHighlights(p.highlights) : v
    groups.get(key).push({ ...p, variantLabel: v.label, ram: v.ram, storage: v.storage })
  }

  const models = []
  const duplicates = []
  for (const [key, listings] of groups) {
    const byLabel = new Map()
    for (const l of listings) {
      const k = l.variantLabel ?? ''
      if (!byLabel.has(k)) byLabel.set(k, [])
      byLabel.get(k).push(l)
    }
    const variants = []
    for (const same of byLabel.values()) {
      const [keep, ...rest] = same.sort(keeperOrder)
      variants.push(keep)
      for (const r of rest) duplicates.push({ slug: r.slug, keep: keep.slug })
    }
    variants.sort(
      (a, b) => (a.ram ?? 0) - (b.ram ?? 0) || (a.storage ?? 0) - (b.storage ?? 0) || a.name.localeCompare(b.name),
    )

    const prices = variants.map((v) => v.price).filter(Boolean)
    const cheapest = variants.filter((v) => v.price).sort((a, b) => a.price - b.price)[0]
    const main = cheapest ?? variants[0]
    const named = [...variants].sort((a, b) => isAllCaps(a.name) - isAllCaps(b.name) || newestFirst(a, b))[0]

    models.push({
      key,
      name: displayName(modelName(named.name)),
      slug: main.slug,
      brand: main.brand,
      brandName: main.brandName,
      category: main.category,
      categoryName: main.categoryName,
      date: [...variants].sort(newestFirst)[0].date,
      image: main.image,
      minPrice: prices.length ? Math.min(...prices) : null,
      maxPrice: prices.length ? Math.max(...prices) : null,
      variants,
    })
  }
  return { models, duplicates }
}
