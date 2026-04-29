import { useEffect, useRef, useState } from 'react'
import { Modal, Button, Pill, toast } from './ui'
import { compressImage } from '../lib/imageUtils'
import { analyzeMealPhoto } from '../lib/ai'
import { buildAnalyzeMealPhotoPrompt } from '../lib/prompts'
import { useStore } from '../store/data'

// MVP photo-meal analyzer. Three-state machine: capture -> analyzing -> result.
// On confirm, saves a single combined meal entry to today's log.
export default function PhotoMealAnalyzer({ open, onClose }) {
  const profile = useStore(s => s.profile)
  const weights = useStore(s => s.weights)
  const addMeal = useStore(s => s.addMeal)
  const fileRef = useRef(null)

  const [phase, setPhase] = useState('capture') // capture | analyzing | result | error
  const [previewUrl, setPreviewUrl] = useState(null)
  const [imageBase64, setImageBase64] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [busy, setBusy] = useState(false)

  // Reset everything whenever the modal closes.
  useEffect(() => {
    if (!open) {
      setPhase('capture')
      setPreviewUrl(null)
      setImageBase64(null)
      setAnalysis(null)
      setErrorMsg('')
      setBusy(false)
    }
  }, [open])

  const pickPhoto = () => fileRef.current?.click()

  const onPhotoChosen = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setPhase('analyzing')
    setErrorMsg('')
    try {
      const { base64, dataUrl } = await compressImage(file, 1568, 0.85)
      setPreviewUrl(dataUrl)
      setImageBase64(base64)
      const currentWeight = weights?.length ? weights[weights.length - 1].value : profile?.start_weight
      const prompt = buildAnalyzeMealPhotoPrompt({
        currentWeight,
        calorieTarget: profile?.calorie_target || 2200,
        proteinTarget: profile?.protein_target || 190,
      })
      const result = await analyzeMealPhoto({ image_base64: base64, prompt })
      setAnalysis(result)
      setPhase('result')
    } catch (err) {
      setErrorMsg(err?.name === 'AbortError'
        ? 'Analisi troppo lunga, riprova.'
        : (err.message || 'Errore analisi foto'))
      setPhase('error')
    }
  }

  const retry = () => {
    setErrorMsg('')
    setPhase('capture')
  }

  const confirm = async () => {
    if (!analysis) return
    setBusy(true)
    try {
      const totals = analysis.totali || {}
      const ingredientNames = (analysis.ingredienti || [])
        .map(i => i.nome).filter(Boolean).slice(0, 4).join(' + ')
      const name = ingredientNames || 'Pasto da foto'
      await addMeal({
        name,
        kcal: Math.round(totals.kcal || 0),
        protein: Math.round(totals.proteine || 0),
        carbs: Math.round(totals.carbo || 0),
        fat: Math.round(totals.grassi || 0),
        time: new Date().toTimeString().slice(0, 5),
        source: 'photo_analysis',
      })
      toast(`Pasto registrato: ${Math.round(totals.proteine || 0)}g P, ${Math.round(totals.kcal || 0)} kcal`)
      onClose?.()
    } catch (err) {
      toast(err.message || 'Errore salvataggio')
    } finally { setBusy(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title="Analisi pasto da foto">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onPhotoChosen}
      />

      {phase === 'capture' && (
        <CapturePanel onPick={pickPhoto} />
      )}

      {phase === 'analyzing' && (
        <AnalyzingPanel previewUrl={previewUrl} />
      )}

      {phase === 'error' && (
        <ErrorPanel message={errorMsg} onRetry={retry} onClose={onClose} />
      )}

      {phase === 'result' && analysis && (
        <ResultPanel
          analysis={analysis}
          previewUrl={previewUrl}
          onConfirm={confirm}
          onClose={onClose}
          busy={busy}
        />
      )}
    </Modal>
  )
}

function CapturePanel({ onPick }) {
  return (
    <div className="space-y-3 text-center">
      <div className="text-5xl">📸</div>
      <p className="text-[14px] text-[var(--color-ink-3)] leading-snug">
        Inquadra il piatto dall'alto. L'AI riconosce gli ingredienti e stima i macro.
      </p>
      <Button className="w-full" onClick={onPick}>Scatta o scegli foto</Button>
      <p className="label-caps opacity-60">Stima approssimativa, verifica le quantità prima di salvare.</p>
    </div>
  )
}

function AnalyzingPanel({ previewUrl }) {
  return (
    <div className="space-y-4 text-center">
      {previewUrl && (
        <div className="rounded-2xl overflow-hidden bg-black/5 max-h-64 grid place-items-center">
          <img src={previewUrl} alt="anteprima" className="w-full h-full object-contain max-h-64" />
        </div>
      )}
      <div className="flex items-center justify-center gap-2 py-2">
        <span className="w-2 h-2 rounded-full bg-[var(--color-sun-1)] animate-bounce" />
        <span className="w-2 h-2 rounded-full bg-[var(--color-sun-1)] animate-bounce [animation-delay:120ms]" />
        <span className="w-2 h-2 rounded-full bg-[var(--color-sun-1)] animate-bounce [animation-delay:240ms]" />
      </div>
      <p className="text-[14px] text-[var(--color-ink-2)]">Analizzando il pasto…</p>
      <p className="label-caps opacity-60">5-15 secondi</p>
    </div>
  )
}

