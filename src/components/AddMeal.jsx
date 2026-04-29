import { useState } from 'react'
import { Modal, Button, Input, toast } from './ui'
import { useStore } from '../store/data'
import PhotoMealAnalyzer from './PhotoMealAnalyzer'

export default function AddMeal({ open, onClose }) {
  const addMeal = useStore(s => s.addMeal)
  const [name, setName] = useState('')
  const [kcal, setKcal] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fat, setFat] = useState('')
  const [busy, setBusy] = useState(false)
  const [showPhoto, setShowPhoto] = useState(false)

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

  const openPhoto = () => setShowPhoto(true)
  const closePhoto = (saved) => {
    setShowPhoto(false)
    // PhotoMealAnalyzer auto-saves on confirm and we close the parent too
    // so the user lands back on Home with the new meal logged.
    if (saved === true) onClose?.()
  }

  return (
    <>
      <Modal open={open && !showPhoto} onClose={onClose} title="Pasto">
        <div className="space-y-4">
          <button
            type="button"
            onClick={openPhoto}
            className="press w-full bg-gradient-to-br from-[#ff7a4a] to-[#ffb37a] text-white rounded-2xl px-4 py-4 flex items-center gap-3 shadow-[var(--shadow-pill)]"
          >
            <span className="text-2xl">📸</span>
            <div className="flex-1 text-left">
              <div className="font-display font-extrabold text-[16px] leading-tight">Scatta foto pasto</div>
              <div className="font-mono text-[10px] tracking-wider opacity-80 uppercase mt-0.5">AI stima i macro</div>
            </div>
            <span className="opacity-80">›</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="flex-1 h-px bg-black/10" />
            <span className="label-caps">oppure manuale</span>
            <span className="flex-1 h-px bg-black/10" />
          </div>

          <form onSubmit={submit} className="space-y-3">
            <Input
              label="Nome"
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
          </form>
        </div>
      </Modal>

      <PhotoMealAnalyzer open={showPhoto} onClose={() => closePhoto(true)} />
    </>
  )
}
