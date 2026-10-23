import { Children, useCallback, useEffect, useId, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const ITEM = 'w-[44%] sm:w-[30%] lg:w-[22%] xl:w-[18.5%]'
// The top padding (cancelled by the negative margin) keeps the cards' focus outline inside the
// scroller, which clips everything outside its padding box.
const TRACK = '-mx-4 -mt-1.5 flex gap-3 px-4 pt-1.5 pb-2 sm:-mx-6 sm:gap-4 sm:px-6'

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// Horizontal scroll-snap list: swipe on touch, arrow buttons on hover-capable pointers.
export default function Rail({ children, itemClass = ITEM }) {
  const id = useId()
  const ref = useRef(null)
  const [edges, setEdges] = useState({ start: true, end: true })

  const measure = useCallback(() => {
    const el = ref.current
    if (!el) return
    const start = el.scrollLeft <= 1
    const end = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1
    setEdges((e) => (e.start === start && e.end === end ? e : { start, end }))
  }, [])

  useEffect(() => {
    const el = ref.current
    let frame = 0
    const schedule = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(measure)
    }
    el.addEventListener('scroll', schedule, { passive: true })
    const observer = new ResizeObserver(schedule)
    observer.observe(el)
    return () => {
      cancelAnimationFrame(frame)
      el.removeEventListener('scroll', schedule)
      observer.disconnect()
    }
  }, [measure])

  // The item count can change without the track itself resizing
  useEffect(measure)

  const scroll = (dir) => {
    const el = ref.current
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: reducedMotion() ? 'auto' : 'smooth' })
  }

  return (
    <div className="group/rail relative">
      {/* Before the track in DOM order so keyboard users meet them first, not after every card.
          At the ends they leave the Tab order but use aria-disabled rather than disabled, which
          would throw away focus when the arrow you are pressing reaches the end. */}
      {!(edges.start && edges.end) &&
        [-1, 1].map((dir) => {
          const off = dir < 0 ? edges.start : edges.end
          return (
            <button
              key={dir}
              type="button"
              onClick={() => !off && scroll(dir)}
              aria-label={dir < 0 ? 'Sebelumnya' : 'Berikutnya'}
              aria-controls={id}
              aria-disabled={off}
              tabIndex={off ? -1 : undefined}
              className={`absolute top-1/2 z-10 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-white opacity-0 shadow-lg ring-1 ring-slate-200 transition-opacity group-focus-within/rail:opacity-100 group-hover/rail:opacity-100 [@media(hover:hover)]:grid ${
                dir < 0 ? 'left-1' : 'right-1'
              } ${off ? 'cursor-not-allowed text-slate-300 shadow-none' : 'hover:text-brand-700 text-slate-700'}`}
            >
              {dir < 0 ? <ChevronLeft className="size-5" /> : <ChevronRight className="size-5" />}
            </button>
          )
        })}
      <div
        ref={ref}
        id={id}
        role="list"
        className={`${TRACK} snap-x snap-mandatory scroll-px-4 scrollbar-none overflow-x-auto sm:scroll-px-6`}
      >
        {Children.toArray(children).map((child) => (
          <div key={child.key} role="listitem" className={`shrink-0 snap-start ${itemClass}`}>
            {child}
          </div>
        ))}
      </div>
    </div>
  )
}

// Rail-shaped placeholder; pass one skeleton item as children (e.g. <CardSkeleton />).
export function RailSkeleton({ count = 5, itemClass = ITEM, label = 'Memuat…', children }) {
  return (
    <div role="status" className={`${TRACK} overflow-hidden`}>
      <span className="sr-only">{label}</span>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={`shrink-0 ${itemClass}`}>
          {children}
        </div>
      ))}
    </div>
  )
}
