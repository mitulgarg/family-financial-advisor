export function Button({ className = '', ...props }) {
  return (
    <button
      className={
        'inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 ' +
        'text-sm font-medium text-white shadow transition-colors ' +
        'hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed ' +
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 ' +
        className
      }
      {...props}
    />
  )
}
