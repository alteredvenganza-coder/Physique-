import { useState } from 'react'
import { Modal, Button, Input, toast } from './ui'
import { useStore } from '../store/data'
import { estimateCalories, getCategory } from '../lib/met'

export default function AddWorkout({ open, onClose }) {
  const addWorkout = useStore(s => s.addWorkout)
  const currentWeight = useStore(s => s.currentWeight())
  const [name, setName] = useState('')
  const [sets, setSets] = useState('')
  const [reps, setReps] = useState('')
  const [duration, setDuration] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e?.preventDefault()
    if (!name.trim()) return toast('Nome richiesto')
    const dur = parseInt(duration) || 0
    setBusy(true)
    try {
      await addWorkout({
        name: name.trim(),
        sets: parseInt(sets) || 0,
        reps: parseInt(reps) || 0,
        duration_min: dur,
        kcal: estimateCalories(name.trim(), dur, currentWeight || 80),
        category: getCategory(name.trim()),
        source: 'manual',
      })
      toast('Allenamento aggiunto')
      setName(''); setSets(''); setReps(''); setDuration('')
      onClose?.()
    } catch (err) {
      toast(err.message || 'Errore')
    } finally { setBusy(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title="Allenamento">
      <form onSubmit={submit} className="space-y-4">
        <Input
          label="Esercizio"
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Es. Pull-up, KB Swing, Corsa…"
        />
        <div className="grid grid-cols-3 gap-3">
          <Input label="Serie" inputMode="numeric" value={sets} onChange={e => setSets(e.target.value)} />
          <Input label="Reps" inputMode="numeric" value={reps} onChange={e => setReps(e.target.value)} />
          <Input label="Min" inputMode="numeric" value={duration} onChange={e => setDuration(e.target.value)} />
        </div>
        <div className="bg-white/55 rounded-2xl p-3">
          <span className="label-caps">Stima kcal</span>
          <div className="font-display text-xl font-extrabold text-[var(--color-ink)] mt-1">
            ~{estimateCalories(name, parseInt(duration) || 0, currentWeight || 80)} kcal
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <Button variant="ghost" type="button" className="flex-1" onClick={onClose}>Annulla</Button>
          <Button type="submit" className="flex-1" disabled={busy}>{busy ? '…' : 'Salva'}</Button>
        </div>
      </form>
    </Modal>
  )
}
