# Physique · AI Coach

Personal body-recomp tracker — peso, pasti, allenamenti, AI coach in italiano.
Webapp + PWA installabile. Sync su tutti i device via Supabase.

Stack: **React 18 + Vite 6**, **Tailwind v4**, **Supabase** (Postgres + Auth + Realtime + Edge Functions), **Anthropic Claude** (`claude-sonnet-4-6` chat, `claude-haiku-4-5-20251001` vision) via Edge Function.

---

## 1. Setup Supabase

1. Crea un progetto su [supabase.com](https://supabase.com).
2. **Database** → SQL editor → incolla `supabase/migrations/0001_init.sql` ed esegui.
3. **Authentication** → Providers → abilita **Email** (Magic Link).
   - Una volta registrato te stesso, **disabilita signup** (`Disable email signups`) per uso personale.
4. **Settings → API**: copia `Project URL` e `anon public key`.

## 2. Setup local

```bash
cp .env.local.example .env.local
# inserisci VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

## 3. Edge Function (AI Coach)

Serve la chiave Anthropic mai esposta al client.

```bash
# una volta sola
npm i -g supabase
supabase login
supabase link --project-ref YOUR-PROJECT-REF

# imposta il segreto
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

# deploy
supabase functions deploy coach --no-verify-jwt=false
```

La function richiede il JWT dell'utente loggato (controllato server-side).

## 4. Login

Apri l'app, inserisci la tua email → ricevi un magic link → clicca → sei dentro.
La prima volta viene creato il profilo automaticamente.

## 5. Build & deploy

```bash
npm run build      # genera dist/
npx vercel --prod  # deploy su Vercel
```

In Vercel, aggiungi le variabili d'ambiente `VITE_SUPABASE_URL` e
`VITE_SUPABASE_ANON_KEY` (Project Settings → Environment Variables).

## 6. Installa come app sul telefono

- **iOS Safari**: Condividi → "Aggiungi alla schermata Home".
- **Android Chrome**: menu ⋮ → "Aggiungi a schermata Home" o "Installa app".

---

## Architettura

```
src/
├─ App.jsx                 — auth gate + 4-tab router
├─ pages/
│  ├─ Splash.jsx           — loading
│  ├─ Login.jsx            — magic link
│  ├─ Home.jsx             — peso, macros, oggi
│  ├─ Coach.jsx            — chat AI + foto pasto
│  ├─ Log.jsx              — timeline + add
│  └─ You.jsx              — profilo + settings
├─ components/
│  ├─ ui/                  — Card, Button, Input, Modal, NavBar, toast…
│  ├─ AddWeight.jsx
│  ├─ AddMeal.jsx
│  ├─ AddWorkout.jsx
│  ├─ ChatBubble.jsx
│  └─ TrendChart.jsx
├─ store/
│  └─ data.js              — Zustand store + realtime subscriptions
└─ lib/
   ├─ supabase.js          — client + auth helpers
   ├─ db.js                — fetch/add/delete wrappers
   ├─ ai.js                — chiama l'Edge Function
   ├─ met.js               — MET values + estimateCalories
   └─ prompts.js           — system prompts coach + analisi pasto

supabase/
├─ migrations/0001_init.sql — schema + RLS + trigger profilo + realtime
└─ functions/coach/index.ts — Edge Function (chat / analyze-meal / analyze-workout)
```

## Note

- L'`anon key` è **pubblica per design** — la sicurezza è data dalle policy RLS (ogni riga vincolata a `auth.uid() = user_id`).
- Per uso strettamente personale, dopo il primo signup disabilita `Email signups`.
- I dati vengono sincronizzati in tempo reale tra device (Supabase Realtime).
