// Indian-notation money formatting and the log scale used by rupee sliders.

const trim = (x) => {
  const r = Math.round(x * 10) / 10
  return r % 1 === 0 ? String(Math.round(r)) : String(r)
}

export const formatINR = (n) => {
  if (n == null) return ''
  if (n >= 1e7) return `₹${trim(n / 1e7)}Cr`
  if (n >= 1e5) return `₹${trim(n / 1e5)}L`
  if (n >= 1e3) return `₹${trim(n / 1e3)}k`
  return `₹${Math.round(n)}`
}

// Round to two significant digits so slider values land on speakable numbers
// (47,000 not 47,312).
const nice = (x) => {
  const mag = Math.pow(10, Math.floor(Math.log10(x)) - 1)
  return Math.round(x / mag) * mag
}

// Loan tenures: months -> "8 mo", "2 yr", "2 yr 6 mo".
export const formatTenure = (months) => {
  if (months == null) return ''
  if (months < 12) return `${months} mo`
  const years = Math.floor(months / 12)
  const rest = months % 12
  return rest === 0 ? `${years} yr` : `${years} yr ${rest} mo`
}

// Slider position (0..1000) <-> rupee amount, log-interpolated. Fine-grained
// at the low end, coarse at the crore end.
export const positionToAmount = (pos, min, max) =>
  nice(min * Math.pow(max / min, pos / 1000))

export const amountToPosition = (amount, min, max) => {
  const clamped = Math.min(Math.max(amount, min), max)
  return Math.round((1000 * Math.log(clamped / min)) / Math.log(max / min))
}
