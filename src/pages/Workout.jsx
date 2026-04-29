import { useState } from 'react'
import { useStore } from '../store/data'
import CountdownTimer from '../components/CountdownTimer'
import RoutineCard from '../components/RoutineCard'
import WorkoutSession from '../components/WorkoutSession'
import { Card, toast } from '../components/ui'

export default function Workout() {
  const routines = useStore(s => s.routines)
  const deleteRoutine = useStore(s => s.deleteRoutine)
  const addWorkout = useStore(s => s.addWorkout)

  const [activeRoutine, setActiveRoutine] = useState(null)

  const start = (routine) => setActiveRoutine(routine)

  const handleSessionComplete = async ({ durationMin }) => {
    if (!activeRoutine) return
    try {
      const cat = pickCategory(activeRoutine.exercises)
      await addWorkout({
        name: activeRoutine.title,
        category: cat || 'fullbody',
        duration_min: durationMin,
        intensity: 'moderate',
        kcal: activeRoutine.kcal || 0,
        notes: 'completata via sessione',
      })
      toast('Sessione salvata nel log')
    } catch (err) {
      toast(err.message || 'Errore salvataggio')
    } finally {
      setActiveRoutine(null)
    }
  }

  const remove = async (r) => {
    if (!window.confirm(`Elimino "${r.title}"?`)) return
    try { await deleteRoutine(r.id); toast('Routine eliminata') }
    catch (err) { toast(err.message) }
  }

  const sortedRoutines = [...(routines || [])].sort(
    (a, b) => (b.created_at || '').localeCompare(a.created_at || '')
  )

  return (
    <>
      <header className="px-5 pt-10 pb-3">
        <div className="label-caps">Workout · timer e sessioni</div>
        <h1 className="font-display font-extrabold text-[34px] tracking-[-0.03em] text-[var(--color-ink)] mt-1">
          Allenamento
        </h1>
      </header>

      <CountdownTimer
        title="Saltare la corda"
        subtitle="round singolo"
        presets={[60, 180, 300, 600]}
        defaultSeconds={180}
        storageKey="physique:timer:jumprope"
      />

      <div className="mt-6 px-5 mb-1">
        <div className="label-caps">Le tue routine</div>
      </div>
      {sortedRoutines.length === 0 ? (
        <Card className="mx-3 mt-3 mb-6 text-center py-6">
          <div className="text-3xl opacity-50">📒</div>
          <div className="label-caps mt-2">Nessuna routine ancora</div>
          <p className="text-[12px] text-[var(--color-ink-3)] mt-1 px-4">
            Vai sul Coach e dì "fammi una routine push da casa, fase 1" — la salva qui e la avvii con un tap.
          </p>
        </Card>
      ) : (
        sortedRoutines.map(r => (
          <RoutineCard
            key={r.id}
            routine={r}
            onStart={() => start(r)}
            onDelete={() => remove(r)}
          />
        ))
      )}

      <div className="h-6" />

      <WorkoutSession
        routine={activeRoutine}
        open={!!activeRoutine}
        onClose={() => setActiveRoutine(null)}
        onComplete={handleSessionComplete}
      />
    </>
  )
}

function pickCategory(exercises) {
  if (!Array.isArray(exercises)) return null
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
