import { useCallback, useEffect, useMemo, useState } from 'react'

// Runtime JSON lives in /public/data so it is cached separately from the JS bundle.
const pending = new Map()
const resolved = new Map()

// A missing data file is a real "not found" (unknown product/article slug). The SPA
// fallback answers missing files with index.html, so a non-JSON response counts too.
// Anything else (offline, 5xx) is a network error the user can retry.
function failure(url, res) {
  const err = new Error(res ? `${res.status} ${url}` : `Network error ${url}`)
  err.notFound = !!res && (res.status === 404 || !/json/.test(res.headers.get('content-type') ?? ''))
  return err
}

export function getJson(url) {
  if (!pending.has(url)) {
    pending.set(
      url,
      fetch(url)
        .then(
          (r) => {
            if (!r.ok || !/json/.test(r.headers.get('content-type') ?? '')) throw failure(url, r)
            return r.json()
          },
          () => {
            throw failure(url, null)
          },
        )
        .then((data) => {
          resolved.set(url, data)
          return data
        })
        .catch((err) => {
          pending.delete(url)
          throw err
        }),
    )
  }
  return pending.get(url)
}

const initial = (url) => ({ data: url ? resolved.get(url) : undefined, error: undefined })

// Already-fetched URLs render synchronously, so going back to a page never flashes a skeleton.
// Returns { data, error, loading, retry }; error.notFound tells a 404 apart from a network failure.
export function useJson(url) {
  const [state, setState] = useState(() => ({ url, attempt: 0, ...initial(url) }))
  const current = state.url === url ? state : { url, attempt: 0, ...initial(url) }

  useEffect(() => {
    if (!url || resolved.has(url)) return
    let alive = true
    getJson(url).then(
      (data) => alive && setState((s) => ({ ...s, url, data, error: undefined })),
      (error) => alive && setState((s) => ({ ...s, url, data: undefined, error })),
    )
    return () => {
      alive = false
    }
  }, [url, current.attempt])

  const retry = useCallback(
    () => setState((s) => ({ url, attempt: (s.url === url ? s.attempt : 0) + 1, data: undefined, error: undefined })),
    [url],
  )

  return {
    data: current.data,
    error: current.error,
    loading: !current.data && !current.error,
    retry,
  }
}

export const useProducts = () => useJson('/data/products.json')
export const useProduct = (slug) => useJson(`/data/products/${slug}.json`)
export const usePosts = () => useJson('/data/posts.json')
export const usePost = (slug) => useJson(`/data/posts/${slug}.json`)
export const useVideos = () => useJson('/data/videos.json')

export const prefetchProduct = (slug) => void getJson(`/data/products/${slug}.json`).catch(() => {})

// Every listing is shown on its own, exactly as the store lists it (no merging of RAM/storage
// variants). The model shape is kept so cards and pages share one data structure.
const groupedCache = new WeakMap()
const asModel = (p) => ({
  key: p.slug,
  name: p.name,
  slug: p.slug,
  brand: p.brand,
  brandName: p.brandName,
  category: p.category,
  categoryName: p.categoryName,
  date: p.date,
  image: p.image,
  minPrice: p.price ?? null,
  maxPrice: p.price ?? null,
  variants: [{ ...p, variantLabel: null, ram: null, storage: null }],
})
function grouped(products) {
  if (!groupedCache.has(products)) {
    const models = products.map(asModel)
    const bySlug = new Map()
    for (const m of models) for (const v of m.variants) bySlug.set(v.slug, m)
    groupedCache.set(products, { models, bySlug })
  }
  return groupedCache.get(products)
}

// → { data: models[] | undefined, error, loading, retry, modelOf(slug), redirectOf(slug) }
//   modelOf(slug)    the card data for a listing slug (undefined for unknown slugs)
//   redirectOf(slug) always undefined now that listings are not merged; kept for callers
export function useModels() {
  const res = useProducts()
  const g = useMemo(() => (res.data ? grouped(res.data) : null), [res.data])
  return {
    ...res,
    data: g?.models,
    modelOf: (slug) => g?.bySlug.get(slug),
    redirectOf: () => undefined,
  }
}
