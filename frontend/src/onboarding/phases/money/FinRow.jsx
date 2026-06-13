import { motion } from 'motion/react'
import { X } from '@phosphor-icons/react'
import { formatINR, formatTenure } from '../../money'
import { RupeeSlider } from '../../ui/RupeeSlider'
import { Slider } from '../../ui/Slider'

// A selected money item: icon + label header with a summary, controls below.
export function FinRow({ Icon, label, summary, onRemove, children }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 340, damping: 28 }}
      className="shrink-0 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)]">
          <Icon size={18} weight="duotone" className="text-[var(--accent)]" />
        </span>
        <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-[var(--color-ink)]">
          {label}
        </span>
        {summary && (
          <span className="shrink-0 text-[13px] tabular-nums text-[var(--color-ink-muted)]">
            {summary}
          </span>
        )}
        {onRemove && (
          <button
            onClick={onRemove}
            aria-label={`Remove ${label}`}
            className="press-shrink flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--color-ink-muted)] transition-colors hover:text-[var(--color-rose)]"
          >
            <X size={14} weight="bold" />
          </button>
        )}
      </div>
      {children && <div className="mt-1">{children}</div>}
    </motion.div>
  )
}

// Label + live value + log rupee slider. The default is only where the slider
// opens; the value reads muted until the member actually sets it.
export function AmountControl({ label, value, defaultValue, onChange, min, max }) {
  const isSet = value != null
  return (
    <div className="mt-1">
      <div className="flex items-baseline justify-between">
        <span className="text-[12px] text-[var(--color-ink-muted)]">{label}</span>
        <span
          className={
            'text-[14px] font-semibold tabular-nums ' +
            (isSet ? 'text-[var(--color-ink)]' : 'text-[var(--color-ink-muted)]')
          }
        >
          {formatINR(isSet ? value : defaultValue)}
          {!isSet && '?'}
        </span>
      </div>
      <RupeeSlider
        value={value ?? defaultValue}
        min={min}
        max={max}
        onChange={onChange}
        label={label}
      />
    </div>
  )
}

// Time-left control for loans: linear months slider, 3 months to 30 years.
export function TenureControl({ label, value, defaultValue, onChange }) {
  const isSet = value != null
  return (
    <div className="mt-1">
      <div className="flex items-baseline justify-between">
        <span className="text-[12px] text-[var(--color-ink-muted)]">{label}</span>
        <span
          className={
            'text-[14px] font-semibold tabular-nums ' +
            (isSet ? 'text-[var(--color-ink)]' : 'text-[var(--color-ink-muted)]')
          }
        >
          {formatTenure(isSet ? value : defaultValue)}
          {!isSet && '?'}
        </span>
      </div>
      <Slider
        value={value ?? defaultValue}
        min={3}
        max={360}
        step={3}
        onChange={onChange}
        label={label}
      />
    </div>
  )
}
