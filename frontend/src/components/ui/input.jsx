export function Input({ className = '', ...props }) {
  return (
    <input
      className={
        'flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 ' +
        'text-sm placeholder:text-slate-400 ' +
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 ' +
        'disabled:opacity-50 disabled:cursor-not-allowed ' +
        className
      }
      {...props}
    />
  )
}
