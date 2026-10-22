import { test } from 'node:test'
import assert from 'node:assert/strict'
import { displayName, groupModels, modelKey, modelName, parseVariant } from './variants.js'

// Every name below is a real product name from the scraped catalogue.

test('parseVariant reads RAM/storage in the common "8/256 GB" forms', () => {
  assert.deepEqual(parseVariant('HONOR 400 LITE 8/256 GB'), { ram: 8, storage: 256, label: '8/256GB' })
  assert.deepEqual(parseVariant('OPPO FIND X9S 12/512GB'), { ram: 12, storage: 512, label: '12/512GB' })
  assert.deepEqual(parseVariant('Infinix GT 50 Pro 5G 12GB/256GB'), { ram: 12, storage: 256, label: '12/256GB' })
  assert.deepEqual(parseVariant('Xiaomi Redmi 17 (6GB / 128GB)'), { ram: 6, storage: 128, label: '6/128GB' })
  assert.deepEqual(parseVariant('Samsung Galaxy Z Fold 8 (16GB/1TB)'), { ram: 16, storage: 1024, label: '16/1TB' })
})

test('parseVariant reads space-separated, RAM/ROM and unit-less forms', () => {
  assert.deepEqual(parseVariant('Realme C100 6GB 128GB'), { ram: 6, storage: 128, label: '6/128GB' })
  assert.deepEqual(parseVariant('MITO A19 RAM 2GB ROM 16GB'), { ram: 2, storage: 16, label: '2/16GB' })
  assert.deepEqual(parseVariant('HUAWEI MATE XT 16/1 TB'), { ram: 16, storage: 1024, label: '16/1TB' })
  assert.deepEqual(parseVariant('HOTWAV SYMBOL R60 3/32'), { ram: 3, storage: 32, label: '3/32GB' })
  assert.deepEqual(parseVariant('OPPO RENO7 5G RAM 8GB/256GB'), { ram: 8, storage: 256, label: '8/256GB' })
})

test('parseVariant reads storage-only names', () => {
  assert.deepEqual(parseVariant('Apple iPhone 18 Pro Max (2TB)'), { ram: null, storage: 2048, label: '2TB' })
  assert.deepEqual(parseVariant('Ipad 11 (A16)Cell 128GB'), { ram: null, storage: 128, label: '128GB' })
})

test('parseVariant returns nulls when the name carries no capacity', () => {
  assert.deepEqual(parseVariant('HONOR X5c Plus'), { ram: null, storage: null, label: null })
  assert.deepEqual(parseVariant('NOKIA 106 DS RAM 4MB'), { ram: null, storage: null, label: null })
  assert.deepEqual(parseVariant('VIVO Y28 6GB/128GB 4G 6000mAh').label, '6/128GB')
})

test('modelName strips the capacity but keeps what makes a different model', () => {
  assert.equal(modelName('Apple iPhone 18 Pro Max (2TB)'), 'Apple iPhone 18 Pro Max')
  assert.equal(modelName('Xiaomi Redmi 17 (6GB / 128GB)'), 'Xiaomi Redmi 17')
  assert.equal(modelName('Tecno Pova 8 5G 8/256 GB'), 'Tecno Pova 8 5G')
  assert.equal(modelName('SAMSUNG GALAXY A55 12/256GB (5G)'), 'SAMSUNG GALAXY A55 (5G)')
  assert.equal(modelName('MITO A19 RAM 2GB ROM 16GB'), 'MITO A19')
  assert.equal(modelName('Ipad 11 (A16)Cell 512GB'), 'Ipad 11 (A16)Cell')
  assert.equal(modelName('VIVO Y28 6GB/128GB 4G 6000mAh'), 'VIVO Y28 4G 6000mAh')
})

