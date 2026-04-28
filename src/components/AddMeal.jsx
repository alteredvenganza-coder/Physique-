import { useState } from 'react'
import { Modal, Button, Input, Textarea, toast } from './ui'
import { useStore } from '../store/data'

export default function AddMeal({ open, onClose }) {
  const addMeal = useStore(s => s.addMeal)
  const [name, setName] = useState('')
  const [kcal, setKcal] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fat, setFat] = useState('')
  const [busy, setBusy] = useState(false)

  const reset = () => {
    setName(''); setKcal(''); setProtein(''); setCarbs(''); setFat('')
  }

  const submit = async (e) => {
    e?.preventDefault()
    if (!name.trim()) return toast('Nome richiesto')
    setBusy(true)
    try {
      await addMeal({
        name: name.trim(),
        kcal: parseInt(kcal) || 0,
        protein: parseFloat(protein) || 0,
        carbs: parseFloat(carbs) || 0,
        fat: parseFloat(fat) || 0,
        time: new Date().toTimeString().slice(0, 5),
        source: 'manual',
      })
      toast('Pasto aggiunto')
      reset()
      onClose?.()
    } catch (err) {
      toast(err.message || 'Errore')
    } finally { setBusy(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title="Pasto">
      <form onSubmit={submit} className="space-y-4">
        <Input
          label="Nome"
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Es. Pollo con riso"
        />
        <Input
          label="Calorie"
          inputMode="numeric"
          value={kcal}
          onChange={e => setKcal(e.target.value)}
          placeholder="450"
        />
        <div className="grid grid-cols-3 gap-3">
          <Input label="Prot (g)" inputMode="decimal" value={protein} onChange={e => setProtein(e.target.value)} />
          <Input label="Carb (g)" inputMode="decimal" value={carbs} onChange={e => setCarbs(e.target.value)} />
          <Input label="Grassi (g)" inputMode="decimal" value={fat} onChange={e => setFat(e.target.value)} />
        </div>
        <div className="flex gap-2 pt-2">
          <Button variant="ghost" type="button" className="flex-1" onClick={onClose}>Annulla</Button>
          <Button type="submit" className="flex-1" disabled={busy}>{busy ? '…' : 'Salva'}</Button>
        </div>
        <p className="label-caps text-center pt-1">Suggerimento: usa il Coach con foto per stimare auto.</p>
      </form>
    </Modal>
  )
}
