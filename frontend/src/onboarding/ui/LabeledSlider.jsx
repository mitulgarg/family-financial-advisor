import { Slider } from './Slider'
import { Whisper } from './Whisper'

// Slider with a live value readout, the default control for any number.
export function LabeledSlider({
  label,
  whisper,
  value,
  min,
  max,
  step = 1,
  onChange,
  format = (v) => String(v),
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label className="text-sm font-medium text-[var(--color-ink)]">{label}</label>
        <span className="text-lg font-semibold tabular-nums text-[var(--color-ink)]">
          {format(value)}
        </span>
      </div>
      <Slider value={value} min={min} max={max} step={step} onChange={onChange} label={label} />
      {whisper && <Whisper>{whisper}</Whisper>}
    </div>
  )
}
