export function PrimaryButton({ className = '', ...props }) {
  return (
    <button
      type="button"
      className={
        'press-shrink w-full rounded-2xl bg-[var(--accent)] px-5 py-3.5 ' +
        'text-[15px] font-semibold text-[var(--accent-ink)] transition-[filter] ' +
        'hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40 ' +
        className
      }
      {...props}
    />
  )
}

export function GhostButton({ className = '', ...props }) {
  return (
    <button
      type="button"
      className={
        'press-shrink min-h-[44px] rounded-2xl px-4 text-sm font-medium ' +
        'text-[var(--color-ink-muted)] transition-colors hover:text-[var(--color-ink)] ' +
        className
      }
      {...props}
    />
  )
}