test('modelKey ignores case, spacing and punctuation', () => {
  assert.equal(modelKey('huawei', 'Huawei MatePad 12 X 12/256 GB'), modelKey('huawei', 'HUAWEI MatePad 12X 12GB/256GB'))
  assert.equal(modelKey('asus', 'Asus ROG Phone5S 16GB 256GB'), modelKey('asus', 'Asus ROG Phone 5S 8GB 128GB'))
  assert.equal(modelKey('vivo', 'vivo Y05e 4GB 64GB'), modelKey('vivo', 'Vivo Y05e 4GB/64GB'))
})

test('modelKey keeps different models apart', () => {
  const k = (brand, name) => modelKey(brand, name)
  assert.notEqual(k('realme', 'REALME 16 PRO 12/256 GB'), k('realme', 'REALME 16 PRO+ 12/512 GB'))
  assert.notEqual(k('realme', 'REALME 16 12/256 GB'), k('realme', 'REALME 16 PRO 12/256 GB'))
  assert.notEqual(k('itel', 'ITEL A100C 3/64 GB'), k('itel', 'itel A100CS'))
  assert.notEqual(
    k('samsung', 'Samsung Galaxy Tab S12 Ultra 5G (12GB/512GB)'),
    k('samsung', 'Samsung Galaxy Tab S12 Ultra WiFi (12GB/512GB)'),
  )
  assert.notEqual(
    k('samsung', 'Samsung Galaxy Z Fold 8 (12GB/256GB)'),
    k('samsung', 'Samsung Galaxy Z Fold 8 Ultra (12GB/256GB)'),
  )
  assert.notEqual(k('xiaomi', 'XIAOMI PAD 8'), k('xiaomi', 'XIAOMI PAD 8 PRO 8/256 GB'))
})

// --- grouping ------------------------------------------------------------------------------

const P = (slug, name, price, date = '2026-01-01T00:00:00', extra = {}) => ({
  slug,
  name,
  price,
  date,
  brand: 'tecno',
  brandName: 'Tecno',
  category: 'mobiles',
  image: { src: `/img/${slug}.webp`, w: 400, h: 400 },
  highlights: [],
  ...extra,
})

test('groupModels puts the variants of one model on one card, sorted by RAM then storage', () => {
  const { models } = groupModels([
    P('pova-8-256', 'Tecno Pova 8 5G 8/256 GB', 5599000),
    P('pova-6-128', 'Tecno Pova 8 5G 6/128 GB', 4999000),
    P('pova-8-128', 'Tecno Pova 8 5G 8/128 GB', 4299000),
    P('spark-50', 'Tecno Spark 50 4/128 GB', 2599000),
  ])
  assert.equal(models.length, 2)
  const pova = models.find((m) => m.name === 'Tecno Pova 8 5G')
  assert.deepEqual(
    pova.variants.map((v) => v.variantLabel),
    ['6/128GB', '8/128GB', '8/256GB'],
  )
})

test('a model shows its lowest price and opens on the cheapest priced variant', () => {
  const { models } = groupModels([
    P('a', 'Tecno Pova 8 5G 8/256 GB', 5599000),
    P('b', 'Tecno Pova 8 5G 6/128 GB', null),
    P('c', 'Tecno Pova 8 5G 8/128 GB', 4299000),
  ])
  const [m] = models
  assert.equal(m.minPrice, 4299000)
  assert.equal(m.maxPrice, 5599000)
  assert.equal(m.slug, 'c')
})

test('a model without any price opens on its first variant and has no minPrice', () => {
  const { models } = groupModels([
    P('pro-2tb', 'Apple iPhone 18 Pro (2TB)', null),
    P('pro-256', 'Apple iPhone 18 Pro (256GB)', null),
  ])
  assert.equal(models[0].minPrice, null)
  assert.equal(models[0].slug, 'pro-256')
})

test('a model takes the newest variant date so new arrivals still sort first', () => {
  const { models } = groupModels([
    P('old', 'Tecno Spark 50 4/128 GB', 1, '2026-01-01T00:00:00'),
    P('new', 'Tecno Spark 50 8/128 GB', 1, '2026-05-01T00:00:00'),
  ])
  assert.equal(models[0].date, '2026-05-01T00:00:00')
})

