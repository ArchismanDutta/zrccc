import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

const SIZES = { sm: 420, md: 560, lg: 720 }

export default function Modal({ isOpen, onClose, title, children, size = 'md', footer }) {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose?.() }
    if (isOpen) window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      {/* Backdrop */}
      <div className="modal-backdrop-bg" />

      {/* Dialog */}
      <div
        className="modal-dialog"
        style={{ '--modal-max-w': `${SIZES[size]}px` }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <h2 className="font-semibold text-base text-fg truncate">{title}</h2>
          <button onClick={onClose} className="btn btn-ghost btn-icon" style={{ width: 30, height: 30, minHeight: 30 }}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="modal-footer">
            {footer}
          </div>
        )}
      </div>

      <style>{`
        .modal-overlay {
          position: fixed; inset: 0; z-index: 100;
          display: flex; align-items: center; justify-content: center;
          padding: 1rem;
        }
        .modal-backdrop-bg {
          position: absolute; inset: 0;
          background: rgba(0,0,0,.5); backdrop-filter: blur(4px);
          animation: mFadeIn .15s ease;
        }
        .modal-dialog {
          position: relative;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-xl);
          display: flex; flex-direction: column;
          max-height: 90vh; max-height: 90dvh;
          width: 100%; max-width: var(--modal-max-w, 560px);
          box-shadow: 0 25px 50px -12px rgba(0,0,0,.4);
          animation: mSlideUp .2s ease;
        }
        .modal-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 0.75rem 1rem; gap: 0.5rem;
          border-bottom: 1px solid var(--color-border);
          flex-shrink: 0;
        }
        .modal-body {
          flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch;
          padding: 1rem;
        }
        .modal-footer {
          display: flex; align-items: center; justify-content: flex-end; gap: 0.5rem;
          padding: 0.75rem 1rem;
          border-top: 1px solid var(--color-border);
          flex-shrink: 0;
        }
        @keyframes mFadeIn { from { opacity:0 } to { opacity:1 } }
        @keyframes mSlideUp { from { opacity:0; transform: translateY(16px) scale(.98) } to { opacity:1; transform: translateY(0) scale(1) } }

        /* ── Mobile: full-screen modal ── */
        @media (max-width: 639px) {
          .modal-overlay { padding: 0; align-items: flex-end; }
          .modal-dialog {
            max-width: 100% !important;
            max-height: 95vh; max-height: 95dvh;
            border-radius: var(--radius-xl) var(--radius-xl) 0 0;
            animation: mSlideUpMobile .25s ease;
          }
          .modal-body { padding: 0.875rem; }
          .modal-header { padding: 0.75rem 0.875rem; }
          .modal-footer { padding: 0.75rem 0.875rem; padding-bottom: calc(0.75rem + env(safe-area-inset-bottom, 0px)); }
        }
        @keyframes mSlideUpMobile { from { opacity:0; transform: translateY(100%) } to { opacity:1; transform: translateY(0) } }

        /* ── Tablet ── */
        @media (min-width: 640px) and (max-width: 1023px) {
          .modal-header { padding: 0.875rem 1.25rem; }
          .modal-body { padding: 1rem 1.25rem; }
          .modal-footer { padding: 0.875rem 1.25rem; }
        }

        /* ── Desktop ── */
        @media (min-width: 1024px) {
          .modal-header { padding: 0.875rem 1.5rem; }
          .modal-body { padding: 1.25rem 1.5rem; }
          .modal-footer { padding: 0.875rem 1.5rem; }
        }
      `}</style>
    </div>,
    document.body
  )
}
