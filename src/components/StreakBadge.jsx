import { Card } from './ui'

export default function StreakBadge({ streak }) {
  const hot = streak >= 7
  const milestone = [7, 14, 30, 60, 90].includes(streak)
  return (
    <Card
      className={`mx-3 mt-3 ${hot ? 'ring-2 ring-[#ff7a4a]/40' : ''}`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-12 h-12 rounded-2xl grid place-items-center text-xl shrink-0 ${
            hot
              ? 'bg-gradient-to-br from-[#ff7a4a] to-[#ffb37a] text-white shadow-[var(--shadow-pill)]'
              : 'bg-white/65'
          }`}
        >
          🔥
        </div>
        <div className="flex-1 min-w-0">
          <div className="label-caps">Streak</div>
          <div className="font-display font-extrabold text-[24px] tracking-[-0.02em] text-[var(--color-ink)] leading-tight">
            {streak} <span className="text-[14px] font-medium opacity-60">{streak === 1 ? 'giorno' : 'giorni'}</span>
          </div>
          <div className="label-caps mt-0.5 opacity-70">
            {streak === 0
              ? 'Aggiungi un log oggi per iniziare'
              : milestone
                ? `Milestone! ${streak} giorni di fila`
                : 'Almeno un log al giorno'}
          </div>
        </div>
      </div>
    </Card>
  )
}
