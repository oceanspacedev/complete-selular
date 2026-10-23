import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { X } from 'lucide-react'
import { useJson } from '../lib/data'
import { compare, useCompare } from '../lib/compare'
import { formatPrice, specGroups } from '../lib/format'
import { displayName } from '../lib/variants'
import { waProduct } from '../lib/wa'
import { absoluteUrl } from '../lib/seo'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'
import ErrorState from '../components/ErrorState'
import Img from '../components/Img'
import Seo from '../components/Seo'
import { WhatsAppIcon } from '../components/icons'

export default function Compare() {
  const slugs = useCompare()
  const slots = useProductSlots(slugs)
  const products = slots.map((s) => s.data)
  const failed = slots.filter((s) => s.error && !s.error.notFound)
  const ready = slugs.length > 0 && products.every(Boolean)
  const items = ready ? products.map(describe) : []

  // { text, list? } — list is the selection before a removal, for "Urungkan"
  const [notice, setNotice] = useState(null)
  const [diffOnly, setDiffOnly] = useState(false)
  const diff = ready && items.length > 1 && diffOnly
  const groups = ready ? buildGroups(products) : []
  const shown = diff
    ? groups.map((g) => ({ ...g, rows: g.rows.filter((r) => !same(r.values)) })).filter((g) => g.rows.length)
    : groups
  const rowCount = (list) => list.reduce((sum, g) => sum + g.rows.length, 0)
  const hidden = rowCount(groups) - rowCount(shown)

  // Removing a column unmounts the focused button; say where focus goes next and move it after render.
  const focusNext = useRef(null)
  useEffect(() => {
    const target = focusNext.current
    if (!target) return
    focusNext.current = null
    const el =
      target === 'undo'
        ? document.getElementById('compare-undo')
        : target === 'heading'
          ? null
          : document.querySelector(`[data-remove="${CSS.escape(target)}"]`)
    if (el) {
      el.focus()
      return
    }
    const h1 = document.querySelector('main h1')
    if (h1) {
      h1.tabIndex = -1
      h1.focus()
    }
  })

  // A product that no longer exists is dropped; a network failure keeps the selection and offers a retry.
  const gone = slugs.filter((s, i) => slots[i]?.error?.notFound)
  const goneKey = gone.join()
  useEffect(() => {
    if (!goneKey) return
    const list = goneKey.split(',')
    list.forEach((s) => compare.remove(s))
    setNotice({ text: `${list.length} produk sudah tidak tersedia lagi dan dihapus dari perbandingan.` })
  }, [goneKey])

  function remove(item, i) {
    const { slug } = item.p
    const prev = compare.remove(slug, item.full)
    const rest = prev.filter((s) => s !== slug)
    focusNext.current = rest.length ? rest[Math.min(i, rest.length - 1)] : 'undo'
    setNotice({ text: `${item.full} dihapus dari perbandingan.`, list: prev })
  }

  function clearAll() {
    const prev = compare.clear()
    focusNext.current = 'undo'
    setNotice({ text: `${prev.length} produk dihapus dari perbandingan.`, list: prev })
  }

  function undo() {
    compare.restore(notice.list)
    focusNext.current = notice.list.find((s) => !slugs.includes(s)) ?? 'heading'
    setNotice(null)
  }

  function dismiss() {
    focusNext.current = slugs[0] ?? 'heading'
    setNotice(null)
  }

  return (
    <>
      <Seo
        title="Bandingkan Produk"
        description={`Bandingkan harga dan spesifikasi hingga ${compare.max} HP, tablet, atau gadget sekaligus di Complete Selular.`}
        noindex
      />
      <PageHeader title="Bandingkan Produk" subtitle={`Maksimal ${compare.max} produk.`} />
      <div className="container-page py-3 sm:py-4">
        {notice && (
          <div className="border-brand-100 bg-brand-50 text-ink mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border py-1.5 pr-1.5 pl-4 text-sm">
            <p className="min-w-0 flex-1">{notice.text}</p>
            {notice.list && (
              <button id="compare-undo" type="button" onClick={undo} className="btn-ghost min-h-9 px-3 py-1.5">
                Urungkan
              </button>
            )}
            <button
              type="button"
              onClick={dismiss}
              aria-label="Tutup pemberitahuan"
              className="text-muted hover:text-ink hover:bg-brand-100 grid size-9 place-items-center rounded-lg pointer-coarse:size-11"
            >
              <X className="size-4" />
            </button>
          </div>
        )}

        {!slugs.length ? (
          <EmptyState
            title="Belum ada produk untuk dibandingkan"
            actions={
              <>
                <Link to="/katalog" className="btn-primary">
                  Lihat Katalog
                </Link>
                <Link to="/semua-brand" className="btn-ghost">
                  Pilih per Brand
                </Link>
              </>
            }
          >
            Tekan <strong className="text-ink font-bold">Bandingkan</strong> di produk yang kamu mau.
          </EmptyState>
        ) : failed.length ? (
          <ErrorState title="Gagal memuat perbandingan" onRetry={() => failed.forEach((s) => s.retry())} />
        ) : !ready ? (
          <CompareSkeleton count={slugs.length} />
        ) : (
          <>
            <Toolbar
              count={slugs.length}
              diffOnly={diffOnly}
              onDiffOnly={setDiffOnly}
              onClear={clearAll}
              status={
                !diff
                  ? ''
                  : !shown.length
                    ? 'Tidak ada perbedaan spesifikasi'
                    : hidden
                      ? `${hidden} spesifikasi yang sama disembunyikan`
                      : 'Semua spesifikasi berbeda'
              }
            />
            {slugs.length === 1 && (
              <p className="text-muted mb-3 text-sm">Tambahkan minimal 1 produk lagi untuk mulai membandingkan.</p>
            )}
            <CompareTable items={items} groups={shown} empty={diff && !shown.length} onRemove={remove} />
          </>
        )}
      </div>
    </>
  )
}