function ErrorPanel({ message, onRetry, onClose }) {
  return (
    <div className="space-y-3 text-center">
      <div className="text-4xl">⚠️</div>
      <p className="text-[14px] text-[var(--color-ink-2)] leading-snug">
        {message || 'Errore durante l\'analisi.'}
      </p>
      <div className="flex gap-2 pt-1">
        <Button variant="ghost" className="flex-1" onClick={onClose}>Annulla</Button>
        <Button className="flex-1" onClick={onRetry}>Riprova</Button>
      </div>
    </div>
  )
}

function ResultPanel({ analysis, previewUrl, onConfirm, onClose, busy }) {
  const ingredients = Array.isArray(analysis?.ingredienti) ? analysis.ingredienti : []
  const totals = analysis?.totali || {}
  const valutazione = analysis?.valutazione || {}
  const domande = Array.isArray(analysis?.domande_per_precisione) ? analysis.domande_per_precisione : []
  const consigli = analysis?.consigli || ''
  const conf = valutazione.confidenza || 'media'
  const compat = valutazione.compatibilita_dieta || ''

  return (
    <div className="space-y-3">
      {previewUrl && (
        <div className="rounded-2xl overflow-hidden bg-black/5 max-h-44 grid place-items-center">
          <img src={previewUrl} alt="pasto" className="w-full h-full object-contain max-h-44" />
        </div>
      )}

      {conf === 'bassa' && (
        <div className="bg-amber-100/70 text-amber-900 rounded-xl px-3 py-2 text-[12px] leading-snug">
          ⚠️ Stima approssimativa. Considera di verificare le quantità.
        </div>
      )}

      <div>
        <div className="label-caps mb-1.5">Ingredienti rilevati</div>
        <ul className="space-y-1.5">
          {ingredients.map((ing, i) => (
            <li key={i} className="flex items-start gap-2 bg-white/55 rounded-xl px-3 py-2">
              <span className="text-lg leading-none mt-0.5">{ing.emoji || '🍽️'}</span>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-semibold text-[var(--color-ink)] truncate">
                  {ing.nome}
                </div>
                <div className="label-caps opacity-70 mt-0.5">
                  {ing.quantita_descrizione || `~${Math.round(ing.quantita_grammi || 0)}g`}
                  {' · '}{Math.round(ing.proteine || 0)}g P
                  {' · '}{Math.round(ing.kcal || 0)} kcal
                </div>
                {ing.note && (
                  <div className="label-caps opacity-60 mt-0.5 normal-case tracking-normal">
                    {ing.note}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-gradient-to-br from-[#ff7a4a]/10 to-[#ffb37a]/10 rounded-2xl p-3">
        <div className="label-caps mb-1">Totale stimato</div>
        <div className="font-display font-extrabold text-[24px] tracking-[-0.02em] text-[var(--color-ink)]">
          {Math.round(totals.kcal || 0)} kcal
        </div>
        <div className="font-mono text-[11px] tracking-wider text-[var(--color-ink-2)] mt-1">
          {Math.round(totals.proteine || 0)}g P · {Math.round(totals.carbo || 0)}g C · {Math.round(totals.grassi || 0)}g F
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2">
          <Pill tone="sun">conf. {conf}</Pill>
          {compat && <Pill tone={compat === 'ottima' || compat === 'buona' ? 'good' : 'sun'}>{compat}</Pill>}
          {valutazione.perc_target_proteine != null && (
            <Pill tone="sun">{Math.round(valutazione.perc_target_proteine)}% prot</Pill>
          )}
          {valutazione.perc_target_calorie != null && (
            <Pill tone="sun">{Math.round(valutazione.perc_target_calorie)}% kcal</Pill>
          )}
        </div>
      </div>

      {consigli && (
        <p className="text-[13px] text-[var(--color-ink-2)] leading-snug px-1">
          {consigli}
        </p>
      )}

      {domande.length > 0 && (
        <details className="bg-white/40 rounded-xl px-3 py-2">
          <summary className="label-caps cursor-pointer">Domande per precisione</summary>
          <ul className="mt-2 space-y-1 pl-3 list-disc text-[12px] text-[var(--color-ink-2)]">
            {domande.map((q, i) => <li key={i}>{q}</li>)}
          </ul>
        </details>
      )}

      <div className="flex gap-2 pt-2">
        <Button variant="ghost" className="flex-1" onClick={onClose}>Annulla</Button>
        <Button className="flex-1" onClick={onConfirm} disabled={busy}>
          {busy ? '…' : 'Conferma e salva'}
        </Button>
      </div>
    </div>
  )
}
