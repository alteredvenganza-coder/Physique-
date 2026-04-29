// Tools the Coach can invoke to act on the app on the user's behalf.
// Each tool ships with a JSON-schema definition (sent to Claude) and a
// runtime executor (run client-side so the user's auth applies to
// Supabase writes).

const FASTING_STORAGE_KEY = 'physique:fasting'

export const COACH_TOOLS = [
  {
    name: 'add_meal',
    description: 'Aggiungi un pasto al log alimentare di oggi. Usa quando l\'utente dice cosa ha mangiato. Stima i macro se non li sa.',
    input_schema: {
      type: 'object',
      properties: {
        name:    { type: 'string', description: 'Nome breve del pasto, es. "petto pollo + insalata"' },
        kcal:    { type: 'number', description: 'Calorie totali stimate' },
        protein: { type: 'number', description: 'Proteine in grammi' },
        carbs:   { type: 'number', description: 'Carbo in grammi (default 0)' },
        fat:     { type: 'number', description: 'Grassi in grammi (default 0)' },
        time:    { type: 'string', description: 'Orario HH:MM, default ora corrente' },
      },
      required: ['name', 'kcal', 'protein'],
    },
  },
  {
    name: 'add_weight',
    description: 'Registra una pesata di oggi. Usa quando l\'utente dichiara il suo peso.',
    input_schema: {
      type: 'object',
      properties: {
        value: { type: 'number', description: 'Peso in kg, es. 101.6' },
        note:  { type: 'string', description: 'Nota opzionale, es. "post allenamento"' },
      },
      required: ['value'],
    },
  },
  {
    name: 'add_workout',
    description: 'Registra una sessione di allenamento appena fatta. Usa quando l\'utente racconta un allenamento concluso.',
    input_schema: {
      type: 'object',
      properties: {
        name:         { type: 'string',  description: 'Nome routine, es. "Push Foundation"' },
        category:     { type: 'string',  description: 'push / pull / legs / fullbody / core / cardio / mobility' },
        duration_min: { type: 'number',  description: 'Durata in minuti' },
        intensity:    { type: 'string',  description: 'low / moderate / high' },
        kcal:         { type: 'number',  description: 'Calorie bruciate stimate' },
        notes:        { type: 'string',  description: 'Note libere, es. "tutto pulito, 2 reps in tasca"' },
      },
      required: ['name', 'duration_min'],
    },
  },
  {
    name: 'start_fasting',
    description: 'Avvia il timer del digiuno intermittente di Nad. Usa solo se l\'utente lo chiede esplicitamente.',
    input_schema: {
      type: 'object',
      properties: {
        hours: { type: 'number', description: 'Durata target in ore (12-20). Default 16.' },
      },
    },
  },
  {
    name: 'stop_fasting',
    description: 'Termina il digiuno in corso. Usa solo se l\'utente lo chiede esplicitamente.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'save_routine',
    description: 'Salva una routine di allenamento personalizzata fra quelle dell\'utente. Usa quando l\'utente dice "fammi una routine con questi esercizi", "salvami questo allenamento", o assembla preferenze. Lista esercizi richiesta.',
    input_schema: {
      type: 'object',
      properties: {
        title:        { type: 'string', description: 'Titolo breve, es. "Push Anelli + KB"' },
        exercises: {
          type: 'array',
          description: 'Sequenza di esercizi con serie/ripetizioni/riposo',
          items: {
            type: 'object',
            properties: {
              name:    { type: 'string', description: 'Nome esercizio' },
              sets:    { type: 'number', description: 'Serie' },
              reps:    { type: 'string', description: 'Ripetizioni o durata, es. "10" o "30s"' },
              rest_s:  { type: 'number', description: 'Riposo dopo ogni serie in secondi' },
              notes:   { type: 'string', description: 'Tecnica o cue brevi' },
              category:{ type: 'string', description: 'push / pull / legs / core / cardio' },
            },
            required: ['name', 'sets', 'reps'],
          },
        },
        duration_min: { type: 'number', description: 'Durata totale stimata in minuti' },
        kcal:         { type: 'number', description: 'Calorie stimate' },
        notes:        { type: 'string', description: 'Note generali sulla routine' },
      },
      required: ['title', 'exercises'],
    },
  },
  {
    name: 'update_targets',
    description: 'Modifica i target dell\'utente (peso intermedio/finale, calorie, proteine).',
    input_schema: {
      type: 'object',
      properties: {
        target_intermediate:      { type: 'number' },
        target_intermediate_date: { type: 'string', description: 'YYYY-MM-DD' },
        target_final:             { type: 'number' },
        target_final_date:        { type: 'string', description: 'YYYY-MM-DD' },
        calorie_target:           { type: 'number' },
        protein_target:           { type: 'number' },
      },
    },
  },
  {
    name: 'update_fast_duration',
    description: 'Cambia la durata default del digiuno intermittente (12-20 ore).',
    input_schema: {
      type: 'object',
      properties: {
        hours: { type: 'number', description: '12-20' },
      },
      required: ['hours'],
    },
  },
]

