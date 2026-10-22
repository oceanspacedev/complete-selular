import Breadcrumbs from './Breadcrumbs'
export default function PageHeader({ title, subtitle, crumbs, children }) {
  return (
    <header className="border-b border-slate-200/70 bg-white">
      <div className="container-page py-8 sm:py-10">
        <Breadcrumbs items={crumbs ?? [{ label: title }]} />
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-2 max-w-2xl text-slate-600">{subtitle}</p>}
        {children}
      </div>
    </header>
  )
}
