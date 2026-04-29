import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, Pill } from './ui'
import { categoryEmoji } from './RoutineCard'

// Full-screen guided executor for a saved routine. Walks through each
// exercise set-by-set; handles rest countdown with audio beep; auto
// logs the workout when the session completes.
export default function WorkoutSession({ routine, open, onClose, onComplete }) {
  const exercises = useMemo(
    () => Array.isArray(routine?.exercises) ? routine.exercises : [],
    [routine]
  )

  const [exerciseIdx, setExerciseIdx] = useState(0)
  const [setIdx, setSetIdx] = useState(0) // 0-based
  // phases: ready | work | rest | done
  const [phase, setPhase] = useState('ready')
  const [restLeft, setRestLeft] = useState(0)
  const restEndRef = useRef(0)
  const sessionStartRef = useRef(0)

  const current = exercises[exerciseIdx] || null
  const totalSets = current ? Math.max(1, Number(current.sets) || 1) : 0
  const isLastSet = current ? setIdx >= totalSets - 1 : true
  const isLastExercise = exerciseIdx >= exercises.length - 1

  // Reset state whenever the modal opens with a new routine.
  useEffect(() => {
    if (open) {
      setExerciseIdx(0)
      setSetIdx(0)
      setPhase('ready')
      setRestLeft(0)
      sessionStartRef.current = Date.now()
    }
  }, [open, routine?.id])

  // Rest countdown loop. Anchored on Date.now() so background-throttled
  // intervals don't drift the timer.
  useEffect(() => {
    if (phase !== 'rest') return
    const tick = setInterval(() => {
      const left = Math.max(0, Math.round((restEndRef.current - Date.now()) / 1000))
      setRestLeft(left)
      if (left <= 0) {
        clearInterval(tick)
        playBeep()
        advanceAfterRest()
      }
    }, 250)
    return () => clearInterval(tick)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  const startExercise = () => setPhase('work')

  const finishSet = () => {
    const restSec = Math.max(0, Number(current?.rest_s) || 0)
    if (isLastSet && isLastExercise) {
      finishSession()
      return
    }
    if (restSec > 0) {
      restEndRef.current = Date.now() + restSec * 1000
      setRestLeft(restSec)
      setPhase('rest')
    } else {
      advanceAfterRest()
    }
  }

  const advanceAfterRest = () => {
    if (!isLastSet) {
      setSetIdx(s => s + 1)
      setPhase('work')
    } else if (!isLastExercise) {
      setExerciseIdx(i => i + 1)
      setSetIdx(0)
      setPhase('ready')
    } else {
      finishSession()
    }
  }

  const skipRest = () => {
    restEndRef.current = Date.now()
    advanceAfterRest()
  }

  const finishSession = () => {
    setPhase('done')
  }

  const handleComplete = () => {
    const durationMin = Math.max(1, Math.round((Date.now() - sessionStartRef.current) / 60000))
    onComplete?.({ durationMin })
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-[var(--color-cream)]/98 backdrop-blur-xl flex flex-col pt-safe pb-safe">
      <header className="px-5 pt-6 pb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="label-caps">Sessione · {routine?.title || 'Routine'}</div>
          <h1 className="font-display font-extrabold text-[24px] tracking-[-0.02em] text-[var(--color-ink)] mt-1 truncate">
            {phase === 'done' ? 'Sessione completata' : current?.name || '—'}
          </h1>
        </div>
        <button
          onClick={onClose}
          className="press w-9 h-9 rounded-full bg-black/[0.06] grid place-items-center text-[var(--color-ink-3)] shrink-0"
          aria-label="Chiudi sessione"
        >×</button>
      </header>

      {/* Progress chips */}
      {phase !== 'done' && current && (
        <div className="flex flex-wrap gap-1.5 px-5 mb-2">
          <Pill tone="sun">Esercizio {exerciseIdx + 1}/{exercises.length}</Pill>
          <Pill tone="sun">Set {setIdx + 1}/{totalSets}</Pill>
          {current.category && <Pill tone="sun">{categoryEmoji(current.category)} {current.category}</Pill>}
        </div>
      )}

      <main className="flex-1 px-5 pt-2 flex items-center justify-center">
        {phase === 'done' ? (
          <DonePanel
            routine={routine}
            durationSeconds={(Date.now() - sessionStartRef.current) / 1000}
            onSave={handleComplete}
          />
        ) : phase === 'rest' ? (
          <RestPanel left={restLeft} target={Number(current?.rest_s) || 0} onSkip={skipRest} />
        ) : (
          <WorkPanel
            exercise={current}
            setIdx={setIdx}
            totalSets={totalSets}
            phase={phase}
            onStart={startExercise}
            onFinishSet={finishSet}
          />
        )}
      </main>
    </div>
  )
}

function WorkPanel({ exercise, setIdx, totalSets, phase, onStart, onFinishSet }) {
  if (!exercise) return null
  const reps = exercise.reps != null ? String(exercise.reps) : '—'
  return (
    <div className="w-full max-w-md text-center">
      <div className="text-7xl mb-3">{categoryEmoji(exercise.category)}</div>
      <div className="font-display font-extrabold text-[32px] tracking-[-0.02em] text-[var(--color-ink)] leading-tight">
        {exercise.name}
      </div>
      <div className="mt-3 flex justify-center gap-2 flex-wrap">
        <Pill tone="sun">Set {setIdx + 1} / {totalSets}</Pill>
        <Pill tone="sun">Target: {reps}</Pill>
        {exercise.rest_s ? <Pill tone="sun">Rest {exercise.rest_s}s</Pill> : null}
      </div>
      {exercise.notes && (
        <p className="text-[13px] text-[var(--color-ink-2)] mt-4 leading-snug px-2">
          {exercise.notes}
        </p>
      )}
      <div className="mt-8">
        {phase === 'ready' ? (
          <Button className="w-full" onClick={onStart}>Inizia esercizio</Button>
        ) : (
          <Button className="w-full" onClick={onFinishSet}>
            {setIdx + 1 >= totalSets ? 'Set finale fatto' : 'Set fatta'}
          </Button>
        )}
      </div>
    </div>
  )
}

function RestPanel({ left, target, onSkip }) {
  const pct = target > 0 ? Math.max(0, Math.min(100, ((target - left) / target) * 100)) : 0
  const mm = String(Math.floor(left / 60)).padStart(2, '0')
  const ss = String(left % 60).padStart(2, '0')
  return (
    <div className="w-full max-w-md text-center">
      <div className="label-caps mb-2">Riposo</div>
      <div className="flex justify-center mb-4">
        <Ring size={220} stroke={12} percent={pct} tone="lav">
          <div className="font-mono font-extrabold text-[var(--color-ink)] text-[52px] leading-none tabular-nums">
            {mm}:{ss}
          </div>
        </Ring>
      </div>
      <Button variant="ghost" className="w-full" onClick={onSkip}>Salta riposo</Button>
    </div>
  )
}

function DonePanel({ routine, durationSeconds, onSave }) {
  const min = Math.max(1, Math.round(durationSeconds / 60))
  return (
    <div className="w-full max-w-md text-center">
      <div className="text-6xl mb-3">🎯</div>
      <div className="font-display font-extrabold text-[28px] tracking-[-0.02em] text-[var(--color-ink)] leading-tight">
        Sessione completata
      </div>
      <p className="text-[14px] text-[var(--color-ink-3)] mt-2">
        {routine?.title} · {min} min
      </p>
      <Button className="w-full mt-6" onClick={() => { onSave(); }}>
        Salva nel log
      </Button>
    </div>
  )
}

function Ring({ size, stroke, percent, tone, children }) {
  const radius = (size - stroke) / 2
  const c = 2 * Math.PI * radius
  const dash = (Math.max(0, Math.min(100, percent)) / 100) * c
  const color = tone === 'lav' ? '#d4a8d8' : '#ff7a4a'
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={radius} stroke="rgba(0,0,0,0.06)" strokeWidth={stroke} fill="none" />
        <circle
          cx={size/2} cy={size/2} r={radius}
          stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          style={{ transition: 'stroke-dasharray 0.25s linear' }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  )
}

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
    blip(660, 0, 0.18)
    blip(990, 0.22, 0.28)
    if (navigator.vibrate) navigator.vibrate([100, 60, 180])
  } catch { /* ignore */ }
}
