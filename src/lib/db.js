import { supabase } from './supabase'

const handle = (q) => q.then(({ data, error }) => { if (error) throw error; return data })

async function uid() {
  const { data } = await supabase.auth.getUser()
  return data.user?.id
}

// ── Profile ───────────────────────────────────────────────────
export const fetchProfile = () =>
  handle(supabase.from('profiles').select('*').maybeSingle())

export const updateProfile = async (patch) => {
  const id = await uid()
  if (!id) throw new Error('No user')
  return handle(
    supabase.from('profiles').update(patch).eq('user_id', id).select().single()
  )
}

// ── Weights ───────────────────────────────────────────────────
export const fetchWeights = () =>
  handle(supabase.from('weights').select('*').order('date', { ascending: true }))

export const addWeight = async ({ value, date, note }) => {
  const id = await uid()
  return handle(supabase.from('weights')
    .insert({ user_id: id, value, date: date || todayDate(), note })
    .select().single())
}

export const deleteWeight = (id) =>
  handle(supabase.from('weights').delete().eq('id', id))

// ── Meals ─────────────────────────────────────────────────────
export const fetchMeals = () =>
  handle(supabase.from('meals').select('*').order('created_at', { ascending: false }))

export const addMeal = async (m) => {
  const id = await uid()
  return handle(supabase.from('meals')
    .insert({ ...m, user_id: id, date: m.date || todayDate() })
    .select().single())
}

export const deleteMeal = (id) =>
  handle(supabase.from('meals').delete().eq('id', id))

// ── Workouts ──────────────────────────────────────────────────
export const fetchWorkouts = () =>
  handle(supabase.from('workouts').select('*').order('created_at', { ascending: false }))

export const addWorkout = async (w) => {
  const id = await uid()
  return handle(supabase.from('workouts')
    .insert({ ...w, user_id: id, date: w.date || todayDate() })
    .select().single())
}

export const deleteWorkout = (id) =>
  handle(supabase.from('workouts').delete().eq('id', id))

// ── Routines ──────────────────────────────────────────────────
export const fetchRoutines = () =>
  handle(supabase.from('routines').select('*').order('created_at', { ascending: false }))

export const addRoutine = async (r) => {
  const id = await uid()
  return handle(supabase.from('routines').insert({ ...r, user_id: id }).select().single())
}

export const deleteRoutine = (id) =>
  handle(supabase.from('routines').delete().eq('id', id))

// ── Chat ──────────────────────────────────────────────────────
export const fetchChat = () =>
  handle(supabase.from('chat').select('*').order('created_at', { ascending: true }).limit(200))

export const addChatMessage = async (msg) => {
  const id = await uid()
  return handle(supabase.from('chat').insert({ ...msg, user_id: id }).select().single())
}

export const clearChat = async () => {
  const id = await uid()
  return handle(supabase.from('chat').delete().eq('user_id', id))
}

// helpers
export function todayDate() { return new Date().toISOString().split('T')[0] }
