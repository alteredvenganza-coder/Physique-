// MET values per kcal estimation — riusato dalla v3.
export const MET_VALUES = {
  'flessioni': 3.8, 'push-up': 3.8, 'pushup': 3.8,
  'trazioni': 5.0, 'pull-up': 5.0, 'pullup': 5.0,
  'dips': 4.0, 'muscle-up': 6.0, 'muscle up': 6.0,
  'squat': 5.0, 'affondi': 4.5, 'lunge': 4.5,
  'swing': 5.5, 'kettlebell swing': 5.5, 'kb swing': 5.5,
  'ab wheel': 3.5, 'plank': 3.0, 'burpee': 8.0,
  'jumping jack': 5.0, 'box jump': 8.0, 'mountain climber': 8.0,
  'deadlift': 6.0, 'curl': 3.0, 'shoulder press': 3.5,
  'row': 4.5, 'press': 3.5, 'clean': 6.0,
  'snatch': 7.0, 'thruster': 6.5, 'wall ball': 6.0,
  'jump rope': 10.0, 'running': 9.0, 'corsa': 9.0,
  'camminata': 3.5, 'walking': 3.5,
  default: 4.5,
}

export function estimateCalories(name, durationMin, weightKg) {
  const key = (name || '').toLowerCase().trim()
  let met = MET_VALUES.default
  for (const [k, v] of Object.entries(MET_VALUES)) {
    if (k !== 'default' && key.includes(k)) { met = v; break }
  }
  return Math.round((met * 3.5 * weightKg / 200) * durationMin)
}

const CATEGORIES = {
  'flessioni': 'Push', 'push-up': 'Push', 'dips': 'Push',
  'trazioni': 'Pull', 'pull-up': 'Pull', 'row': 'Pull', 'curl': 'Pull',
  'muscle-up': 'Compound', 'muscle up': 'Compound',
  'squat': 'Gambe', 'affondi': 'Gambe', 'lunge': 'Gambe',
  'swing': 'Forza/Cardio', 'kettlebell swing': 'Forza/Cardio',
  'ab wheel': 'Core', 'plank': 'Core',
  'burpee': 'Cardio', 'jumping jack': 'Cardio', 'jump rope': 'Cardio',
  'running': 'Cardio', 'corsa': 'Cardio', 'camminata': 'Cardio',
}

export function getCategory(name) {
  const key = (name || '').toLowerCase().trim()
  for (const [k, v] of Object.entries(CATEGORIES)) {
    if (key.includes(k)) return v
  }
  return 'Generale'
}
