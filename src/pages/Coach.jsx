import { useEffect, useMemo, useRef, useState } from 'react'
import { marked } from 'marked'
import { useStore } from '../store/data'
import { Card, IconButton, toast } from '../components/ui'
import ChatBubble from '../components/ChatBubble'
import { chatStream as aiChatStream, analyzeMealImage, fileToBase64 } from '../lib/ai'
import { buildCoachSystemPrompt, ANALYZE_MEAL_PROMPT } from '../lib/prompts'

const FASTING_STORAGE_KEY = 'physique:fasting'

function readFastingState() {
  try {
    const raw = localStorage.getItem(FASTING_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed?.startedAt ? parsed : null
  } catch { return null }
}

const QUICK_PROMPTS = [
  { icon: '⚡', label: 'Come sto', text: 'Come sto andando ultimamente? Analizza il mio trend peso e i miei allenamenti.' },
  { icon: '🥗', label: 'Cosa mangio', text: 'Cosa mi consigli per il prossimo pasto, dato quello che ho già mangiato oggi?' },
  { icon: '🏋️', label: 'Salto?', text: 'Posso saltare l\'allenamento oggi? Valuta in base al carico degli ultimi 7 giorni.' },
  { icon: '⚖️', label: 'Peso', text: 'Analizza il mio peso: trend ultime 2 settimane e se sono in linea col target intermedio.' },
  { icon: '🎯', label: 'In linea?', text: 'Sono in linea con il target intermedio (90 kg entro 15 settembre)? Cosa devo cambiare?' },
]

export default function Coach() {
  const profile = useStore(s => s.profile)
  const weights = useStore(s => s.weights)
  const meals = useStore(s => s.meals)
  const workouts = useStore(s => s.workouts)
  const routines = useStore(s => s.routines)
  const todayKcal = useStore(s => s.todayMeals().reduce((sum, m) => sum + (m.kcal || 0), 0))
  const todayProtein = useStore(s => s.todayMeals().reduce((sum, m) => sum + (m.protein || 0), 0))
  const weekWorkouts = useStore(s => s.weekWorkouts())
  const chatMsgs = useStore(s => s.chat)
  const addChat = useStore(s => s.addChat)
  const addMeal = useStore(s => s.addMeal)

  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const endRef = useRef(null)
  const fileRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMsgs.length, busy, analyzing, streamingText])

  const send = async (e, override) => {
    e?.preventDefault?.()
    const text = (override ?? input).trim()
    if (!text || busy) return
    if (!override) setInput('')
    setBusy(true)
    setStreamingText('')
    try {
      await addChat({ role: 'user', content: text })
      const system = buildCoachSystemPrompt({
        profile, weights, meals, workouts, routines,
        todayKcal, todayProtein, weekWorkouts,
        fastingState: readFastingState(),
      })
      // Send a deeper rolling window for memory across turns.
      const history = [...chatMsgs.slice(-40), { role: 'user', content: text }]
        .map(m => ({ role: m.role, content: m.content }))
      const final = await aiChatStream({
        messages: history,
        system,
        onToken: (_t, full) => setStreamingText(full),
      })
      setStreamingText('')
      if (final) await addChat({ role: 'assistant', content: final })
    } catch (err) {
      setStreamingText('')
      await addChat({
        role: 'assistant',
        content: `Errore di connessione al coach: ${err.message}. Verifica setup Supabase.`,
      }).catch(() => {})
      toast(err.message || 'Errore')
    } finally { setBusy(false) }
  }

  const onPickPhoto = () => fileRef.current?.click()

  const onPhotoChosen = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setAnalyzing(true)
    try {
      const base64 = await fileToBase64(file)
      await addChat({ role: 'user', content: '📷 [foto pasto inviata]' })
      const out = await analyzeMealImage({ image_base64: base64, prompt: ANALYZE_MEAL_PROMPT })
      const note = out.note ? `\n\n${out.note}` : ''
      await addChat({
        role: 'assistant',
        content: `Stimato: **${out.name}** · ${out.kcal} kcal · ${out.protein}g P · ${out.carbs}g C · ${out.fat}g F${note}\n\nLo aggiungo al log?`,
      })
      // auto-add to log
      await addMeal({
        name: out.name, kcal: out.kcal, protein: out.protein,
        carbs: out.carbs, fat: out.fat,
        time: new Date().toTimeString().slice(0, 5), source: 'ai_photo',
      })
      toast('Pasto aggiunto dal coach')
    } catch (err) {
      toast(err.message || 'Errore analisi foto')
      await addChat({ role: 'assistant', content: `Non sono riuscito a leggere la foto: ${err.message}` })
    } finally { setAnalyzing(false) }
  }

  return (
    <div className="flex flex-col" style={{ minHeight: 'calc(100dvh - 80px)' }}>
      {/* Hero */}
      <header className="px-5 pt-10 pb-3">
        <div className="label-caps">AI Coach · {busy || analyzing ? 'sta pensando…' : 'online'}</div>
        <h1 className="font-display font-extrabold text-[34px] tracking-[-0.03em] text-[var(--color-ink)] mt-1">
          Ciao, {profile?.name || 'tu'}.
        </h1>
      </header>

      {/* Quick chips: foto + suggerimenti pre-scritti */}
      <div className="grid grid-cols-3 gap-2 px-3 mb-2">
        <ChipAction icon="📷" label="Foto pasto" onClick={onPickPhoto} disabled={analyzing} />
        {QUICK_PROMPTS.slice(0, 2).map(q => (
          <ChipAction key={q.label} icon={q.icon} label={q.label} onClick={() => send(null, q.text)} disabled={busy} />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2 px-3 mb-3">
        {QUICK_PROMPTS.slice(2).map(q => (
          <ChipAction key={q.label} icon={q.icon} label={q.label} onClick={() => send(null, q.text)} disabled={busy} />
        ))}
      </div>
      <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onPhotoChosen} />

      {/* Messages */}
      <div className="flex-1 px-3 pb-4 overflow-y-auto space-y-2">
        {chatMsgs.length === 0 && !busy && (
          <Card className="text-center py-6">
            <div className="text-3xl opacity-60">💬</div>
            <p className="text-sm mt-2 text-[var(--color-ink-3)]">
              Scrivi qualcosa al coach. Ha accesso ai tuoi dati: peso, pasti, allenamenti.
            </p>
          </Card>
        )}
        {chatMsgs.map(m => <ChatBubble key={m.id} msg={m} />)}
        {streamingText && <StreamingBubble text={streamingText} />}
        {((busy && !streamingText) || analyzing) && <TypingBubble />}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <form onSubmit={send} className="sticky bottom-[88px] mx-3 mb-2">
        <div className="bg-white/75 backdrop-blur-xl rounded-full p-1.5 pl-5 flex items-center gap-2 shadow-[var(--shadow-soft)]">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Cosa hai mangiato / fatto?"
            className="flex-1 bg-transparent outline-none text-[14px] placeholder:text-[var(--color-muted)]"
          />
          <IconButton type="submit" disabled={busy || !input.trim()}>↑</IconButton>
        </div>
      </form>
    </div>
  )
}

function ChipAction({ icon, label, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="press bg-white/60 backdrop-blur rounded-2xl p-3 flex flex-col items-center justify-center gap-1 disabled:opacity-50"
    >
      <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#ff7a4a] to-[#ffb37a] grid place-items-center text-white text-sm">
        {icon}
      </div>
      <span className="label-caps">{label}</span>
    </button>
  )
}

function StreamingBubble({ text }) {
  const html = useMemo(() => {
    try { return marked.parse(String(text || '')) } catch { return null }
  }, [text])
  return (
    <div className="flex flex-col items-start max-w-full">
      <div className="max-w-[82%] px-4 py-2.5 text-[14px] leading-snug break-words bg-white/65 backdrop-blur text-[var(--color-ink)] rounded-3xl rounded-bl-md chat-md streaming">
        {html
          ? <div dangerouslySetInnerHTML={{ __html: html }} />
          : <span className="whitespace-pre-wrap">{text}</span>}
      </div>
    </div>
  )
}

function TypingBubble() {
  return (
    <div className="flex">
      <div className="bg-white/65 backdrop-blur rounded-3xl rounded-bl-md px-4 py-3 flex gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-ink-3)] animate-bounce" />
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-ink-3)] animate-bounce [animation-delay:120ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-ink-3)] animate-bounce [animation-delay:240ms]" />
      </div>
    </div>
  )
}

