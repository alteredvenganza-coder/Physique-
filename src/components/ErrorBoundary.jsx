import { Component } from 'react'

export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('App crash:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-dvh px-5 py-10 flex items-center justify-center">
          <div className="max-w-md w-full bg-white/80 backdrop-blur rounded-3xl p-6 shadow-xl">
            <div className="text-3xl mb-3">😵</div>
            <h1 className="font-display font-extrabold text-2xl text-[var(--color-ink)] mb-2">
              Qualcosa è andato storto
            </h1>
            <pre className="text-xs bg-black/5 rounded-xl p-3 overflow-auto max-h-60 whitespace-pre-wrap text-[var(--color-ink-2)]">
{String(this.state.error?.message || this.state.error)}
{'\n\n'}
{String(this.state.error?.stack || '').slice(0, 800)}
            </pre>
            <button
              onClick={() => { this.setState({ error: null }); location.reload() }}
              className="mt-4 w-full press bg-gradient-to-br from-[#ff7a4a] to-[#ffb37a] text-white font-mono uppercase tracking-wider text-[11px] py-3 rounded-full"
            >
              Ricarica
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
