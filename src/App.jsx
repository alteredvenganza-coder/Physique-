import { useEffect, useState } from 'react'
import { supabase, onAuthChange } from './lib/supabase'
import { useStore } from './store/data'
import { NavBar, ToastHost } from './components/ui'
import Splash from './pages/Splash'
import Login from './pages/Login'
import Home from './pages/Home'
import Coach from './pages/Coach'
import Log from './pages/Log'
import You from './pages/You'

export default function App() {
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState(null)
  const [bootError, setBootError] = useState(null)
  const [tab, setTab] = useState('home')

  const init = useStore(s => s.init)
  const teardown = useStore(s => s.teardown)

  useEffect(() => {
    let mounted = true

    // Diagnostic: verify env got baked in at build time.
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
      setBootError('Manca VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY nelle environment variables.')
      setLoading(false)
      return
    }

    // Watchdog: if getSession hangs (network), unblock the UI after 4s.
    const watchdog = setTimeout(() => {
      if (mounted) setLoading(false)
    }, 4000)

    supabase.auth.getSession()
      .then(({ data, error }) => {
        if (!mounted) return
        if (error) setBootError(`Errore auth: ${error.message}`)
        setSession(data?.session ?? null)
        setLoading(false)
      })
      .catch((err) => {
        if (!mounted) return
        setBootError(`Errore connessione Supabase: ${err.message}`)
        setLoading(false)
      })
      .finally(() => clearTimeout(watchdog))

    const { data: sub } = onAuthChange((sess) => {
      if (mounted) setSession(sess)
    })

    return () => {
      mounted = false
      clearTimeout(watchdog)
      sub?.subscription?.unsubscribe?.()
    }
  }, [])

  useEffect(() => {
    if (session?.user?.id) {
      init(session.user.id)
    } else {
      teardown()
    }
  }, [session?.user?.id, init, teardown])

  if (bootError) {
    return (
      <div className="min-h-dvh px-5 py-10 flex items-center justify-center">
        <div className="max-w-md w-full bg-white/80 backdrop-blur rounded-3xl p-6 shadow-xl text-center">
          <div className="text-3xl mb-3">⚠️</div>
          <h1 className="font-display font-extrabold text-xl text-[var(--color-ink)] mb-2">
            Configurazione mancante
          </h1>
          <p className="text-sm text-[var(--color-ink-3)]">{bootError}</p>
        </div>
      </div>
    )
  }

  if (loading) return <Splash />
  if (!session) return (<><Login /><ToastHost /></>)

  const tabs = [
    { id: 'home',  label: 'Home' },
    { id: 'coach', label: 'Coach' },
    { id: 'log',   label: 'Log' },
    { id: 'you',   label: 'Tu' },
  ]

  return (
    <>
      <main className="pb-[120px]">
        {tab === 'home'  && <Home />}
        {tab === 'coach' && <Coach />}
        {tab === 'log'   && <Log />}
        {tab === 'you'   && <You />}
      </main>
      <NavBar active={tab} onChange={setTab} tabs={tabs} />
      <ToastHost />
    </>
  )
}
