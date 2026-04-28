export default function TrendChart({ data = [], height = 100 }) {
  // data: array of { date, value }
  if (!data.length) {
    return (
      <div className="flex items-center justify-center text-[var(--color-muted)] label-caps" style={{ height }}>
        Nessun dato
      </div>
    )
  }

  const W = 320
  const H = height
  const pad = 6
  const values = data.map(d => d.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const stepX = (W - pad * 2) / Math.max(1, data.length - 1)
  const points = data.map((d, i) => {
    const x = pad + i * stepX
    const y = pad + (H - pad * 2) * (1 - (d.value - min) / range)
    return [x, y]
  })

  const path = points.reduce((acc, [x, y], i) => acc + (i === 0 ? `M ${x},${y}` : ` L ${x},${y}`), '')
  const fillPath = `${path} L ${points[points.length-1][0]},${H} L ${points[0][0]},${H} Z`
  const last = points[points.length - 1]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none" style={{ height }}>
      <defs>
        <linearGradient id="tcg" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#ff7a4a" stopOpacity=".35" />
          <stop offset="100%" stopColor="#ff7a4a" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fillPath} fill="url(#tcg)" />
      <path d={path} fill="none" stroke="#ff7a4a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="3.5" fill="#ff7a4a" />
    </svg>
  )
}
