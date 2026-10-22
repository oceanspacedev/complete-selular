const rupiah = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })
const date = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
// Indonesian spelling writes the currency without a space: Rp5.599.000
export const formatPrice = (n) => (n ? rupiah.format(n).replace(/\s/g, '') : 'Hubungi kami')
export const formatDate = (iso) => date.format(new Date(iso))

// --- Product specs -------------------------------------------------------------------------
// The scraped spec sheet uses English group/row names; these are the ones we show in Indonesian.
// Unknown labels pass through unchanged.

const GROUPS = {
  General: 'Umum',
  Design: 'Desain',
  Network: 'Jaringan',
  Display: 'Layar',
  Media: 'Multimedia',
  Camera: 'Kamera',
  Software: 'Perangkat Lunak',
  Hardware: 'Perangkat Keras',
  Connectivity: 'Konektivitas',
  Battery: 'Baterai',
  Data: 'Data',
}

const LABELS = {
  'Device Type': 'Jenis perangkat',
  Announced: 'Diumumkan',
  Released: 'Tanggal rilis',
  'Design/Type': 'Bentuk',
  Dimensions: 'Dimensi',
  Weight: 'Berat',
  Colors: 'Pilihan warna',
  '2G Network': 'Jaringan 2G',
  '3G Network': 'Jaringan 3G',
  '4G Network': 'Jaringan 4G',
  '5G Network': 'Jaringan 5G',
  Speed: 'Kecepatan',
  'Data/Speed': 'Kecepatan data',
  SIM: 'Jenis SIM',
  'Display Type': 'Jenis layar',
  Size: 'Ukuran',
  Resolution: 'Resolusi',
  'Pixel Density': 'Kerapatan piksel',
  'Touch Screen': 'Layar sentuh',
  'Display Protection': 'Pelindung layar',
  Features: 'Fitur',
  'Audio Playback': 'Format audio',
  'Video Playback': 'Format video',
  'Video Out': 'Keluaran video',
  'FM Radio': 'Radio FM',
  'Alert Types': 'Jenis notifikasi',
  'Ring Tones': 'Nada dering',
  Loudspeaker: 'Pengeras suara',
  'Main Camera': 'Kamera utama',
  'Selfie Camera': 'Kamera depan',
  'Camera/Video': 'Perekaman video',
  'Camera Features': 'Fitur kamera',
  'Operating System': 'Sistem operasi',
  'User Interface': 'Antarmuka',
  'RAM (Memory)': 'RAM',
  'Internal Storage': 'Memori internal',
  'Card Slot': 'Slot kartu memori',
  Sensors: 'Sensor',
  'Wi-fi': 'Wi-Fi',
  'Wireless Charging': 'Pengisian nirkabel',
  'Battery Type': 'Jenis baterai',
  Capacity: 'Kapasitas',
  Placement: 'Pemasangan',
  Standby: 'Waktu siaga',
  'Talk Time': 'Waktu bicara',
  'Music Play': 'Waktu putar musik',
  'Web Browser': 'Peramban web',
}

const FEATURE_LABELS = {
  CPU: 'Prosesor',
  RAM: 'RAM',
  Storage: 'Memori internal',
  Display: 'Layar',
  Camera: 'Kamera',
  OS: 'Sistem operasi',
}

const VALUES = {
  available: 'Tersedia',
  'not available': 'Tidak tersedia',
  'coming soon': 'Segera hadir',
  discontinued: 'Tidak diproduksi lagi',
  removable: 'Dapat dilepas',
}

// The headline price is the single source of truth; the sheet's own price row is stale or a template.
const PRICE = /^(price|harga)$/i
const EMPTY = /^(n\/a|nil|none|null|[-–—?])?\s*(\(.*\))?$/i