test('the same model + capacity listed twice is a duplicate: keep the priced, then newest listing', () => {
  const { models, duplicates } = groupModels([
    P('g86-a', 'MOTOROLA MOTO G86 POWER 8/256 GB', 4999000, '2026-03-01T00:00:00'),
    P('g86-b', 'Motorola Moto G86 Power 8/256GB', 5699000, '2026-06-01T00:00:00'),
    P('g86-c', 'Motorola Moto G86 Power 8/256GB', null, '2026-09-01T00:00:00'),
  ])
  assert.equal(models[0].variants.length, 1)
  assert.equal(models[0].variants[0].slug, 'g86-b')
  assert.deepEqual(
    duplicates.sort((x, y) => x.slug.localeCompare(y.slug)),
    [
      { slug: 'g86-a', keep: 'g86-b' },
      { slug: 'g86-c', keep: 'g86-b' },
    ],
  )
})

test('a name without capacity borrows the label from its highlights', () => {
  const { models, duplicates } = groupModels([
    P('x5c', 'HONOR X5c Plus', null, '2026-08-19T00:00:00', { highlights: ['4 GB', '128 GB'] }),
    P('x5c-4-128', 'HONOR X5c Plus 4GB 128GB', null, '2026-08-11T00:00:00', { highlights: ['4 GB', '128 GB'] }),
  ])
  assert.equal(models.length, 1)
  assert.deepEqual(duplicates, [{ slug: 'x5c-4-128', keep: 'x5c' }])
})

test('the display name prefers a listing that is not written in ALL CAPS', () => {
  const { models } = groupModels([
    P('a', 'MOTOROLA MOTO G86 POWER 8/256 GB', 1),
    P('b', 'Motorola Moto G86 Power 12/512GB', 2),
  ])
  assert.equal(models[0].name, 'Motorola Moto G86 Power')
})

test('displayName softens ALL-CAPS listings but keeps model codes and official caps brands', () => {
  assert.equal(displayName('ITEL S26 ULTRA'), 'Itel S26 Ultra')
  assert.equal(displayName('XIAOMI REDMI PAD 2 PRO'), 'Xiaomi Redmi Pad 2 Pro')
  assert.equal(displayName('OPPO FIND X9S'), 'OPPO Find X9S')
  assert.equal(displayName('TECNO MEGAPAD SE'), 'TECNO Megapad SE')
  assert.equal(displayName('SAMSUNG GALAXY A55 (5G)'), 'Samsung Galaxy A55 (5G)')
  assert.equal(displayName('REALME 16 PRO+'), 'Realme 16 Pro+')
})

test('displayName leaves mixed-case names exactly as the store wrote them', () => {
  assert.equal(displayName('iPad Pro 11 6th Gen M5(wifi)'), 'iPad Pro 11 6th Gen M5(wifi)')
  assert.equal(displayName('Motorola Moto G57 Power 5G'), 'Motorola Moto G57 Power 5G')
})

test('grouped models use the softened display name', () => {
  const { models } = groupModels([P('a', 'ITEL S26 ULTRA 8/128 GB', 1), P('b', 'ITEL S26 ULTRA 8/256 GB', 2)])
  assert.equal(models[0].name, 'Itel S26 Ultra')
})

test('an implausible RAM from a typo (1GB with 512GB) defers to the spec sheet highlights', () => {
  const { models } = groupModels([
    P('rog-1', 'Asus ROG Phone 5S 1GB 512GB', 9400000, '2026-01-01T00:00:00', { highlights: ['16 GB', '512 GB'] }),
    P('rog-8', 'Asus ROG Phone 5S 8GB 128GB', 8999000),
  ])
  assert.deepEqual(
    models[0].variants.map((v) => v.variantLabel),
    ['8/128GB', '16/512GB'],
  )
})
