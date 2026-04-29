// Edge Function: /functions/v1/coach
// Routes: { action: 'chat' | 'analyze-meal' | 'analyze-workout', stream?: boolean, ... }
// Auth: requires the caller's Supabase JWT in Authorization header.
// Secret: ANTHROPIC_API_KEY (set via Supabase secrets).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const CHAT_MODEL   = 'claude-sonnet-4-6'
const VISION_MODEL = 'claude-haiku-4-5-20251001'
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors },
  })
}

async function callAnthropic(payload: Record<string, unknown>) {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY missing on the server')

  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`Anthropic ${res.status}: ${txt}`)
  }
  return res
}

async function streamAnthropic(payload: Record<string, unknown>) {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY missing on the server')

  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Accept': 'text/event-stream',
    },
    body: JSON.stringify({ ...payload, stream: true }),
  })

  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`Anthropic ${res.status}: ${txt}`)
  }
  return res
}

function extractText(resp: { content?: Array<{ type: string; text?: string }> }) {
  return (resp.content || []).filter(c => c.type === 'text').map(c => c.text || '').join('')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST')    return json({ error: 'Method not allowed' }, 405)

  // ── Auth ────────────────────────────────────────────────────
  const authHeader = req.headers.get('Authorization') || ''
  if (!authHeader.startsWith('Bearer ')) return json({ error: 'Missing auth' }, 401)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const anonKey     = Deno.env.get('SUPABASE_ANON_KEY')!
  const sb = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: userData, error: userErr } = await sb.auth.getUser()
  if (userErr || !userData.user) return json({ error: 'Unauthorized' }, 401)

  // ── Body ────────────────────────────────────────────────────
  let body: any
  try { body = await req.json() } catch { return json({ error: 'Bad JSON' }, 400) }

  const action = body?.action

  try {
    if (action === 'chat') {
      const messages = Array.isArray(body.messages) ? body.messages : []
      const system   = String(body.system || '')
      const wantStream = body.stream === true

      const payload = {
        model: CHAT_MODEL,
        max_tokens: 1500,
        system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
        messages,
      }

      if (wantStream) {
        const upstream = await streamAnthropic(payload)
        // Pipe Anthropic SSE directly to the client. The client parses
        // content_block_delta events and surfaces text_delta tokens.
        return new Response(upstream.body, {
          status: 200,
          headers: {
            ...cors,
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no',
          },
        })
      }

      const res = await callAnthropic(payload)
      const j = await res.json()
      return json({ text: extractText(j) })
    }

    if (action === 'analyze-meal') {
      const image_base64 = String(body.image_base64 || '')
      const prompt       = String(body.prompt || 'Analizza questo pasto.')
      if (!image_base64) return json({ error: 'image_base64 required' }, 400)

      const res = await callAnthropic({
        model: VISION_MODEL,
        max_tokens: 600,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: image_base64 } },
            { type: 'text', text: prompt },
          ],
        }],
      })
      const j = await res.json()
      return json({ text: extractText(j) })
    }

    if (action === 'analyze-workout') {
      const text   = String(body.text || '')
      const prompt = String(body.prompt || '')
      const res = await callAnthropic({
        model: CHAT_MODEL,
        max_tokens: 1200,
        system: [{ type: 'text', text: prompt, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: text }],
      })
      const j = await res.json()
      return json({ text: extractText(j) })
    }

    return json({ error: `Unknown action: ${action}` }, 400)
  } catch (err) {
    return json({ error: (err as Error).message }, 500)
  }
})