export function makeToolExecutor(actions) {
  // actions = { addMeal, addWeight, addWorkout, addRoutine, updateProfile }
  return async function executeTool({ name, input }) {
    const args = input || {}
    try {
      switch (name) {
        case 'add_meal': {
          const time = args.time || new Date().toTimeString().slice(0, 5)
          await actions.addMeal({
            name: args.name,
            kcal: Math.round(args.kcal || 0),
            protein: Math.round(args.protein || 0),
            carbs: Math.round(args.carbs || 0),
            fat: Math.round(args.fat || 0),
            time,
            source: 'coach',
          })
          return `Pasto aggiunto: ${args.name} · ${Math.round(args.kcal)} kcal · ${Math.round(args.protein)}g P.`
        }
        case 'add_weight': {
          await actions.addWeight({ value: Number(args.value), note: args.note })
          return `Peso registrato: ${args.value} kg.`
        }
        case 'add_workout': {
          await actions.addWorkout({
            name: args.name,
            category: args.category,
            duration_min: Math.round(args.duration_min || 0),
            intensity: args.intensity,
            kcal: args.kcal != null ? Math.round(args.kcal) : 0,
            notes: args.notes,
          })
          return `Allenamento registrato: ${args.name} (${args.duration_min || '?'} min).`
        }
        case 'start_fasting': {
          const hours = clamp(Number(args.hours) || 16, 12, 20)
          const state = { startedAt: Date.now(), targetHours: hours }
          localStorage.setItem(FASTING_STORAGE_KEY, JSON.stringify(state))
          return `Digiuno avviato (target ${hours}h).`
        }
        case 'stop_fasting': {
          localStorage.removeItem(FASTING_STORAGE_KEY)
          return 'Digiuno terminato.'
        }
        case 'save_routine': {
          const exercises = Array.isArray(args.exercises) ? args.exercises : []
          await actions.addRoutine({
            title: args.title,
            exercises,
            duration_min: args.duration_min ? Math.round(args.duration_min) : 0,
            kcal: args.kcal ? Math.round(args.kcal) : 0,
            notes: args.notes,
            source: 'coach',
          })
          return `Routine "${args.title}" salvata fra le tue routine. Apri il tab Workout per avviarla.`
        }
        case 'update_targets': {
          const patch = {}
          for (const k of [
            'target_intermediate', 'target_intermediate_date',
            'target_final', 'target_final_date',
            'calorie_target', 'protein_target',
          ]) {
            if (args[k] != null && args[k] !== '') patch[k] = args[k]
          }
          if (patch.target_final != null) patch.target_weight = patch.target_final
          if (Object.keys(patch).length === 0) return 'Nessun target da aggiornare.'
          await actions.updateProfile(patch)
          return 'Target aggiornati.'
        }
        case 'update_fast_duration': {
          const hours = clamp(Number(args.hours) || 16, 12, 20)
          await actions.updateProfile({ fast_duration_hours: hours })
          return `Durata digiuno default impostata a ${hours}h.`
        }
        default:
          return `Tool "${name}" non riconosciuto.`
      }
    } catch (err) {
      return `Errore esecuzione ${name}: ${err.message}`
    }
  }
}

function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)) }

// Friendly inline label shown in the chat while/after a tool runs.
export function toolActionLabel(name) {
  switch (name) {
    case 'add_meal':            return 'Aggiungo pasto'
    case 'add_weight':          return 'Registro peso'
    case 'add_workout':         return 'Registro allenamento'
    case 'start_fasting':       return 'Avvio digiuno'
    case 'stop_fasting':        return 'Stop digiuno'
    case 'save_routine':        return 'Salvo routine'
    case 'update_targets':      return 'Aggiorno target'
    case 'update_fast_duration':return 'Aggiorno durata digiuno'
    default:                    return name
  }
}
