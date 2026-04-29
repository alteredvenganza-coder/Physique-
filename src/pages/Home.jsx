import { useState } from 'react'
import { useStore } from '../store/data'
import { Card, Stat, Pill, Bar, Button } from '../components/ui'
import AddWeight from '../components/AddWeight'
import AddMeal from '../components/AddMeal'
import AddWorkout from '../components/AddWorkout'
import FastingTimer from '../components/FastingTimer'

export default function Home() {
  const profile = useStore(s => s.profile)
  const weights = useStore(s => s.weights)
  const meals = useStore(s => s.meals)
  const workouts = useStore(s => s.workouts)
  const updateProfile = useStore(s => s.updateProfile)
  const currentWeight = useStore(s => s.currentWeight())
  const weekWorkouts = useStore(s => s.weekWorkouts())

  const todayDate = new Date().toISOString().split('T')[0]
  const todayMeals = meals.filter(m => m.date === todayDate)
  const todayWorkouts = workouts.filter(w => w.date === todayDate)

  const [showWeight, setShowWeight] = useState(false)
  const [showMeal, setShowMeal] = useState(false)
  const [showWorkout, setShowWorkout] = useState(false)

  const startWeight = profile?.start_weight ?? currentWeight
  const targetIntermediate = profile?.target_intermediate ?? null
  const targetFinal = profile?.target_final ?? profile?.target_weight ?? null
  const lost = Math.max(0, startWeight - currentWeight)

  const todayKcal = todayMeals.reduce((s, m) => s + (m.kcal || 0), 0)
  const todayProt = todayMeals.reduce((s, m) => s + (m.protein || 0), 0)
  const todayCarb = todayMeals.reduce((s, m) => s + (m.carbs || 0), 0)
  const todayFat  = todayMeals.reduce((s, m) => s + (m.fat || 0), 0)
  const calorieTarget = profile?.calorie_target || 2200
  const proteinTarget = profile?.protein_target || 180
  const carbTarget = profile?.carb_target || 100
  const fatTarget = profile?.fat_target || 80

  const today = new Date()
  const dateStr = today.toLocaleDateString('it-IT', { weekday: 'long' })
  const dateNum = today.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })

  return (
    <>
      {/* Hero */}
      <header className="px-5 pt-10 pb-3">
        <div className="label-caps">Today · {dateStr}</div>
        <div className="label-caps mt-1 opacity-60">{dateNum}</div>
        <h1 className="font-display font-extrabold text-[64px] tracking-[-0.04em] text-[var(--color-ink)] leading-[0.95] mt-3">
          {currentWeight}<span className="text-[20px] font-medium opacity-50 ml-2">kg</span>
        </h1>
        <Pill className="mt-3" tone={lost > 0 ? 'sun' : 'good'}>
          {lost > 0 ? '↓' : '→'} {lost.toFixed(1)} kg dal peso nemico
        </Pill>
      </header>

      {/* Fasting timer (16:8) */}
      <FastingTimer profile={profile} updateProfile={updateProfile} />

      {/* Dual target progress card */}
      <Card className="mx-3 mt-3">
        <div className="flex items-center justify-between mb-3">
          <span className="label-caps">Goal Progress</span>
          <span className="label-caps">peso nemico {startWeight} kg</span>
        </div>
        <div className="space-y-3">
          <TargetProgress
            label="Target intermedio"
            target={targetIntermediate}
            targetDate={profile?.target_intermediate_date}
            startWeight={startWeight}
            currentWeight={currentWeight}
            tone="sun"
          />
          <TargetProgress
            label="Target finale"
            target={targetFinal}
            targetDate={profile?.target_final_date}
            startWeight={startWeight}
            currentWeight={currentWeight}
            tone="lav"
          />
        </div>
      </Card>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 mx-3 mt-3">
        <Card className="p-0 overflow-hidden">
          <Stat label="Kcal oggi" value={todayKcal.toLocaleString('it-IT')} progress={(todayKcal / calorieTarget) * 100} />
        </Card>
        <Card className="p-0 overflow-hidden">
          <Stat label="Proteine" value={`${Math.round(todayProt)}`} suffix="g" progress={(todayProt / proteinTarget) * 100} />
        </Card>
        <Card className="p-0 overflow-hidden">
          <Stat label="Allenam. 7d" value={weekWorkouts} progress={Math.min(100, weekWorkouts * 16.6)} />
        </Card>
        <Card className="p-0 overflow-hidden">
          <Stat label="Pesate tot" value={weights.length} progress={Math.min(100, weights.length * 2)} />
        </Card>
      </div>

      {/* Macros breakdown */}
      <Card className="mx-3 mt-3">
        <div className="label-caps mb-3">Macros oggi</div>
        <div className="space-y-3">
          <MacroLine label="Carb" cur={Math.round(todayCarb)} max={carbTarget} unit="g" tone="lav" />
          <MacroLine label="Grassi" cur={Math.round(todayFat)} max={fatTarget} unit="g" tone="sun" />
        </div>
      </Card>

      {/* Quick add */}
      <div className="mx-3 mt-4 mb-2">
        <div className="label-caps mb-2">Aggiungi rapido</div>
        <div className="flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={() => setShowWeight(true)}>Peso</Button>
          <Button variant="ghost" className="flex-1" onClick={() => setShowMeal(true)}>Pasto</Button>
          <Button variant="ghost" className="flex-1" onClick={() => setShowWorkout(true)}>Allenam.</Button>
        </div>
      </div>

      {/* Today timeline */}
      {(todayMeals.length || todayWorkouts.length) ? (
        <Card className="mx-3 mt-3 mb-6">
          <div className="label-caps mb-2">Cronologia oggi</div>
          <div className="space-y-2">
            {[...todayMeals.map(m => ({ ...m, _t: 'meal' })), ...todayWorkouts.map(w => ({ ...w, _t: 'work' }))]
              .sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''))
              .map(item => (
                <div key={item.id} className="flex items-center gap-3 py-1">
                  <span className="font-mono text-[10px] tracking-wider opacity-50 w-12 shrink-0">
                    {item.time || (item.created_at && new Date(item.created_at).toTimeString().slice(0, 5))}
                  </span>
                  <span className={`shrink-0 w-1.5 h-1.5 rounded-full ${item._t === 'meal' ? 'bg-[#ff7a4a]' : 'bg-[#d4a8d8]'}`}></span>
                  <span className="text-[13px] flex-1 truncate text-[var(--color-ink)]">{item.name}</span>
                  <span className="font-mono text-[10px] tracking-wider opacity-60">
                    {item._t === 'meal' ? `${item.kcal} kcal` : `${item.duration_min || 0}m`}
                  </span>
                </div>
              ))}
          </div>
        </Card>
      ) : (
        <Card className="mx-3 mt-3 mb-6 text-center py-6">
          <div className="text-3xl opacity-50">🌅</div>
          <div className="label-caps mt-2">Nessun log oggi</div>
        </Card>
      )}

      <AddWeight open={showWeight} onClose={() => setShowWeight(false)} />
      <AddMeal open={showMeal} onClose={() => setShowMeal(false)} />
      <AddWorkout open={showWorkout} onClose={() => setShowWorkout(false)} />
    </>
  )
}

