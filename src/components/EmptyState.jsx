import { SearchX } from 'lucide-react'
export default function EmptyState({ title, children }) {
  return (
    <div className="card flex flex-col items-center px-6 py-16 text-center">
      <span className="bg-brand-50 text-brand-600 mb-4 grid size-14 place-items-center rounded-full">
        <SearchX className="size-7" />
      </span>
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      {children && <div className="mt-2 text-slate-600">{children}</div>}
    </div>
  )
}
