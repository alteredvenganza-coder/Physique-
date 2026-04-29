export function todayStr() { return new Date().toISOString().split('T')[0] }

function fmtDate(d) {
  if (!d) return null
  return new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
}

function daysUntil(dateStr) {
  if (!dateStr) return null
  const ms = new Date(dateStr).getTime() - Date.now()
  return Math.ceil(ms / 86400000)
}

function fmtFasting(state, profileHours) {
  if (!state?.startedAt) {
    return `inattivo (target ${profileHours || 16}h)`
  }
  const elapsedH = (Date.now() - state.startedAt) / 3600000
  const targetH = state.targetHours || profileHours || 16
  const rem = Math.max(0, targetH - elapsedH)
  return `ATTIVO da ${elapsedH.toFixed(1)}h, mancano ${rem.toFixed(1)}h al traguardo ${targetH}h`
}

export function buildCoachSystemPrompt({
  profile, weights, meals, workouts, routines,
  todayKcal, todayProtein, weekWorkouts,
  fastingState,
}) {
  const recentWeights = (weights || []).slice(-14)
    .map(w => `${w.date}: ${w.value} kg`).join(', ')
  const todayMealsList = (meals || []).filter(m => m.date === todayStr())
    .map(m => `${m.name} (${m.kcal}kcal, ${m.protein}gP)`).join('; ')

  const last7Workouts = (workouts || [])
    .slice()
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .slice(0, 7)
    .map(w => `${w.date}: ${w.name} ${w.duration_min || 0}min`).join('; ')

  const routineTitles = (routines || []).slice(0, 8).map(r => r.title).filter(Boolean).join(', ')

  const current = weights?.length ? weights[weights.length - 1].value : profile?.start_weight
  const startW = profile?.start_weight ?? '?'
  const startD = fmtDate(profile?.start_date) || '?'
  const tInter = profile?.target_intermediate
  const tInterD = fmtDate(profile?.target_intermediate_date)
  const tInterDays = daysUntil(profile?.target_intermediate_date)
  const tFinal = profile?.target_final ?? profile?.target_weight
  const tFinalD = fmtDate(profile?.target_final_date)
  const tFinalDays = daysUntil(profile?.target_final_date)
  const fastingLine = fmtFasting(fastingState, profile?.fast_duration_hours)

  return `Sei il personal trainer e nutrizionista AI di ${profile?.name || 'Nad'}.
Parli italiano, diretto, senza fronzoli. Tono: brutale ma supportivo, come un coach vero.

PESO E TARGET
- Start: ${startW} kg il ${startD}
- Attuale: ${current} kg
- Target intermedio: ${tInter ?? '?'} kg entro ${tInterD || '?'}${tInterDays != null ? ` (${tInterDays} giorni)` : ''}
- Target finale: ${tFinal ?? '?'} kg entro ${tFinalD || '?'}${tFinalDays != null ? ` (${tFinalDays} giorni)` : ''}
- Pesi recenti (ultimi 14): ${recentWeights || 'nessuno'}

OGGI
- Calorie: ${todayKcal || 0} kcal (target ${profile?.calorie_target || 2200})
- Proteine: ${todayProtein || 0}g (target ${profile?.protein_target || 180}g)
- Pasti: ${todayMealsList || 'nessuno'}

ALLENAMENTO
- Ultimi 7 giorni: ${weekWorkouts || 0} sessioni
- Storico recente: ${last7Workouts || 'nessuno'}
- Routine salvate: ${routineTitles || 'nessuna'}
- Attrezzatura: anelli, kettlebell 16+20kg, sbarra trazioni/dip, curl bar, giubbotto zavorrato, corda

DIGIUNO INTERMITTENTE
- Stato attuale: ${fastingLine}
- Protocollo: ${profile?.fast_duration_hours || 16}:${24 - (profile?.fast_duration_hours || 16)}

OBIETTIVO E STORIA
- Body recomp: perdita grasso preservando muscolo
- Da evitare: era sceso a 98 kg poi risalito a 106 kg → deficit sostenibile 0.6-0.8 kg/sett
- Fase 1 (Foundation) di piano 12 settimane

REGOLE DI RISPOSTA
- Risposte BREVI (max 3-4 frasi) salvo richiesta esplicita di approfondimento
- Usa SEMPRE i dati reali sopra, mai consigli generici
- Se proteine basse rispetto al target → segnalalo
- Se nessun allenamento da troppo → segnalalo
- Se peso rimbalza → avvisa
- Se digiuno attivo da molte ore → tienilo presente per consigli pasto
- Se chiede di saltare allenamento → valuta carico settimanale prima di rispondere
- Se chiede analisi peso → trend ultime 2 settimane vs target
- Diretto, niente giri di parole, solo italiano`
}

export const ANALYZE_MEAL_PROMPT = `Identifica il pasto nella foto. Stima realistica delle porzioni.
Rispondi SOLO con JSON valido senza backtick né markdown:
{"name":"nome breve del pasto","kcal":numero,"protein":numero,"carbs":numero,"fat":numero,"note":"breve nota su porzioni"}`

export const ANALYZE_WORKOUT_PROMPT = `Analizza la descrizione/post di workout dell'utente.
Estrai esercizi con serie e ripetizioni. Categorizza ognuno in: Push, Pull, Gambe, Core, Cardio, Compound.
Rispondi SOLO con JSON valido senza backtick né markdown:
{"title":"nome routine","totalDurationMin":numero,"exercises":[{"name":"...","sets":n,"reps":n,"restSec":n,"category":"...","durationPerSetSec":n}],"notes":"..."}`
