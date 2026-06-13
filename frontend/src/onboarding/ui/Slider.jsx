import * as SliderPrimitive from '@radix-ui/react-slider'

// Radix slider styled to tokens: track in border color, range and thumb in
// the context accent. Replaces the stock browser range input.
export function Slider({ value, min, max, step = 1, onChange, label }) {
  return (
    <SliderPrimitive.Root
      className="relative flex h-11 w-full touch-none select-none items-center"
      value={[value]}
      min={min}
      max={max}
      step={step}
      onValueChange={(v) => onChange(v[0])}
    >
      <SliderPrimitive.Track className="relative h-[5px] grow overflow-hidden rounded-full bg-[var(--color-border)]">
        <SliderPrimitive.Range className="absolute h-full rounded-full bg-[var(--accent)]" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        aria-label={label}
        className={
          'block h-6 w-6 rounded-full bg-[var(--accent)] shadow-[0_2px_10px_oklch(0%_0_0_/_0.4)] ' +
          'ring-[6px] ring-[var(--accent-soft)] transition-transform duration-150 ' +
          'focus:outline-none focus-visible:ring-[var(--accent)] active:scale-110'
        }
      />
    </SliderPrimitive.Root>
  )
}
