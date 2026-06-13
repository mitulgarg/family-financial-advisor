// The one-line "why we ask" / reassurance microcopy under questions.
export function Whisper({ children }) {
  return (
    <p className="mt-1.5 text-xs leading-relaxed text-[var(--color-ink-muted)]">
      {children}
    </p>
  )
}
