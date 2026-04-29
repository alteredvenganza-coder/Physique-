import { Card, Button, Pill } from './ui'

const CATEGORY_EMOJI = {
  push: '💪',
  pull: '🤸',
  legs: '🦵',
  gambe: '🦵',
  fullbody: '🏋️',
  full_body: '🏋️',
  core: '🧘',
  cardio: '🏃',
  mobility: '🌀',
  warmup: '🔥',
}

export function categoryEmoji(cat) {
  if (!cat) return '🏋️'
  return CATEGORY_EMOJI[String(cat).toLowerCase()] || '🏋️'
}

// Compact card to display a saved routine in the Workout tab.
export default function RoutineCard({ routine, onStart, onDelete }) {
  const exercises = Array.isArray(routine?.exercises) ? routine.exercises : []
  const cat = pickPrimaryCategory(exercises)
  const totalSets = exercises.reduce((s, e) => s + (Number(e.sets) || 0), 0)

  return (
    <Card className="mx-3 mt-3">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#ff7a4a] to-[#ffb37a] grid place-items-center text-white text-xl shrink-0">
          {categoryEmoji(cat)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-display font-extrabold text-[16px] tracking-[-0.01em] text-[var(--color-ink)] truncate">
            {routine.title || 'Routine senza nome'}
          </div>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            <Pill tone="sun">{exercises.length} esercizi</Pill>
            {totalSets > 0 && <Pill tone="sun">{totalSets} sets</Pill>}
            {routine.duration_min ? <Pill tone="sun">{routine.duration_min} min</Pill> : null}
            {routine.kcal ? <Pill tone="sun">~{routine.kcal} kcal</Pill> : null}
          </div>
          {routine.notes && (
            <p className="text-[12px] text-[var(--color-ink-3)] mt-2 leading-snug">
              {routine.notes}
            </p>
          )}
        </div>
      </div>

      {exercises.length > 0 && (
        <ul className="mt-3 space-y-1 pl-1">
          {exercises.slice(0, 5).map((e, i) => (
            <li key={i} className="text-[13px] text-[var(--color-ink-2)] flex justify-between gap-2">
              <span className="truncate">
                <span className="opacity-70 mr-1">{categoryEmoji(e.category)}</span>
                {e.name}
              </span>
              <span className="font-mono text-[10px] tracking-wider opacity-70 shrink-0">
                {e.sets}×{e.reps}
              </span>
            </li>
          ))}
          {exercises.length > 5 && (
            <li className="label-caps opacity-60">+ {exercises.length - 5} altri</li>
          )}
        </ul>
      )}

      <div className="flex gap-2 mt-3">
        <Button className="flex-1" onClick={onStart}>Avvia sessione</Button>
        {onDelete && (
          <Button variant="ghost" onClick={onDelete} aria-label="Elimina routine">×</Button>
        )}
      </div>
    </Card>
  )
}

function pickPrimaryCategory(exercises) {
  const counts = {}
  for (const e of exercises) {
    const c = (e.category || '').toLowerCase()
    if (!c) continue
    counts[c] = (counts[c] || 0) + 1
  }
  let best = null, max = 0
  for (const [k, v] of Object.entries(counts)) {
    if (v > max) { best = k; max = v }
  }
  return best
}
