import { useEffect, useRef, useState } from 'react'
import { Card, Button, Modal, Input, toast } from './ui'

const STORAGE_KEY = 'physique:fasting'

function readState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed?.startedAt) return null
    return parsed
  } catch {
    return null
  }
}

function writeState(state) {
  if (state) localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  else localStorage.removeItem(STORAGE_KEY)
}

function formatDuration(ms) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = String(Math.floor(total / 3600)).padStart(2, '0')
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0')
  const s = String(total % 60).padStart(2, '0')
  return `${h}:${m}:${s}`
}

function formatClock(date) {
  return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
}

export default function FastingTimer({ profile, updateProfile }) {
  const profileHours = Number(profile?.fast_duration_hours) || 16
  const [active, setActive] = useState(() => readState())
  const [now, setNow] = useState(() => Date.now())
  const [showSettings, setShowSettings] = useState(false)
  const tickRef = useRef(null)

  // Tick every second only when a fast is running.
  useEffect(() => {
    if (!active) return
    tickRef.current = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(tickRef.current)
  }, [active])

  const start = () => {
    const state = { startedAt: Date.now(), targetHours: profileHours }
    writeState(state)
    setActive(state)
    setNow(Date.now())
    toast('Digiuno iniziato')
  }

  const stop = () => {
    writeState(null)
    setActive(null)
    toast('Digiuno terminato')
  }

  const targetHours = active?.targetHours || profileHours
  const targetMs = targetHours * 3600 * 1000
  const elapsed = active ? now - active.startedAt : 0
  const remaining = Math.max(0, targetMs - elapsed)
  const pct = active ? Math.min(100, (elapsed / targetMs) * 100) : 0
  const completed = active && elapsed >= targetMs
  const startedDate = active ? new Date(active.startedAt) : null
  const endDate = active ? new Date(active.startedAt + targetMs) : null

  return (
    <>
      <Card className="mx-3 mt-3">
        <div className="flex items-center justify-between mb-3">
          <span className="label-caps">
            {active ? (completed ? 'Digiuno completato' : 'Digiuno in corso') : 'Finestra aperta'}
          </span>
          <button
            onClick={() => setShowSettings(true)}
            className="label-caps underline opacity-70"
            aria-label="Impostazioni digiuno"
          >
            {targetHours}h
          </button>
        </div>

        <div className="flex justify-center py-2">
          <ProgressCircle
            percent={pct}
            size={196}
            stroke={10}
            tone={completed ? 'good' : 'sun'}
          >
            <div className="flex flex-col items-center">
              <div className="label-caps opacity-60">
                {active ? 'trascorso' : 'pronto'}
              </div>
              <div className="font-mono font-extrabold text-[var(--color-ink)] text-[28px] leading-none mt-1 tabular-nums">
                {active ? formatDuration(elapsed) : `${targetHours}:00:00`}
              </div>
              {active && !completed && (
                <div className="label-caps mt-2">
                  -{formatDuration(remaining)}
                </div>
              )}
              {completed && (
                <div className="label-caps mt-2 text-emerald-700">obiettivo raggiunto</div>
              )}
            </div>
          </ProgressCircle>
        </div>

        {active && startedDate && endDate && (
          <div className="grid grid-cols-2 gap-2 mt-3 mb-3">
            <TimeCell label="Iniziato" value={formatClock(startedDate)} />
            <TimeCell label="Fine prevista" value={formatClock(endDate)} />
          </div>
        )}

        <div className="mt-2">
          {active ? (
            <Button variant="ghost" className="w-full" onClick={stop}>
              Stop digiuno
            </Button>
          ) : (
            <Button className="w-full" onClick={start}>
              Inizia digiuno
            </Button>
          )}
        </div>
      </Card>

      <FastingSettingsModal
        open={showSettings}
        onClose={() => setShowSettings(false)}
        currentHours={profileHours}
        updateProfile={updateProfile}
      />
    </>
  )
}

function ProgressCircle({ percent, size, stroke, tone = 'sun', children }) {
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const dash = (Math.max(0, Math.min(100, percent)) / 100) * circumference
  const color = tone === 'good' ? '#10b981' : '#ff7a4a'

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke="rgba(0,0,0,0.06)" strokeWidth={stroke} fill="none"
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={color} strokeWidth={stroke} fill="none"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        {children}
      </div>
    </div>
  )
}

function TimeCell({ label, value }) {
  return (
    <div className="bg-white/55 rounded-xl px-3 py-2 text-center">
      <div className="label-caps">{label}</div>
      <div className="font-mono font-bold text-[14px] text-[var(--color-ink)] mt-0.5 tabular-nums">
        {value}
      </div>
    </div>
  )
}

function FastingSettingsModal({ open, onClose, currentHours, updateProfile }) {
  const [hours, setHours] = useState(currentHours)
  const [busy, setBusy] = useState(false)

  useEffect(() => { setHours(currentHours) }, [currentHours, open])

  const submit = async (e) => {
    e.preventDefault()
    const n = parseInt(hours)
    if (!Number.isFinite(n) || n < 12 || n > 20) {
      toast('Durata fra 12 e 20 ore')
      return
    }
    setBusy(true)
    try {
      await updateProfile({ fast_duration_hours: n })
      toast('Durata digiuno salvata')
      onClose()
    } catch (err) {
      toast(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Durata digiuno">
      <form onSubmit={submit} className="space-y-3">
        <Input
          label="Ore di digiuno (12 - 20)"
          inputMode="numeric"
          type="number"
          min={12}
          max={20}
          value={hours}
          onChange={(e) => setHours(e.target.value)}
        />
        <p className="label-caps opacity-70">
          Default 16h (16:8). Modifica solo se segui un protocollo diverso.
        </p>
        <div className="flex gap-2 pt-2">
          <Button variant="ghost" type="button" className="flex-1" onClick={onClose}>Annulla</Button>
          <Button type="submit" className="flex-1" disabled={busy}>{busy ? '…' : 'Salva'}</Button>
        </div>
      </form>
    </Modal>
  )
}
