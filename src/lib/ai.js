import { supabase } from './supabase'

async function callCoachFn(payload) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Non sei loggato')
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/coach`
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(j.error || `AI error ${r.status}`)
  return j
}

export async function chat({ messages, system }) {
  const j = await callCoachFn({ action: 'chat', messages, system })
  const text = j.content?.map(c => c.text || '').join('') || ''
  return text
}

export async function analyzeMealImage({ image_base64, prompt }) {
  const j = await callCoachFn({ action: 'analyze-meal', image_base64, prompt })
  const text = j.content?.map(c => c.text || '').join('') || ''
  return parseJson(text)
}

export async function analyzeWorkoutText({ text, prompt }) {
  const j = await callCoachFn({ action: 'analyze-workout', text, prompt })
  const out = j.content?.map(c => c.text || '').join('') || ''
  return parseJson(out)
}

function parseJson(s) {
  const cleaned = s.replace(/```json|```/g, '').trim()
  try { return JSON.parse(cleaned) } catch {
    const start = cleaned.indexOf('{')
    const end = cleaned.lastIndexOf('}')
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1))
    throw new Error('Risposta AI non parseabile')
  }
}

// Convert File -> base64 string (no data: prefix)
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const r = reader.result
      const i = r.indexOf(',')
      resolve(i >= 0 ? r.slice(i + 1) : r)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
