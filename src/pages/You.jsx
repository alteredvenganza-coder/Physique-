import { useState } from 'react'
import { useStore } from '../store/data'
import { Card, Button, Input, Modal, toast } from '../components/ui'
import TrendChart from '../components/TrendChart'
import { signOut } from '../lib/supabase'

export default function You() {
  const profile = useStore(s => s.profile)
  const weights = useStore(s => s.weights)
  const meals = useStore(s => s.meals)
  const workouts = useStore(s => s.workouts)
  const updateProfile = useStore(s => s.updateProfile)
  const teardown = useStore(s => s.teardown)
  const currentWeight = useStore(s => s.currentWeight())

  const [editTargets, setEditTargets] = useState(false)
  const [editProfile, setEditProfile] = useState(false)

  const since = profile?.start_date
    ? Math.floor((Date.now() - new Date(profile.start_date).getTime()) / 86400000)
    : 0

  const trend = weights.slice(-30).map(w => ({ date: w.date, value: parseFloat(w.value) }))

  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ profile, weights, meals, workouts }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `physique-${new Date().toISOString().slice(0,10)}.json`
    document.body.appendChild(a); a.click(); a.remove()
    URL.revokeObjectURL(url)
    toast('Export scaricato')
  }

  const doSignOut = async () => {
    teardown()
    await signOut()
  }

  return (
    <>
      <header className="px-5 pt-10 pb-3">
        <div className="label-caps">Profilo · {since} giorni</div>
        <h1 className="font-display font-extrabold text-[34px] tracking-[-0.03em] text-[var(--color-ink)] mt-1">Tu</h1>
      </header>

      {/* Avatar row */}
      <div className="flex items-center gap-3 px-5 pb-4">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#ff7a4a] via-[#ffb37a] to-[#d4a8d8] grid place-items-center text-white font-display font-extrabold text-xl">
          {(profile?.name || 'N').slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="font-display font-extrabold text-[20px] tracking-[-0.02em] text-[var(--color-ink)]">
            {profile?.name || 'Tu'}
          </div>
          <div className="label-caps mt-1">
            Inizio · {profile?.start_date || '—'} · {profile?.start_weight} kg
          </div>
        </div>
      </div>

      {/* Trend chart */}
      <Card className="mx-3 mt-1">
        <div className="flex justify-between items-baseline mb-2">
          <span className="label-caps">Trend peso · 30 giorni</span>
          <span className="font-display font-extrabold text-[var(--color-bad)]">
            {currentWeight} kg ↓
          </span>
        </div>
        <TrendChart data={trend} height={110} />
      </Card>

      {/* Targets */}
      <Card className="mx-3 mt-3">
        <div className="flex justify-between items-center mb-3">
          <span className="label-caps">Target</span>
          <button onClick={() => setEditTargets(true)} className="label-caps underline">Modifica</button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <TargetCell
            label="Target intermedio"
            value={profile?.target_intermediate ? `${profile.target_intermediate} kg` : '—'}
            sub={formatTargetDate(profile?.target_intermediate_date)}
          />
          <TargetCell
            label="Target finale"
            value={profile?.target_final ? `${profile.target_final} kg` : '—'}
            sub={formatTargetDate(profile?.target_final_date)}
          />
          <TargetCell label="Calorie / day" value={(profile?.calorie_target ?? '—').toLocaleString('it-IT')} />
          <TargetCell label="Proteine / day" value={`${profile?.protein_target ?? '—'} g`} />
          <TargetCell label="Digiuno IF" value={`${profile?.fast_duration_hours ?? 16}h`} sub="16:8 protocol" />
        </div>
      </Card>

      {/* Settings */}
      <Card className="mx-3 mt-3 mb-6">
        <ul className="divide-y divide-black/[0.05]">
          <SettingRow label="Profilo" value={profile?.name || 'Imposta nome'} onClick={() => setEditProfile(true)} />
          <SettingRow label="Esporta dati" value="JSON ›" onClick={exportJson} />
          <SettingRow label="Logout" value="›" onClick={doSignOut} tone="bad" />
        </ul>
      </Card>

      <EditTargetsModal open={editTargets} onClose={() => setEditTargets(false)} profile={profile} updateProfile={updateProfile} />
      <EditProfileModal open={editProfile} onClose={() => setEditProfile(false)} profile={profile} updateProfile={updateProfile} />
    </>
  )
}

function TargetCell({ label, value, sub }) {
  return (
    <div className="bg-white/55 rounded-xl px-3 py-2.5">
      <div className="label-caps">{label}</div>
      <div className="font-display font-extrabold text-[16px] tracking-[-0.02em] text-[var(--color-ink)] mt-0.5">{value}</div>
      {sub && <div className="label-caps opacity-60 mt-0.5">{sub}</div>}
    </div>
  )
}

