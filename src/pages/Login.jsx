import { useState } from 'react'
import { signInWithEmail } from '../lib/supabase'
import { Card, Button, Input, toast } from '../components/ui'

export default function Login() {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!email.includes('@')) return toast('Email non valida')
    setBusy(true)
    const { error } = await signInWithEmail(email.trim())
    setBusy(false)
    if (error) return toast(error.message)
    setSent(true)
  }

  return (
    <div className="min-h-dvh flex flex-col justify-center px-5 py-10">
      <div className="text-center mb-10">
        <div className="font-display font-black text-5xl tracking-tight bg-gradient-to-br from-[#ff7a4a] via-[#ffb37a] to-[#d4a8d8] bg-clip-text text-transparent">
          Physique
        </div>
        <p className="label-caps mt-3">Personal AI Coach</p>
      </div>

      <Card className="max-w-md w-full mx-auto">
        {sent ? (
          <div className="text-center py-4 space-y-3">
            <div className="text-4xl">📩</div>
            <div className="font-display font-extrabold text-lg text-[var(--color-ink)]">
              Controlla l'email
            </div>
            <p className="text-sm text-[var(--color-ink-3)]">
              Ti ho mandato un link a <b>{email}</b>. Aprilo da questo device per entrare.
            </p>
            <button
              type="button"
              className="text-[12px] tracking-wider uppercase font-mono text-[var(--color-ink-3)] underline pt-2"
              onClick={() => setSent(false)}
            >
              Cambia email
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <h1 className="font-display font-extrabold text-2xl text-[var(--color-ink)] tracking-tight">
                Entra
              </h1>
              <p className="text-sm text-[var(--color-ink-3)] mt-1">
                Inserisci la tua email — ricevi un magic link e sei dentro.
              </p>
            </div>
            <Input
              label="Email"
              type="email"
              autoFocus
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="tu@email.com"
            />
            <Button className="w-full" disabled={busy} type="submit">
              {busy ? 'Invio…' : 'Mandami il link'}
            </Button>
          </form>
        )}
      </Card>
    </div>
  )
}
