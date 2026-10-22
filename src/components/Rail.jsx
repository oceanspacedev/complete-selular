import { useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
// Horizontal scroll-snap list; arrow buttons appear on pointer devices only.
export default function Rail({ children, itemClass = 'w-[44%] sm:w-[30%] lg:w-[22%] xl:w-[18.5%]' }) {
  const ref = useRef(null)
  const scroll = (dir) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.8, behavior: 'smooth' })
  return (
    <div className="group/rail relative">
      <div
        ref={ref}
        className="-mx-4 flex snap-x snap-mandatory scroll-px-4 scrollbar-none gap-3 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:scroll-px-6 sm:gap-4 sm:px-6"
      >
        {children.map((child, i) => (
          <div key={i} className={`shrink-0 snap-start ${itemClass}`}>
            {child}
          </div>
        ))}
      </div>
      {[-1, 1].map((dir) => (
        <button
          key={dir}
          type="button"
          onClick={() => scroll(dir)}
          aria-label={dir < 0 ? 'Sebelumnya' : 'Berikutnya'}
          className={`hover:text-brand-700 absolute top-1/2 z-10 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-white text-slate-700 opacity-0 shadow-lg ring-1 ring-slate-200 transition-opacity group-hover/rail:opacity-100 [@media(hover:hover)]:grid ${dir < 0 ? '-left-5' : '-right-5'}`}
        >
          {dir < 0 ? <ChevronLeft className="size-5" /> : <ChevronRight className="size-5" />}
        </button>
      ))}
    </div>
  )
}
