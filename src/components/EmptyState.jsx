// A short bold title, one line of explanation and the way out, in a plain white card.
//   as       heading element; h2 by default so pages never skip from h1 to h3
//   actions  buttons/links rendered under the message — never leave the user at a dead end
//   icon     accepted for older callers, no longer drawn
export default function EmptyState({ title, as: Heading = 'h2', actions, children }) {
  return (
    <div className="card flex flex-col items-center px-4 py-8 text-center sm:py-10">
      <Heading className="text-ink text-base font-extrabold text-balance">{title}</Heading>
      {children && <div className="text-muted mt-1 max-w-md text-sm text-pretty">{children}</div>}
      {actions && <div className="mt-4 flex flex-wrap justify-center gap-2">{actions}</div>}
    </div>
  )
}
