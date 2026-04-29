import { useEffect, useRef, useState } from 'react'
import { Card, Button, Modal, Input, toast } from './ui'

// Reusable countdown with presets, custom duration, audio beep at zero.
// Designed for workout timers (jump rope, plank, rest, etc.).
export default function CountdownTimer({
  title,
  subtitle,
  presets = [60, 180, 300, 600], // seconds: 1, 3, 5, 10 min
  defaultSeconds = 180,
  storageKey,
}) {
  const [target, setTarget] = useState(() => {
    if (storageKey) {
      const saved = parseInt(localStorage.getItem(storageKey))
      if (Number.isFinite(saved) && saved >= 5 && saved <= 7200) return saved
    }
    return defaultSeconds
  })
  const [remaining, setRemaining] = useState(target)
  const [running, setRunning] = useState(false)
  const [showCustom, setShowCustom] = useState(false)
  const tickRef = useRef(null)
  const endRef = useRef(0) // absolute end timestamp; survives tab freeze

  // Persist target choice.
  useEffect(() => {
    if (storageKey) localStorage.setItem(storageKey, String(target))
    if (!running) setRemaining(target)
  }, [target, running, storageKey])

  // Tick loop. We anchor on Date.now() so the timer stays accurate even if
  // the browser throttles setInterval in the background.
  useEffect(() => {
    if (!running) return
    tickRef.current = setInterval(() => {
      const left = Math.max(0, Math.round((endRef.current - Date.now()) / 1000))
      setRemaining(left)
      if (left <= 0) {
        clearInterval(tickRef.current)
        setRunning(false)
        playBeep()
        toast('Tempo scaduto')
      }
    }, 250)
    return () => clearInterval(tickRef.current)
  }, [running])

  const start = () => {
    if (running) return
    if (remaining <= 0) setRemaining(target)
    const startFrom = remaining > 0 ? remaining : target
    endRef.current = Date.now() + startFrom * 1000
    setRunning(true)
  }

  const pause = () => {
    setRunning(false)
  }

  const reset = () => {
    setRunning(false)
    setRemaining(target)
  }

  const pct = target > 0 ? (1 - remaining / target) * 100 : 0
  const mm = String(Math.floor(remaining / 60)).padStart(2, '0')
  const ss = String(remaining % 60).padStart(2, '0')

  return (
    <>
      <Card className="mx-3 mt-3">
        <div className="flex items-center justify-between mb-2">
          <span className="label-caps">{title}</span>
          {subtitle && <span className="label-caps opacity-60">{subtitle}</span>}
        </div>

        <div className="flex justify-center py-2">
          <ProgressCircle percent={pct} size={196} stroke={10}>
            <div className="flex flex-col items-center">
              <div className="font-mono font-extrabold text-[var(--color-ink)] text-[44px] leading-none tabular-nums">
                {mm}:{ss}
              </div>
              <div className="label-caps mt-1 opacity-60">
                {running ? 'in corso' : remaining === 0 ? 'finito' : 'pronto'}
              </div>
            </div>
          </ProgressCircle>
        </div>

        <div className="flex flex-wrap gap-1.5 justify-center mt-2 mb-3">
          {presets.map(p => (
            <button
              key={p}
              type="button"
              onClick={() => setTarget(p)}
              className={`press rounded-full px-3 py-1.5 font-mono text-[10px] tracking-wider uppercase ${
                target === p
                  ? 'bg-gradient-to-br from-[#ff7a4a] to-[#ffb37a] text-white shadow-[var(--shadow-pill)]'
                  : 'bg-white/60 text-[var(--color-ink-2)]'
              }`}
            >
              {formatLabel(p)}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowCustom(true)}
            className="press rounded-full px-3 py-1.5 font-mono text-[10px] tracking-wider uppercase bg-white/60 text-[var(--color-ink-2)]"
          >
            …
          </button>
        </div>

        <div className="flex gap-2">
          {running ? (
            <Button variant="ghost" className="flex-1" onClick={pause}>Pausa</Button>
          ) : (
            <Button className="flex-1" onClick={start}>
              {remaining === 0 ? 'Riparti' : remaining < target ? 'Riprendi' : 'Start'}
            </Button>
          )}
          <Button variant="ghost" className="flex-1" onClick={reset} disabled={!running && remaining === target}>
            Reset
          </Button>
        </div>
      </Card>

      <CustomDurationModal
        open={showCustom}
        onClose={() => setShowCustom(false)}
        currentSeconds={target}
        onSave={(s) => { setTarget(s); setShowCustom(false) }}
      />
    </>
  )
}

function formatLabel(s) {
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const r = s % 60
  return r === 0 ? `${m}m` : `${m}m${r}s`
}

function ProgressCircle({ percent, size, stroke, children }) {
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const dash = (Math.max(0, Math.min(100, percent)) / 100) * circumference
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="rgba(0,0,0,0.06)" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke="#ff7a4a" strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          style={{ transition: 'stroke-dasharray 0.25s linear' }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  )
}

function CustomDurationModal({ open, onClose, currentSeconds, onSave }) {
  const [m, setM] = useState(Math.floor(currentSeconds / 60))
  const [s, setS] = useState(currentSeconds % 60)

  useEffect(() => {
    if (open) {
      setM(Math.floor(currentSeconds / 60))
      setS(currentSeconds % 60)
    }
  }, [open, currentSeconds])

  const submit = (e) => {
    e.preventDefault()
    const total = (parseInt(m) || 0) * 60 + (parseInt(s) || 0)
    if (total < 5 || total > 7200) {
      toast('Durata fra 5s e 2h')
      return
    }
    onSave(total)
  }

  return (
    <Modal open={open} onClose={onClose} title="Durata custom">
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Minuti" type="number" inputMode="numeric" min={0} max={120} value={m} onChange={e => setM(e.target.value)} />
          <Input label="Secondi" type="number" inputMode="numeric" min={0} max={59} value={s} onChange={e => setS(e.target.value)} />
        </div>
        <div className="flex gap-2 pt-2">
          <Button variant="ghost" type="button" className="flex-1" onClick={onClose}>Annulla</Button>
          <Button type="submit" className="flex-1">Imposta</Button>
        </div>
      </form>
    </Modal>
  )
}

// Single shared AudioContext, lazily created on first beep so we don't
// upset autoplay policies.
let _audioCtx = null
function playBeep() {
  try {
    if (!_audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext
      if (!Ctx) return
      _audioCtx = new Ctx()
    }
    const ctx = _audioCtx
    const now = ctx.currentTime
    const blip = (freq, start, dur) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.0001, now + start)
      gain.gain.exponentialRampToValueAtTime(0.4, now + start + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + start + dur)
      osc.connect(gain).connect(ctx.destination)
      osc.start(now + start)
      osc.stop(now + start + dur + 0.02)
    }
    blip(880, 0, 0.18)
    blip(880, 0.22, 0.18)
    blip(1320, 0.44, 0.32)
    if (navigator.vibrate) navigator.vibrate([120, 80, 120, 80, 220])
  } catch {
    /* autoplay or context creation blocked — silent */
  }
}
