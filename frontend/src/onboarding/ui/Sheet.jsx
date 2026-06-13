import { AnimatePresence, motion } from 'motion/react'

const spring = { type: 'spring', stiffness: 360, damping: 30 }

// Bottom sheet on mobile, centered dialog on desktop.
export function Sheet({ open, onClose, title, children }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            className="fixed inset-0 z-40 bg-black/55"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <div className="pointer-events-none fixed inset-0 z-50 flex items-end justify-center sm:items-center">
            <motion.div
              key="panel"
              role="dialog"
              aria-modal="true"
              className={
                'pointer-events-auto max-h-[88vh] w-full overflow-y-auto rounded-t-[28px] border ' +
                'border-[var(--color-border)] bg-[var(--color-surface-raised)] p-5 pb-8 ' +
                'sm:w-[460px] sm:rounded-[28px] sm:pb-5'
              }
              initial={{ y: 64, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 64, opacity: 0 }}
              transition={spring}
            >
              <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-[var(--color-border)] sm:hidden" />
              {title && (
                <h2 className="mb-4 text-[17px] font-semibold tracking-tight text-[var(--color-ink)]">
                  {title}
                </h2>
              )}
              {children}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
