import { supabase } from './supabase'

async function callCoachFn(payload, opts = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Non sei loggato')
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/coach`
  const r = await fetch(url, {
    method: 'POST',
    signal: opts.signal,
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

// Streaming chat without tools. Calls onToken(delta, full) per text chunk.
export async function chatStream({ messages, system, onToken, signal }) {
  const turn = await streamOneTurn({ messages, system, onToken, signal })
  return turn.text
}

// Streaming chat WITH tool use. Handles the multi-turn loop: streams the
// assistant turn, executes any tool_use blocks via executeTool() and
// loops with tool_result messages appended until the model stops.
//
// Callbacks:
//   - onToken(delta, currentTurnFull): fired for the CURRENT turn only;
//     resets between turns so the streaming bubble shows only what the
//     coach is saying in the latest turn.
//   - onTurnStart(): each new assistant turn begins.
//   - onToolUse({name, input, result}): a tool was executed.
//
// Returns the final assistant text.
export async function chatStreamWithTools({
  messages, system, tools, signal,
  executeTool, onToken, onTurnStart, onToolUse,
}) {
  let working = [...messages]
  let lastText = ''

  // Cap loops defensively in case the model keeps calling tools.
  for (let i = 0; i < 6; i++) {
    onTurnStart?.()
    const turn = await streamOneTurn({
      messages: working,
      system,
      tools,
      signal,
      onToken,
    })
    lastText = turn.text

    if (turn.stopReason !== 'tool_use' || turn.toolUses.length === 0) {
      return lastText
    }

    // Append the assistant turn (text + tool_use blocks) to the conversation.
    const assistantContent = []
    if (turn.text) assistantContent.push({ type: 'text', text: turn.text })
    for (const tu of turn.toolUses) {
      assistantContent.push({
        type: 'tool_use',
        id: tu.id,
        name: tu.name,
        input: tu.input || {},
      })
    }
    working.push({ role: 'assistant', content: assistantContent })

    // Execute each tool sequentially, build tool_result message.
    const results = []
    for (const tu of turn.toolUses) {
      const result = await executeTool({ name: tu.name, input: tu.input || {} })
      onToolUse?.({ name: tu.name, input: tu.input, result })
      results.push({
        type: 'tool_result',
        tool_use_id: tu.id,
        content: typeof result === 'string' ? result : JSON.stringify(result),
      })
    }
    working.push({ role: 'user', content: results })
  }
  return lastText
}

// Internal: stream one model turn, return { text, toolUses, stopReason }.
async function streamOneTurn({ messages, system, tools, signal, onToken }) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Non sei loggato')
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/coach`

  const body = { action: 'chat', messages, system, stream: true }
  if (tools && tools.length) body.tools = tools

  const res = await fetch(url, {
    method: 'POST',
    signal,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw new Error(`AI error ${res.status}: ${t.slice(0, 200)}`)
  }
  if (!res.body) throw new Error('Nessuno stream ricevuto')

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let text = ''
  let stopReason = null
  // Index of currently open content block, keyed by block index from SSE.
  const blocks = new Map() // index -> { type, name?, id?, jsonBuf? }

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    let nl
    while ((nl = buffer.indexOf('\n\n')) >= 0) {
      const event = buffer.slice(0, nl)
      buffer = buffer.slice(nl + 2)
      const dataLine = event.split('\n').find(l => l.startsWith('data: '))
      if (!dataLine) continue
      const data = dataLine.slice(6).trim()
      if (!data || data === '[DONE]') continue
      let obj
      try { obj = JSON.parse(data) } catch { continue }

      if (obj.type === 'content_block_start') {
        const cb = obj.content_block || {}
        blocks.set(obj.index, {
          type: cb.type,
          name: cb.name,
          id: cb.id,
          jsonBuf: cb.type === 'tool_use' ? '' : null,
        })
      } else if (obj.type === 'content_block_delta') {
        const cur = blocks.get(obj.index)
        if (!cur) continue
        if (obj.delta?.type === 'text_delta') {
          const t = obj.delta.text || ''
          if (t) {
            text += t
            onToken?.(t, text)
          }
        } else if (obj.delta?.type === 'input_json_delta') {
          cur.jsonBuf = (cur.jsonBuf || '') + (obj.delta.partial_json || '')
        }
      } else if (obj.type === 'content_block_stop') {
        // nothing to do; block completion is captured at message_delta time
      } else if (obj.type === 'message_delta') {
        if (obj.delta?.stop_reason) stopReason = obj.delta.stop_reason
      }
    }
  }

  // Materialize tool_use blocks with parsed inputs.
  const toolUses = []
  for (const [, b] of blocks) {
    if (b.type === 'tool_use') {
      let input = {}
      try { input = JSON.parse(b.jsonBuf || '{}') } catch { /* fall back to {} */ }
      toolUses.push({ id: b.id, name: b.name, input })
    }
  }
  return { text, toolUses, stopReason }
}

export async function analyzeMealImage({ image_base64, prompt }) {
  const j = await callCoachFn({ action: 'analyze-meal', image_base64, prompt })
  return parseJson(j.text || '')
}

// Rich photo analysis: returns the full ingredient breakdown JSON.
// Times out at 30s defensively — vision can be slow on big images.
export async function analyzeMealPhoto({ image_base64, prompt, signal }) {
  const ctrl = signal ? null : new AbortController()
  const timeoutId = ctrl ? setTimeout(() => ctrl.abort(), 30_000) : null
  try {
    const j = await callCoachFn(
      { action: 'analyze-meal-photo', image_base64, prompt },
      { signal: signal || ctrl?.signal },
    )
    return parseJson(j.text || '')
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
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