// The column title is the listing's own full name, as in the store
function describe(p) {
  const name = displayName(p.name)
  return { p, name, full: name }
}

// One useJson per slot: compare.max is a constant, so the number and order of hooks never change.
function useProductSlots(slugs) {
  return Array.from({ length: compare.max }, (_, i) =>
    useJson(slugs[i] ? `/data/products/${slugs[i]}.json` : null),
  ).slice(0, slugs.length)
}

function Toolbar({ count, diffOnly, onDiffOnly, onClear, status }) {
  const id = useId()
  return (
    <div className="card mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2 sm:min-h-14 sm:px-4">
      <p className="text-muted me-auto text-sm">
        <b className="text-ink font-extrabold">{count}</b> dari {compare.max} produk dipilih
      </p>
      {count > 1 && (
        <div className="flex flex-wrap items-center gap-x-3">
          <label className="text-ink inline-flex min-h-10 items-center gap-2 text-sm font-semibold pointer-coarse:min-h-11">
            <input
              type="checkbox"
              checked={diffOnly}
              onChange={(e) => onDiffOnly(e.target.checked)}
              aria-describedby={id}
              className="accent-brand-600 size-4"
            />
            Tampilkan perbedaan saja
          </label>
          {/* Right next to the toggle, so the effect of ticking it is visible (and announced) without scrolling */}
          <span id={id} role="status" className="text-muted text-[13px]">
            {status}
          </span>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {count < compare.max && (
          <Link to="/katalog" className="btn-ghost">
            Tambah produk
          </Link>
        )}
        {count > 1 && (
          <button
            type="button"
            onClick={onClear}
            className="btn border-line text-ink hover:border-brand-300 border bg-white"
          >
            Hapus semua
          </button>
        )}
      </div>
    </div>
  )
}

// Below sm the table is restyled into stacked rows (label on its own line, one value per product
// underneath). Changing display drops native table semantics in some browsers, so the ARIA roles
// are spelled out.
function CompareTable({ items, groups, empty, onRemove }) {
  const n = items.length
  const grid = { gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }
  const headRef = useRef(null)
  const endRef = useRef(null)
  const pinned = usePinnedNames(headRef, endRef)
  const labelCell =
    'px-4 py-2.5 text-left align-top font-normal text-muted sm:border-b sm:border-line max-sm:col-span-full max-sm:px-3 max-sm:pt-2.5 max-sm:pb-1 max-sm:text-xs max-sm:font-semibold'
  const valueCell = (i) =>
    `px-4 py-2.5 align-top wrap-anywhere text-ink sm:border-b sm:border-line max-sm:px-3 max-sm:pt-0 max-sm:pb-2.5 ${
      i ? 'max-sm:border-l max-sm:border-line' : ''
    }`

  return (
    <div className="card relative">
      <PinnedNames items={items} visible={pinned} />
      <table
        role="table"
        aria-labelledby="compare-caption"
        className="w-full table-fixed border-separate border-spacing-0 text-sm max-sm:block"
      >
        <caption id="compare-caption" className="sr-only">
          Perbandingan harga dan spesifikasi: {items.map((it) => it.full).join(', ')}
        </caption>
        <colgroup className="max-sm:hidden">
          <col className="w-36 md:w-44 lg:w-56" />
          {items.map((it) => (
            <col key={it.p.slug} />
          ))}
        </colgroup>

        <thead ref={headRef} role="rowgroup" className="max-sm:border-line max-sm:block max-sm:border-b">
          <tr role="row" className="max-sm:grid" style={grid}>
            <td role="cell" className="border-line border-b max-sm:hidden" />
            {items.map((it, i) => (
              <th
                key={it.p.slug}
                role="columnheader"
                scope="col"
                // Name the column by the product only, not by the remove button inside it
                aria-label={it.full}
                className="sm:border-line relative p-2 align-top font-normal sm:border-b sm:p-3"
              >
                <Link
                  to={`/product/${it.p.slug}`}
                  className="group flex flex-col items-center gap-1.5 rounded-lg text-center"
                >
                  <span className="grid size-20 place-items-center sm:size-24 lg:size-28">
                    <Img
                      img={it.p.image}
                      noUpscale={it.p.image?.lowRes}
                      sizes="(min-width: 1024px) 112px, (min-width: 640px) 96px, 80px"
                      alt=""
                      className="size-full object-contain"
                    />
                  </span>
                  <span className="group-hover:text-brand-700 text-ink line-clamp-3 text-xs leading-snug font-semibold text-balance sm:text-[13px]">
                    {it.name}
                  </span>
                </Link>
                <button
                  type="button"
                  data-remove={it.p.slug}
                  onClick={() => onRemove(it, i)}
                  aria-label={`Hapus ${it.full} dari perbandingan`}
                  title="Hapus dari perbandingan"
                  // 32px square with a 44px hit area
                  className="border-line text-muted hover:text-ink hover:border-brand-300 absolute top-1 right-1 grid size-8 place-items-center rounded-lg border bg-white before:absolute before:-inset-1.5 before:content-[''] sm:top-2 sm:right-2"
                >
                  <X className="size-4" aria-hidden />
                </button>
              </th>
            ))}
          </tr>
        </thead>

        {/* Price and the buy buttons always stay, even when only differences are shown */}
        <tbody role="rowgroup" className="max-sm:block">
          <tr role="row" className="max-sm:border-line max-sm:grid max-sm:border-b" style={grid}>
            <th role="rowheader" scope="row" className={labelCell}>
              Harga
            </th>
            {items.map(({ p, name, full }, i) => {
              const price = formatPrice(p.price)
              return (
                <td key={p.slug} role="cell" className={valueCell(i)}>
                  <p className={`whitespace-nowrap ${p.price ? 'text-ink font-extrabold tabular-nums' : 'text-muted'}`}>
                    {price}
                  </p>
                  <a
                    href={waProduct(name, p.price ? price : undefined, absoluteUrl(`/product/${p.slug}`))}
                    target="_blank"
                    rel="noopener"
                    aria-label={`Beli via WhatsApp: ${full} (buka di tab baru)`}
                    className="btn-ghost mt-2 w-full !px-3"
                  >
                    <WhatsAppIcon className="size-4 shrink-0" />
                    <span>
                      Beli<span className="max-lg:hidden"> via WhatsApp</span>
                    </span>
                  </a>
                </td>
              )
            })}
          </tr>
        </tbody>

        {groups.map((g) => (
          <tbody key={g.group} role="rowgroup" className="max-sm:block">
            <tr role="row" className="max-sm:grid">
              <th
                role="rowheader"
                scope="rowgroup"
                colSpan={n + 1}
                className="bg-canvas text-ink border-line border-b px-4 py-2 text-left text-[13px] font-bold max-sm:col-span-full max-sm:px-3"
              >
                {g.group}
              </th>
            </tr>
            {g.rows.map((r) => (
              <tr key={r.label} role="row" className="max-sm:border-line max-sm:grid max-sm:border-b" style={grid}>
                <th role="rowheader" scope="row" className={labelCell}>
                  {r.label}
                </th>
                {r.values.map((v, i) => (
                  <td key={i} role="cell" className={valueCell(i)}>
                    {v || (
                      <>
                        <span aria-hidden="true" className="text-muted">
                          —
                        </span>
                        <span className="sr-only">Tidak ada data</span>
                      </>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        ))}
      </table>
      {empty && <p className="text-muted px-4 py-3 text-sm">Tidak ada perbedaan spesifikasi di antara produk ini.</p>}
      {/* Where the pinned strip bows out, so it never hangs past the end of the table */}
      <div ref={endRef} aria-hidden className="pointer-events-none absolute inset-x-0 bottom-20 h-px" />
    </div>
  )
}

// Once the full column headers (photo, name, capacity) scroll away, a slim strip keeps just the names in
// view: pinning the whole header ate up to a third of the screen. It repeats the column headers, so it
// is hidden from screen readers, which get the real ones.
function PinnedNames({ items, visible }) {
  return (
    <div aria-hidden className="sticky top-25 z-20 h-0 sm:top-16 lg:top-27 [@media(max-height:30rem)]:top-0">
      <div
        style={{ '--n': items.length }}
        className={`border-line absolute inset-x-0 top-0 grid grid-cols-[repeat(var(--n),minmax(0,1fr))] border-b bg-white shadow-[var(--shadow-card)] transition-[opacity,translate,visibility] duration-150 motion-reduce:transition-none sm:grid-cols-[9rem_repeat(var(--n),minmax(0,1fr))] md:grid-cols-[11rem_repeat(var(--n),minmax(0,1fr))] lg:grid-cols-[14rem_repeat(var(--n),minmax(0,1fr))] ${
          visible ? '' : 'invisible -translate-y-1 opacity-0'
        }`}
      >
        <span className="max-sm:hidden" />
        {items.map((it, i) => (
          <div
            key={it.p.slug}
            className={`flex min-w-0 items-center gap-2.5 px-2 py-1.5 sm:px-4 sm:py-2 ${
              i ? 'max-sm:border-line max-sm:border-l' : ''
            }`}
          >
            <Img
              img={it.p.image}
              noUpscale={it.p.image?.lowRes}
              sizes="40px"
              alt=""
              className="size-10 shrink-0 object-contain max-sm:hidden"
            />
            <div className="min-w-0">
              <p className="text-ink line-clamp-2 text-xs leading-4 font-semibold sm:text-[13px] sm:leading-5">
                {it.name}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// True while the column headers are above the visible area and the end of the table is still below it.
// The visible area starts under the site header, which only sticks on viewports taller than 30rem.
// Measured once per frame on scroll rather than with an IntersectionObserver: a jump (End key, a fling)
// can carry both edges past the top without either crossing it inside a frame, and the observer stays quiet.
function usePinnedNames(headRef, endRef) {
  const [pinned, setPinned] = useState(false)
  useEffect(() => {
    const head = headRef.current
    const end = endRef.current
    if (!head || !end) return
    let top = 0
    let frame = 0
    const measureTop = () => {
      const header = document.querySelector('.site-header')
      top = header && getComputedStyle(header).position === 'sticky' ? header.getBoundingClientRect().bottom : 0
    }
    const update = () => {
      frame = 0
      setPinned(head.getBoundingClientRect().bottom <= top && end.getBoundingClientRect().top > top)
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    const resize = () => {
      measureTop()
      schedule()
    }
    measureTop()
    update()
    // Hiding identical rows or removing a column changes the table's height without any scrolling
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(schedule) : null
    ro?.observe(end.parentElement)
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', resize)
    return () => {
      cancelAnimationFrame(frame)
      ro?.disconnect()
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', resize)
    }
  }, [headRef, endRef])
  return pinned
}

function CompareSkeleton({ count }) {
  return (
    <div role="status" className="card p-3 sm:p-4">
      <span className="sr-only">Memuat perbandingan…</span>
      <div
        aria-hidden
        className="grid gap-4 sm:ml-40"
        style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <div className="skeleton size-12 rounded-lg sm:size-16 lg:size-20" />
            <div className="skeleton h-3 w-3/4 rounded" />
          </div>
        ))}
      </div>
      <div aria-hidden className="mt-4 space-y-2">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="skeleton h-9 rounded" />
        ))}
      </div>
    </div>
  )
}

const same = (values) => values.every((v) => v && v.toLowerCase() === values[0].toLowerCase())

// Union of every spec row across the selected products, grouped like the product pages.
function buildGroups(products) {
  const groups = new Map()
  products.forEach((p, i) => {
    for (const g of specGroups(p.specs)) {
      if (!groups.has(g.group)) groups.set(g.group, new Map())
      const rows = groups.get(g.group)
      for (const r of g.rows) {
        if (!rows.has(r.label)) rows.set(r.label, Array(products.length).fill(''))
        const values = rows.get(r.label)
        if (!values[i]) values[i] = r.value
      }
    }
  })
  return [...groups].map(([group, rows]) => ({
    group,
    rows: [...rows].map(([label, values]) => ({ label, values })),
  }))
}
