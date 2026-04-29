// Day-streak helpers: counts consecutive days that have at least one log
// (weight, meal, or workout). Streak doesn't break until 24h pass with no log.

function ymd(date) {
  const d = new Date(date)
  return d.toISOString().split('T')[0]
}

function daysAgoStr(n) {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}

export function buildLogDaySet({ weights = [], meals = [], workouts = [] }) {
  const set = new Set()
  for (const w of weights) if (w.date) set.add(ymd(w.date))
  for (const m of meals) if (m.date) set.add(ymd(m.date))
  for (const w of workouts) if (w.date) set.add(ymd(w.date))
  return set
}

export function computeStreak({ weights, meals, workouts }) {
  const days = buildLogDaySet({ weights, meals, workouts })
  if (days.size === 0) return 0
  // Streak alive if today or yesterday logged something. Otherwise 0.
  const today = daysAgoStr(0)
  const yesterday = daysAgoStr(1)
  const hasToday = days.has(today)
  const hasYesterday = days.has(yesterday)
  if (!hasToday && !hasYesterday) return 0
  let count = 0
  // Start from today if logged, else yesterday.
  let i = hasToday ? 0 : 1
  while (days.has(daysAgoStr(i))) {
    count++
    i++
  }
  return count
}
