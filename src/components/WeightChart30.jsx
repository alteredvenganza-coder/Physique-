import { useMemo, useState } from 'react'
import { Card, Modal } from './ui'

// 30-day weight chart with optional target reference line.
// Tap the card to open the full history modal.
export default function WeightChart30({ weights = [], target, currentWeight, startWeight }) {
  const [expanded, setExpanded] = useState(false)

  const series = useMemo(() => buildSeries(weights), [weights])

  return (
    <>
      <Card
        className="mx-3 mt-3 cursor-pointer press"
        onClick={() => setExpanded(true)}
        role="button"
        aria-label="Apri storico peso completo"
      >
        <div className="flex justify-between items-baseline mb-2">
          <span className="label-caps">Trend peso · 30 giorni</span>
          <span className="font-mono text-[10px] tracking-wider opacity-70">tap per storico</span>
        </div>
        <Chart series={series} target={target} height={120} />
        {target != null && (
          <div className="flex justify-between mt-2">
            <span className="label-caps opacity-60">
              {currentWeight != null && startWeight != null
                ? `da ${startWeight} → ${currentWeight} kg`
                : '—'}
            </span>
            <span className="label-caps text-emerald-700">target {target} kg</span>
          </div>
        )}
      </Card>

      <FullHistoryModal
        open={expanded}
        onClose={() => setExpanded(false)}
        weights={weights}
      />
    </>
  )
}

function buildSeries(weights) {
  // Last 30 days, oldest -> newest, only days that have an entry.
  // (We don't fabricate data for missing days; gaps are visible as longer line segments.)
  const since = new Date()
  since.setHours(0, 0, 0, 0)
  since.setDate(since.getDate() - 29)
  const sinceStr = since.toISOString().split('T')[0]
  return (weights || [])
    .filter(w => w.date >= sinceStr)
    .map(w => ({ date: w.date, value: parseFloat(w.value) }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

function Chart({ series, target, height = 120 }) {
  const W = 320
  const H = height
  const padX = 8
  const padY = 12

  if (!series.length) {
    return (
      <div className="flex items-center justify-center label-caps text-[var(--color-muted)]" style={{ height }}>
        Nessuna pesata negli ultimi 30 giorni
      </div>
    )
  }

  const values = series.map(s => s.value)
  const valuesWithTarget = target != null ? [...values, target] : values
  const min = Math.min(...valuesWithTarget) - 0.5
  const max = Math.max(...valuesWithTarget) + 0.5
  const range = max - min || 1

  // X axis covers the full 30-day window so the latest dot anchors at the right.
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const xForDate = (dateStr) => {
    const d = new Date(dateStr)
    const daysFromStart = 29 - Math.floor((today.getTime() - d.getTime()) / 86400000)
    const t = Math.max(0, Math.min(29, daysFromStart)) / 29
    return padX + t * (W - padX * 2)
  }
  const yForValue = (v) => padY + (H - padY * 2) * (1 - (v - min) / range)

  const points = series.map(s => [xForDate(s.date), yForValue(s.value)])
  const path = points.reduce((acc, [x, y], i) => acc + (i === 0 ? `M ${x},${y}` : ` L ${x},${y}`), '')
  const fillPath = points.length > 1
    ? `${path} L ${points[points.length - 1][0]},${H - padY} L ${points[0][0]},${H - padY} Z`
    : null
  const last = points[points.length - 1]
  const targetY = target != null ? yForValue(target) : null

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none" style={{ height }}>
      <defs>
        <linearGradient id="wc30" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#ff7a4a" stopOpacity=".35" />
          <stop offset="100%" stopColor="#ff7a4a" stopOpacity="0" />
        </linearGradient>
      </defs>

      {targetY != null && (
        <>
          <line
            x1={padX} x2={W - padX} y1={targetY} y2={targetY}
            stroke="#10b981" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.7"
          />
          <text x={W - padX} y={targetY - 4} fontSize="9" fill="#047857"
            textAnchor="end" fontFamily="ui-monospace, monospace" letterSpacing="0.05em">
            target {target}kg
          </text>
        </>
      )}

      {fillPath && <path d={fillPath} fill="url(#wc30)" />}
      <path d={path} fill="none" stroke="#ff7a4a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {points.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="2.5" fill="#ff7a4a" />
      ))}
      {last && <circle cx={last[0]} cy={last[1]} r="4" fill="#fff" stroke="#ff7a4a" strokeWidth="2" />}
    </svg>
  )
}

function FullHistoryModal({ open, onClose, weights }) {
  const sorted = useMemo(
    () => (weights || []).slice().sort((a, b) => (b.date || '').localeCompare(a.date || '')),
    [weights]
  )
  return (
    <Modal open={open} onClose={onClose} title="Storico peso">
      {sorted.length === 0 ? (
        <p className="label-caps text-center py-4">Nessuna pesata registrata</p>
      ) : (
        <ul className="divide-y divide-black/[0.05]">
          {sorted.map(w => {
            const dateLabel = new Date(w.date).toLocaleDateString('it-IT', {
              weekday: 'short', day: '2-digit', month: 'short', year: '2-digit',
            })
            return (
              <li key={w.id} className="py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[14px] font-semibold text-[var(--color-ink)]">{dateLabel}</div>
                  {w.note && (
                    <div className="label-caps opacity-60 truncate">{w.note}</div>
                  )}
                </div>
                <div className="font-display font-extrabold text-[18px] tracking-[-0.02em] text-[var(--color-ink)] tabular-nums">
                  {parseFloat(w.value).toFixed(1)}
                  <span className="text-[12px] font-medium opacity-50 ml-1">kg</span>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Modal>
  )
}
