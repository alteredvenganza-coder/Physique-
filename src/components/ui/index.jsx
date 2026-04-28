import { useEffect, useState } from 'react'

// ── Card ─────────────────────────────────────────────────────
export function Card({ className = '', children, ...rest }) {
  return (
    <div
      className={`glass rounded-3xl p-4 ${className}`}
      {...rest}
    >
      {children}
    </div>
  )
}

// ── Stat ─────────────────────────────────────────────────────
export function Stat({ label, value, suffix, progress, tone = 'sun' }) {
  const grad =
    tone === 'good'    ? 'from-emerald-400 to-teal-300' :
    tone === 'lavender'? 'from-[#d4a8d8] to-[#ffb37a]' :
                         'from-[#ff7a4a] to-[#ffb37a]'
  return (
    <div className="bg-white/60 rounded-2xl px-3 py-3">
      <div className="label-caps">{label}</div>
      <div className="font-display font-extrabold text-[20px] text-[var(--color-ink)] mt-1 leading-none">
        {value}{suffix && <span className="text-[12px] font-medium opacity-50 ml-0.5">{suffix}</span>}
      </div>
      {typeof progress === 'number' && (
        <div className="mt-2 h-1 rounded-full bg-black/[0.06] overflow-hidden">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${grad}`}
            style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
          />
        </div>
      )}
    </div>
  )
}

// ── Ring ─────────────────────────────────────────────────────
export function Ring({ percent, size = 64, label }) {
  const p = Math.max(0, Math.min(100, percent || 0))
  return (
    <div
      className="relative flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      <div
        className="absolute inset-0 rounded-full"
        style={{ background: `conic-gradient(#ff7a4a ${p * 3.6}deg, rgba(0,0,0,.06) 0)` }}
      />
      <div className="absolute inset-[6px] bg-[var(--color-cream)] rounded-full" />
      <div className="relative font-display font-extrabold text-[var(--color-ink)]"
           style={{ fontSize: size * 0.26 }}>
        {label || `${Math.round(p)}%`}
      </div>
    </div>
  )
}

// ── Pill ─────────────────────────────────────────────────────
export function Pill({ tone = 'sun', children, className = '' }) {
  const cls =
    tone === 'good' ? 'bg-emerald-100/70 text-emerald-800' :
    tone === 'bad'  ? 'bg-rose-100/70 text-rose-800' :
                      'bg-white/55 text-[var(--color-bad)]'
  return (
    <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] tracking-wider font-mono font-medium backdrop-blur ${cls} ${className}`}>
      {children}
    </span>
  )
}

// ── Bar ──────────────────────────────────────────────────────
export function Bar({ value, max, tone = 'sun' }) {
  const pct = Math.max(0, Math.min(100, max > 0 ? (value / max) * 100 : 0))
  const grad =
    tone === 'good' ? 'from-emerald-400 to-teal-300' :
    tone === 'lav'  ? 'from-[#d4a8d8] to-[#ffb37a]' :
                      'from-[#ff7a4a] to-[#ffb37a]'
  return (
    <div className="h-1.5 rounded-full bg-black/[0.06] overflow-hidden">
      <div className={`h-full rounded-full bg-gradient-to-r ${grad} transition-[width]`} style={{ width: `${pct}%` }} />
    </div>
  )
}

// ── Button ───────────────────────────────────────────────────
export function Button({ variant = 'primary', className = '', children, ...rest }) {
  const base = 'press inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 font-mono font-semibold tracking-wider uppercase text-[10px] disabled:opacity-50 disabled:cursor-not-allowed'
  const styles = variant === 'primary'
    ? 'bg-gradient-to-br from-[#ff7a4a] to-[#ffb37a] text-white shadow-[var(--shadow-pill)]'
    : variant === 'ghost'
    ? 'bg-white/60 backdrop-blur text-[var(--color-ink-2)]'
    : 'bg-transparent text-[var(--color-ink-3)]'
  return <button className={`${base} ${styles} ${className}`} {...rest}>{children}</button>
}

// ── IconButton ───────────────────────────────────────────────
export function IconButton({ children, className = '', ...rest }) {
  return (
    <button
      className={`press w-9 h-9 rounded-full bg-gradient-to-br from-[#ff7a4a] to-[#ffb37a] text-white grid place-items-center shadow-[var(--shadow-pill)] ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}

// ── Input ────────────────────────────────────────────────────
export function Input({ className = '', label, ...rest }) {
  return (
    <label className="block">
      {label && <span className="label-caps block mb-1">{label}</span>}
      <input
        className={`w-full bg-white/65 backdrop-blur rounded-2xl px-4 py-3 text-[15px] text-[var(--color-ink)] placeholder:text-[var(--color-muted)] outline-none focus:ring-2 focus:ring-[var(--color-sun-2)]/40 ${className}`}
        {...rest}
      />
    </label>
  )
}

// ── Textarea ─────────────────────────────────────────────────
export function Textarea({ className = '', label, ...rest }) {
  return (
    <label className="block">
      {label && <span className="label-caps block mb-1">{label}</span>}
      <textarea
        className={`w-full bg-white/65 backdrop-blur rounded-2xl px-4 py-3 text-[14px] text-[var(--color-ink)] placeholder:text-[var(--color-muted)] outline-none focus:ring-2 focus:ring-[var(--color-sun-2)]/40 resize-none ${className}`}
        {...rest}
      />
    </label>
  )
}

// ── Modal (bottom sheet) ─────────────────────────────────────
export function Modal({ open, onClose, title, children }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div
        className="w-full sm:max-w-md bg-[var(--color-cream)]/95 backdrop-blur-xl rounded-t-3xl sm:rounded-3xl shadow-2xl pt-3 max-h-[88dvh] overflow-y-auto pb-safe"
        style={{ animation: 'slideUp 0.25s ease-out' }}
      >
        <div className="w-10 h-1 mx-auto rounded-full bg-black/15 sm:hidden" />
        <div className="flex justify-between items-center px-5 pt-4 pb-1">
          <h3 className="font-display font-extrabold text-xl text-[var(--color-ink)] tracking-tight">{title}</h3>
          <button className="w-8 h-8 rounded-full bg-black/[0.06] grid place-items-center text-[var(--color-ink-3)]" onClick={onClose}>×</button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
      <style>{`@keyframes slideUp { from { transform: translateY(20px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }`}</style>
    </div>
  )
}

// ── NavBar (bottom 4 tabs) ───────────────────────────────────
export function NavBar({ active, onChange, tabs }) {
  return (
    <nav
      className="fixed left-0 right-0 mx-auto z-40 max-w-md px-4"
      style={{ bottom: 'max(env(safe-area-inset-bottom), 12px)' }}
    >
      <div className="bg-white/75 backdrop-blur-xl rounded-full p-1.5 flex shadow-[var(--shadow-soft)]">
        {tabs.map((t) => {
          const isActive = active === t.id
          return (
            <button
              key={t.id}
              onClick={() => onChange(t.id)}
              className={`press flex-1 py-2.5 rounded-full font-mono font-semibold text-[9px] tracking-[0.18em] uppercase transition-colors ${
                isActive
                  ? 'bg-gradient-to-br from-[#ff7a4a] to-[#ffb37a] text-white shadow-[var(--shadow-pill)]'
                  : 'text-[var(--color-muted)]'
              }`}
            >
              {t.label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}

// ── Toast (lightweight) ──────────────────────────────────────
let toastIdSeq = 0
const toastListeners = new Set()
let toastState = []
export function toast(msg, tone = 'sun') {
  const id = ++toastIdSeq
  toastState = [...toastState, { id, msg, tone }]
  toastListeners.forEach(l => l(toastState))
  setTimeout(() => {
    toastState = toastState.filter(t => t.id !== id)
    toastListeners.forEach(l => l(toastState))
  }, 2400)
}
export function ToastHost() {
  const [list, setList] = useToastState()
  return (
    <div className="fixed top-4 left-0 right-0 z-50 flex flex-col items-center gap-2 pointer-events-none">
      {list.map(t => (
        <div key={t.id}
          className="bg-[var(--color-ink)]/95 text-white px-4 py-2 rounded-full text-sm shadow-lg pointer-events-auto"
          style={{ animation: 'slideDown .25s ease' }}>
          {t.msg}
        </div>
      ))}
      <style>{`@keyframes slideDown { from { transform: translateY(-12px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }`}</style>
    </div>
  )
}
function useToastState() {
  const [s, setS] = useState(toastState)
  useEffect(() => {
    toastListeners.add(setS)
    return () => toastListeners.delete(setS)
  }, [])
  return [s, setS]
}