function formatTargetDate(d) {
  if (!d) return null
  return new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
}

function SettingRow({ label, value, onClick, tone }) {
  return (
    <li>
      <button onClick={onClick} className="w-full flex justify-between items-center py-3 text-left press">
        <span className={`text-[14px] font-semibold ${tone === 'bad' ? 'text-[var(--color-bad)]' : 'text-[var(--color-ink)]'}`}>{label}</span>
        <span className="font-mono text-[11px] tracking-wide opacity-60">{value}</span>
      </button>
    </li>
  )
}

function EditTargetsModal({ open, onClose, profile, updateProfile }) {
  const [tInter, setTInter] = useState(profile?.target_intermediate ?? '')
  const [tInterDate, setTInterDate] = useState(profile?.target_intermediate_date ?? '')
  const [tFinal, setTFinal] = useState(profile?.target_final ?? profile?.target_weight ?? '')
  const [tFinalDate, setTFinalDate] = useState(profile?.target_final_date ?? '')
  const [kcal, setKcal] = useState(profile?.calorie_target ?? '')
  const [prot, setProt] = useState(profile?.protein_target ?? '')
  const [fastHours, setFastHours] = useState(profile?.fast_duration_hours ?? 16)
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      const finalNum = parseFloat(tFinal) || null
      await updateProfile({
        target_intermediate: parseFloat(tInter) || null,
        target_intermediate_date: tInterDate || null,
        target_final: finalNum,
        target_final_date: tFinalDate || null,
        target_weight: finalNum, // back-compat
        calorie_target: parseInt(kcal) || null,
        protein_target: parseInt(prot) || null,
        fast_duration_hours: parseInt(fastHours) || 16,
      })
      toast('Target aggiornati')
      onClose()
    } catch (err) { toast(err.message) }
    finally { setBusy(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title="Target">
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Target intermedio (kg)" inputMode="decimal" value={tInter} onChange={e => setTInter(e.target.value)} />
          <Input label="Entro" type="date" value={tInterDate} onChange={e => setTInterDate(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Target finale (kg)" inputMode="decimal" value={tFinal} onChange={e => setTFinal(e.target.value)} />
          <Input label="Entro" type="date" value={tFinalDate} onChange={e => setTFinalDate(e.target.value)} />
        </div>
        <Input label="Calorie giornaliere" inputMode="numeric" value={kcal} onChange={e => setKcal(e.target.value)} />
        <Input label="Proteine giornaliere (g)" inputMode="numeric" value={prot} onChange={e => setProt(e.target.value)} />
        <Input
          label="Durata digiuno (h, 12-20)"
          inputMode="numeric" type="number" min={12} max={20}
          value={fastHours} onChange={e => setFastHours(e.target.value)}
        />
        <div className="flex gap-2 pt-2">
          <Button variant="ghost" type="button" className="flex-1" onClick={onClose}>Annulla</Button>
          <Button type="submit" className="flex-1" disabled={busy}>{busy ? '…' : 'Salva'}</Button>
        </div>
      </form>
    </Modal>
  )
}

function EditProfileModal({ open, onClose, profile, updateProfile }) {
  const [name, setName] = useState(profile?.name ?? '')
  const [height, setHeight] = useState(profile?.height_cm ?? '')
  const [age, setAge] = useState(profile?.age ?? '')
  const [start, setStart] = useState(profile?.start_weight ?? '')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      await updateProfile({
        name: name.trim() || null,
        height_cm: parseInt(height) || null,
        age: parseInt(age) || null,
        start_weight: parseFloat(start) || null,
      })
      toast('Profilo salvato')
      onClose()
    } catch (err) { toast(err.message) }
    finally { setBusy(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title="Profilo">
      <form onSubmit={submit} className="space-y-3">
        <Input label="Nome" value={name} onChange={e => setName(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Altezza (cm)" inputMode="numeric" value={height} onChange={e => setHeight(e.target.value)} />
          <Input label="Età" inputMode="numeric" value={age} onChange={e => setAge(e.target.value)} />
        </div>
        <Input label="Peso di partenza (kg)" inputMode="decimal" value={start} onChange={e => setStart(e.target.value)} />
        <div className="flex gap-2 pt-2">
          <Button variant="ghost" type="button" className="flex-1" onClick={onClose}>Annulla</Button>
          <Button type="submit" className="flex-1" disabled={busy}>{busy ? '…' : 'Salva'}</Button>
        </div>
      </form>
    </Modal>
  )
}
