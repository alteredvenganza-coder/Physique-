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
  return j.text || ''
}

// Streaming chat: edge function forwards the Anthropic SSE stream.
// Calls onToken(delta, full) for every text chunk and resolves with the
// concatenated final text.
export async function chatStream({ messages, system, onToken, signal }) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Non sei loggato')
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/coach`
  const res = await fetch(url, {
    method: 'POST',
    signal,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ action: 'chat', messages, system, stream: true }),
  })
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw new Error(`AI error ${res.status}: ${t.slice(0, 200)}`)
  }
  if (!res.body) throw new Error('Nessuno stream ricevuto')

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let full = ''

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    // SSE events are separated by blank lines. Process complete events only.
    let nl
    while ((nl = buffer.indexOf('\n\n')) >= 0) {
      const event = buffer.slice(0, nl)
      buffer = buffer.slice(nl + 2)
      const dataLine = event.split('\n').find(l => l.startsWith('data: '))
      if (!dataLine) continue
      const data = dataLine.slice(6).trim()
      if (!data || data === '[DONE]') continue
      try {
        const obj = JSON.parse(data)
        if (obj.type === 'content_block_delta' && obj.delta?.type === 'text_delta') {
          const t = obj.delta.text || ''
          if (t) {
            full += t
            onToken?.(t, full)
          }
        } else if (obj.type === 'message_stop') {
          // graceful end
        }
      } catch { /* skip malformed event */ }
    }
  }
  return full
}

export async function analyzeMealImage({ image_base64, prompt }) {
  const j = await callCoachFn({ action: 'analyze-meal', image_base64, prompt })
  return parseJson(j.text || '')
}

export async function analyzeWorkoutText({ text, prompt }) {
  const j = await callCoachFn({ action: 'analyze-workout', text, prompt })
  return parseJson(j.text || '')
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
