import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import * as db from '../lib/db'

export const useStore = create((set, get) => ({
  // state
  ready: false,
  userId: null,
  profile: null,
  weights: [],
  meals: [],
  workouts: [],
  routines: [],
  chat: [],
  channels: [],

  // ── lifecycle ──────────────────────────────────────────────
  init: async (userId) => {
    set({ userId, ready: false })
    try {
      const [profile, weights, meals, workouts, routines, chat] = await Promise.all([
        db.fetchProfile(),
        db.fetchWeights(),
        db.fetchMeals(),
        db.fetchWorkouts(),
        db.fetchRoutines(),
        db.fetchChat(),
      ])
      set({ profile, weights, meals, workouts, routines, chat, ready: true })
    } catch (e) {
      console.error('store.init failed', e)
      set({ ready: true })
    }

    // realtime
    const channels = []
    const sub = (table, key) => {
      const ch = supabase.channel(`rt-${table}`)
        .on('postgres_changes',
            { event: '*', schema: 'public', table, filter: `user_id=eq.${userId}` },
            (p) => applyChange(set, get, key, p))
        .subscribe()
      channels.push(ch)
    }
    sub('weights', 'weights')
    sub('meals', 'meals')
    sub('workouts', 'workouts')
    sub('routines', 'routines')
    sub('chat', 'chat')
    sub('profiles', 'profile')
    set({ channels })
  },

  teardown: () => {
    const ch = get().channels
    ch.forEach(c => supabase.removeChannel(c))
    set({
      ready: false, userId: null, profile: null,
      weights: [], meals: [], workouts: [], routines: [], chat: [], channels: [],
    })
  },

  // ── derived selectors (used as functions, not memo) ────────
  todayDate: () => new Date().toISOString().split('T')[0],

  todayMeals: () => {
    const d = new Date().toISOString().split('T')[0]
    return get().meals.filter(m => m.date === d)
  },
  todayWorkouts: () => {
    const d = new Date().toISOString().split('T')[0]
    return get().workouts.filter(w => w.date === d)
  },
  currentWeight: () => {
    const ws = get().weights
    return ws.length ? ws[ws.length - 1].value : (get().profile?.start_weight ?? 0)
  },
  weekWorkouts: () => {
    const d = new Date(); d.setDate(d.getDate() - 7)
    const since = d.toISOString().split('T')[0]
    return get().workouts.filter(w => w.date >= since).length
  },

  // ── actions: scrivono Supabase, realtime aggiorna lo stato ─
  addWeight: (p) => db.addWeight(p),
  deleteWeight: (id) => db.deleteWeight(id),
  addMeal: (m) => db.addMeal(m),
  deleteMeal: (id) => db.deleteMeal(id),
  addWorkout: (w) => db.addWorkout(w),
  deleteWorkout: (id) => db.deleteWorkout(id),
  addRoutine: (r) => db.addRoutine(r),
  deleteRoutine: (id) => db.deleteRoutine(id),
  addChat: (msg) => db.addChatMessage(msg),
  clearChat: () => db.clearChat(),
  updateProfile: (patch) => db.updateProfile(patch),
}))

function applyChange(set, get, key, { eventType, new: row, old }) {
  if (key === 'profile') {
    if (eventType === 'UPDATE' || eventType === 'INSERT') set({ profile: row })
    return
  }
  set(state => {
    const arr = state[key] || []
    if (eventType === 'INSERT') {
      if (arr.some(x => x.id === row.id)) return {}
      return { [key]: [...arr, row] }
    }
    if (eventType === 'UPDATE') {
      return { [key]: arr.map(x => x.id === row.id ? row : x) }
    }
    if (eventType === 'DELETE') {
      return { [key]: arr.filter(x => x.id !== old.id) }
    }
    return {}
  })
}
