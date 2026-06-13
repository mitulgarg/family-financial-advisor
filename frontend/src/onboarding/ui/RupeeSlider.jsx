import { Slider } from './Slider'
import { amountToPosition, positionToAmount } from '../money'

// Log-scale rupee slider: thumb position maps exponentially so 10k and 1Cr
// fit one track without making small amounts untouchable.
export function RupeeSlider({ value, onChange, min = 10000, max = 100000000, label }) {
  const position = value != null ? amountToPosition(value, min, max) : 300

  return (
    <Slider
      value={position}
      min={0}
      max={1000}
      step={5}
      label={label}
      onChange={(pos) => onChange(positionToAmount(pos, min, max))}
    />
  )
}