function TargetProgress({ label, target, targetDate, startWeight, currentWeight, tone }) {
  if (target == null || startWeight == null || currentWeight == null) {
    return (
      <div>
        <div className="flex justify-between mb-1.5">
          <span className="label-caps">{label}</span>
          <span className="font-mono text-[10px] tracking-wider opacity-60">—</span>
        </div>
        <Bar value={0} max={1} tone={tone} />
      </div>
    )
  }
  const totalToLose = Math.max(0, startWeight - target)
  const lost = Math.max(0, startWeight - currentWeight)
  const pct = totalToLose > 0 ? Math.min(100, (lost / totalToLose) * 100) : (currentWeight <= target ? 100 : 0)
  const remaining = Math.max(0, currentWeight - target)
  const dateStr = targetDate
    ? new Date(targetDate).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
    : null
  return (
    <div>
      <div className="flex justify-between items-baseline mb-1.5">
        <span className="label-caps">{label}</span>
        <span className="font-mono text-[10px] tracking-wider text-[var(--color-ink-2)]">
          {Math.round(pct)}% · -{remaining.toFixed(1)} kg
        </span>
      </div>
      <Bar value={pct} max={100} tone={tone} />
      <div className="flex justify-between mt-1">
        <span className="label-caps opacity-70">target {target} kg</span>
        {dateStr && <span className="label-caps opacity-70">entro {dateStr}</span>}
      </div>
    </div>
  )
}

function MacroLine({ label, cur, max, unit, tone }) {
  const pct = max > 0 ? (cur / max) * 100 : 0
  return (
    <div>
      <div className="flex justify-between mb-1.5">
        <span className="label-caps">{label}</span>
        <span className="font-mono text-[10px] tracking-wider text-[var(--color-ink-2)]">{cur}{unit} / {max}{unit}</span>
      </div>
      <Bar value={cur} max={max} tone={tone} />
    </div>
  )
}
