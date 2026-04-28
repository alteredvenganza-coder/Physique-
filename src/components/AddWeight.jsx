import { useState } from 'react'
import { Modal, Button, Input, toast } from './ui'
import { useStore } from '../store/data'

export default function AddWeight({ open, onClose }) {
  const addWeight = useStore(s => s.addWeight)
  const current = useStore(s => s.currentWeight())
  const [value, setValue] = useState(current ? String(current) : '')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e?.preventDefault()
    const v = parseFloat(value.replace(',', '.'))
    if (!v || v < 30 || v > 300) return toast('Peso non valido')
    setBusy(true)
    try {
      await addWeight({ value: v, note: note.trim() || null })
      toast('Peso registrato')
      onClose?.()
    } catch (err) {
      toast(err.message || 'Errore')
    } finally { setBusy(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title="Pesata">
      <form onSubmit={submit} className="space-y-4">
        <Input
          label="Peso (kg)"
          inputMode="decimal"
          autoFocus
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder="96.4"
        />
        <Input
          label="Nota (opzionale)"
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Mattina, dopo bagno"
        />
        <div className="flex gap-2 pt-2">
          <Button variant="ghost" type="button" className="flex-1" onClick={onClose}>Annulla</Button>
          <Button type="submit" className="flex-1" disabled={busy}>{busy ? '…' : 'Salva'}</Button>
        </div>
      </form>
    </Modal>
  )
}