// Normalises one scraped value; returns '' for values that should not be shown at all.
export function cleanValue(raw) {
  let s = String(raw ?? '')
    .replace(/\s+/g, ' ')
    .trim()
  if (s.includes('{{') || EMPTY.test(s)) return ''
  // "Android 16, One UI 8.5, One UI 8.5" — the CMS often repeats list items
  const seen = new Set()
  s = s
    .split(/,\s+/)
    .filter((part) => {
      const k = part.toLowerCase()
      return !seen.has(k) && seen.add(k)
    })
    .join(', ')
    .replace(/[,;]\s*$/, '')
  if (EMPTY.test(s)) return ''
  // "03 Juli, 2026" → "3 Juli 2026"
  s = s.replace(/^0?(\d{1,2}) ([A-Za-z]+),? (\d{4})$/, '$1 $2 $3')
  if (VALUES[s.toLowerCase()]) return VALUES[s.toLowerCase()]
  return s
    .replace(/^(yes|y)(?=$|[\s,(])/i, 'Ya')
    .replace(/^(no|n)(?=$|[\s,(])/i, 'Tidak')
    .replace(/^non-removable/i, 'Tidak dapat dilepas')
}

// [{ key, group, rows: [{ key, label, value }] }] — translated, without price rows,
// template placeholders or empty values.
export function specGroups(specs = []) {
  return specs
    .filter((g) => !PRICE.test(g.group))
    .map((g) => ({
      key: g.group,
      group: GROUPS[g.group] ?? g.group,
      rows: g.rows
        .filter((r) => !PRICE.test(r.label))
        .map((r) => ({
          key: r.label,
          label: LABELS[`${g.group}/${r.label}`] ?? LABELS[r.label] ?? r.label,
          value: cleanValue(r.value),
        }))
        .filter((r) => r.value),
    }))
    .filter((g) => g.rows.length)
}

// Phone, tablet, wearable, audio or accessory, from the product name (the category field is
// "Mobiles" for everything, and the spec's device type is free text).
export function productKind(name = '') {
  if (/\b(case|casing|cover|charger|adaptor|adapter|kabel|cable|tempered|anti ?gores|power ?bank)\b/i.test(name))
    return 'accessory'
  if (/\b(buds|earbuds?|earphones?|headphones?|headset|airpods|enco|tws|speaker)\b/i.test(name)) return 'audio'
  if (/\b(watch|smartwatch|band)\b/i.test(name)) return 'wearable'
  if (/\b(tab|tablet)\b|pad\b/i.test(name)) return 'tablet'
  return 'phone'
}

// Key features shown as tiles on the product page, with Indonesian labels.
export function productFeatures(features = [], kind = 'phone') {
  return features
    .map((f) => ({ key: f.label, label: FEATURE_LABELS[f.label] ?? f.label, value: cleanValue(f.value) }))
    .filter((f) => f.value && !(/^\d+(\.\d+)?\s*MB$/i.test(f.value) && (kind === 'accessory' || kind === 'audio')))
}

// --- Colours -------------------------------------------------------------------------------
// Swatches for the colour words the store's spec sheets use, English and Indonesian. Marketing
// names are matched by their colour word ("Glacier Blue", "Black Abyss", "Hitam Permata").

const SWATCHES = {
  black: '#1f2023',
  hitam: '#1f2023',
  white: '#f8f9fa',
  putih: '#f8f9fa',
  silver: '#c9ced6',
  perak: '#c9ced6',
  gray: '#8e949c',
  grey: '#8e949c',
  abu: '#8e949c',
  graphite: '#4a4f57',
  gunmetal: '#53565c',
  titanium: '#b5b0a6',
  gold: '#d4b06a',
  emas: '#d4b06a',
  champagne: '#e8d5b0',
  cream: '#f2ead8',
  krem: '#f2ead8',
  beige: '#e6d8bf',
  brown: '#8b5a3c',
  coklat: '#8b5a3c',
  cokelat: '#8b5a3c',
  umber: '#6f4e37',
  bronze: '#a97142',
  copper: '#b8734b',
  blue: '#2f6fdb',
  biru: '#2f6fdb',
  iceblue: '#a9cdf0',
  navy: '#1f3a68',
  cyan: '#22b8cf',
  aqua: '#3cc3c3',
  teal: '#159a9c',
  tosca: '#159a9c',
  green: '#2e9e5b',
  hijau: '#2e9e5b',
  mint: '#9fe0c4',
  lime: '#a8d95b',
  olive: '#7a7d3a',
  emerald: '#1f8a5b',
  zamrud: '#1f8a5b',
  red: '#d63a3a',
  merah: '#d63a3a',
  burgundy: '#7a1f2b',
  maroon: '#7a1f2b',
  pink: '#f2a0c0',
  rose: '#e8a0a8',
  coral: '#f27b6b',
  purple: '#7d4fc4',
  ungu: '#7d4fc4',
  violet: '#8a5cf0',
  lilac: '#c8b3e6',
  lavender: '#c6b8ef',
  grape: '#6c3fa0',
  orange: '#f28a30',
  oranye: '#f28a30',
  jingga: '#f28a30',
  yellow: '#f5cf3a',
  kuning: '#f5cf3a',
  lemon: '#f3e15a',
}

// Words that only name a colour when nothing more specific is in the name ("Glacier" alone)
const HINTS = {
  glacier: '#dfe9f1',
  ice: '#d6ecf8',
  sky: '#9cc9f0',
  ocean: '#2f78b8',
  forest: '#2f6b45',
  jade: '#3f9e7a',
  ruby: '#b8233a',
  sapphire: '#24539e',
  midnight: '#232a3b',
  night: '#232a3b',
  space: '#5c6066',
  charcoal: '#3c3f44',
  obsidian: '#1f2023',
  onyx: '#1f2023',
  jet: '#1f2023',
  snow: '#f8f9fa',
  pearl: '#f1eee6',
  sand: '#d9c3a0',
}

// Finishes rather than hues: "Titanium Black" is still black
const FINISHES = new Set(['titanium', 'graphite'])
const LIGHT = new Set(['light', 'muda', 'pastel', 'pale'])
const DARK = new Set(['dark', 'deep', 'tua'])

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
const mix = (a, b, t) =>
  '#' +
  rgb(a)
    .map((v, i) =>
      Math.round(v * (1 - t) + rgb(b)[i] * t)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')

// Run-together names: "Deepblue", "Greenery", "Golden", "Orangen"
const fuzzy = (w) => {
  const k = Object.keys(SWATCHES).find((k) => k.length >= 4 && (w.startsWith(k) || w.endsWith(k)))
  return k && SWATCHES[k]
}

const lastIndex = (list, test) => {
  for (let i = list.length - 1; i >= 0; i--) if (test(list[i])) return i
  return -1
}

// "Light Green" → a light green hex; unknown names ("PANTONE Regatta") → null.
export function colorHex(name = '') {
  const s = name.toLowerCase()
  if (/merah\s+muda/.test(s)) return SWATCHES.pink
  const words = s.split(/[^a-z]+/).filter(Boolean)
  // The colour word is usually last ("Glacier Blue") but not always ("Black Abyss")
  let i = lastIndex(words, (w) => SWATCHES[w])
  if (i < 0) i = lastIndex(words, fuzzy)
  let hex = i >= 0 ? (SWATCHES[words[i]] ?? fuzzy(words[i])) : HINTS[words[lastIndex(words, (w) => HINTS[w])]]
  if (!hex) return null
  // A colour word in front tints it: "Mint Green", "Sky Blue", "Pink Orange"
  const tint = i > 0 && !FINISHES.has(words[i - 1]) && (SWATCHES[words[i - 1]] ?? HINTS[words[i - 1]])
  if (tint) hex = mix(hex, tint, 0.5)
  if (words.some((w) => LIGHT.has(w))) return mix(hex, '#ffffff', 0.45)
  if (words.some((w) => DARK.has(w))) return mix(hex, '#000000', 0.3)
  return hex
}

// The store's spec template pre-fills these three; when all of them appear they are the template,
// not the phone's real colours (an iPad in "Citrus Orange"), so they are dropped.
const TEMPLATE_COLORS = ['stone gray', 'citrus orange', 'jade green']

// [{ name, hex }] from the spec sheet's Design > Colors row; hex is null for unrecognised names.
export function parseColors(specs = []) {
  const row = specs.find((g) => g.group === 'Design')?.rows.find((r) => /^colou?rs?$/i.test(r.label))
  const raw = String(row?.value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!raw || raw.includes('{{') || EMPTY.test(raw)) return []
  const seen = new Set()
  let names = raw
    .split(/\s*(?:[,;/|]|\s&\s|\s(?:dan|and)\s)\s*/i)
    .map((n) => n.trim().replace(/[.]+$/, ''))
    .filter((n) => n && !EMPTY.test(n))
    .map((n) => n[0].toUpperCase() + n.slice(1))
    .filter((n) => {
      const k = n.toLowerCase()
      return !seen.has(k) && seen.add(k)
    })
  if (TEMPLATE_COLORS.every((t) => seen.has(t))) names = names.filter((n) => !TEMPLATE_COLORS.includes(n.toLowerCase()))
  return names.slice(0, 10).map((name) => ({ name, hex: colorHex(name) }))
}

// A few WordPress titles are typed in ALL CAPS; set them in title case like the others.
const SMALL_WORDS = new Set(['dan', 'di', 'ke', 'dari', 'yang', 'untuk', 'dengan', 'pada', 'atau', 'vs'])
const ACRONYMS = new Set(['AI', 'HP', 'NFC', 'OLED', 'AMOLED', 'LCD', 'RAM', 'ROM', 'USB', 'GPS', 'TWS'])
const SPECIAL = { IPHONE: 'iPhone', IPAD: 'iPad', IOS: 'iOS' }
export function readableTitle(title) {
  if (title !== title.toUpperCase() || !/[A-Z]{4}/.test(title)) return title
  return title
    .split(' ')
    .map((word, i) => {
      const bare = word.replace(/[^\p{L}\d]/gu, '')
      if (SPECIAL[bare]) return word.replace(bare, SPECIAL[bare])
      if (/\d/.test(word) || ACRONYMS.has(bare)) return word
      const lower = word.toLowerCase()
      return i > 0 && SMALL_WORDS.has(lower) ? lower : lower.charAt(0).toUpperCase() + lower.slice(1)
    })
    .join(' ')
}
