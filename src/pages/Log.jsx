import { useState } from 'react'
import { useStore } from '../store/data'
import { Card, Pill, toast } from '../components/ui'
import AddWeight from '../components/AddWeight'
import AddMeal from '../components/AddMeal'
import AddWorkout from '../components/AddWorkout'

export default function Log() {
  const meals = useStore(s => s.meals)
  const workouts = useStore(s => s.workouts)
  const weights = useStore(s => s.weights)
  const deleteMeal = useStore(s => s.deleteMeal)
  const deleteWorkout = useStore(s => s.deleteWorkout)
  const deleteWeight = useStore(s => s.deleteWeight)

  const [open, setOpen] = useState(null) // 'weight' | 'meal' | 'workout'

  // Group by date
  const byDate = groupAll(meals, workouts, weights)
  const dates = Object.keys(byDate).sort((a, b) => b.localeCompare(a))

  const remove = async (it) => {
    try {
      if (it._t === 'meal') await deleteMeal(it.id)
      else if (it._t === 'work') await deleteWorkout(it.id)
      else if (it._t === 'weight') await deleteWeight(it.id)
      toast('Rimosso')
    } catch (e) { toast(e.message || 'Errore') }
  }

  return (
    <>
      <header className="px-5 pt-10 pb-3">
        <div className="label-caps">Aggiungi · 26/04/26</div>
        <h1 className="font-display font-extrabold text-[34px] tracking-[-0.03em] text-[var(--color-ink)] mt-1">
          Cosa registri?
        </h1>
      </header>

      {/* 4 quick add cards */}
      <div className="grid grid-cols-2 gap-2 px-3 pb-4">
        <AddTile icon="⚖" label="Pesata" title="Peso" onClick={() => setOpen('weight')} />
        <AddTile icon="🍽" label="Cibo" title="Pasto" onClick={() => setOpen('meal')} />
        <AddTile icon="💪" label="Forza · Cardio" title="Allenam." onClick={() => setOpen('workout')} />
        <AddTile icon="📋" label="Template" title="Routine" onClick={() => toast('Routines arrivano in v2')} disabled />
      </div>

      {/* Timeline */}
      <div className="px-3 pb-6">
        {dates.length === 0 && (
          <Card className="text-center py-6">
            <div className="text-3xl opacity-50">📭</div>
            <div className="label-caps mt-2">Nessuna voce ancora</div>
          </Card>
        )}
        {dates.map(d => (
          <Card key={d} className="mb-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-display font-extrabold text-[15px] text-[var(--color-ink)]">
                {humanDate(d)}
              </h3>
              <span className="label-caps">{d}</span>
            </div>
            <div className="space-y-2 -mx-1">
              {byDate[d].map(it => (
                <div key={it.id} className="flex items-start gap-2 px-1 py-1.5 border-b border-black/[0.05] last:border-0">
                  <span className="font-mono text-[10px] tracking-wider opacity-50 w-12 shrink-0 pt-1">
                    {it.time || (it.created_at && new Date(it.created_at).toTimeString().slice(0,5)) || '--'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-[var(--color-ink)] truncate">{it.name || (it._t === 'weight' ? `Pesata · ${it.value} kg` : '—')}</div>
                    <div className="font-mono text-[10px] tracking-wide opacity-60 mt-0.5">
                      {it._t === 'meal'   && `${it.kcal} kcal · ${it.protein}g P`}
                      {it._t === 'work'   && `${it.duration_min || 0} min · ${it.kcal || 0} kcal · ${it.category || ''}`}
                      {it._t === 'weight' && (it.note || '')}
                    </div>
                  </div>
                  <Pill tone={it._t === 'meal' ? 'sun' : it._t === 'work' ? 'bad' : 'good'}>
                    {it._t === 'meal' ? 'Pasto' : it._t === 'work' ? 'Train' : 'Peso'}
                  </Pill>
                  <button
                    onClick={() => remove(it)}
                    className="press w-7 h-7 grid place-items-center rounded-full text-[var(--color-ink-3)] hover:bg-black/[0.06]"
                    aria-label="Rimuovi"
                  >×</button>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      <AddWeight open={open === 'weight'} onClose={() => setOpen(null)} />
      <AddMeal open={open === 'meal'} onClose={() => setOpen(null)} />
      <AddWorkout open={open === 'workout'} onClose={() => setOpen(null)} />
    </>
  )
}

function AddTile({ icon, label, title, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="press bg-white/65 backdrop-blur rounded-2xl p-4 text-left disabled:opacity-50"
    >
      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#ff7a4a] to-[#ffb37a] grid place-items-center text-white text-base">
        {icon}
      </div>
      <div className="label-caps mt-2">{label}</div>
      <div className="font-display font-extrabold text-[16px] tracking-[-0.02em] text-[var(--color-ink)]">{title}</div>
    </button>
  )
}

function groupAll(meals, workouts, weights) {
  const out = {}
  for (const m of meals)    push(out, m.date, { ...m, _t: 'meal' })
  for (const w of workouts) push(out, w.date, { ...w, _t: 'work' })
  for (const w of weights)  push(out, w.date, { ...w, _t: 'weight' })
  for (const d of Object.keys(out)) {
    out[d].sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''))
  }
  return out
}
function push(o, k, v) { (o[k] = o[k] || []).push(v) }

function humanDate(s) {
  const d = new Date(s + 'T00:00:00')
  const today = new Date(); today.setHours(0,0,0,0)
  const diff = Math.round((today - d) / 86400000)
  if (diff === 0) return 'Oggi'
  if (diff === 1) return 'Ieri'
  if (diff < 7) return d.toLocaleDateString('it-IT', { weekday: 'long' })
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'long' })
}
