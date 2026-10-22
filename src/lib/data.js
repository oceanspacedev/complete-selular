import { useEffect, useState } from 'react'

// Runtime JSON lives in /public/data so it is cached separately from the JS bundle.
const pending = new Map()
const resolved = new Map()

export function getJson(url) {
  if (!pending.has(url)) {
    pending.set(
      url,
      fetch(url)
        .then((r) => {
          if (!r.ok) throw new Error(`${r.status} ${url}`)
          return r.json()
        })
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
export function useJson(url) {
  const [state, setState] = useState(() => ({ url, ...initial(url) }))
  const current = state.url === url ? state : { url, ...initial(url) }

  useEffect(() => {
    if (!url || resolved.has(url)) return
    let alive = true
    getJson(url).then(
      (data) => alive && setState({ url, data, error: undefined }),
      (error) => alive && setState({ url, data: undefined, error }),
    )
    return () => {
      alive = false
    }
  }, [url])

  return { data: current.data, error: current.error, loading: !current.data && !current.error }
}

export const useProducts = () => useJson('/data/products.json')
export const useProduct = (slug) => useJson(`/data/products/${slug}.json`)
export const usePosts = () => useJson('/data/posts.json')
export const usePost = (slug) => useJson(`/data/posts/${slug}.json`)
export const useVideos = () => useJson('/data/videos.json')

export const prefetchProduct = (slug) => void getJson(`/data/products/${slug}.json`).catch(() => {})
