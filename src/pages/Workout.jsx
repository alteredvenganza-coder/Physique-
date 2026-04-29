import CountdownTimer from '../components/CountdownTimer'
import { Card } from '../components/ui'

export default function Workout() {
  return (
    <>
      <header className="px-5 pt-10 pb-3">
        <div className="label-caps">Workout · timer e tool</div>
        <h1 className="font-display font-extrabold text-[34px] tracking-[-0.03em] text-[var(--color-ink)] mt-1">
          Allenamento
        </h1>
      </header>

      <CountdownTimer
        title="Saltare la corda"
        subtitle="round singolo"
        presets={[60, 180, 300, 600]}
        defaultSeconds={180}
        storageKey="physique:timer:jumprope"
      />

      <Card className="mx-3 mt-3 mb-6 text-center py-5">
        <div className="text-2xl opacity-50">🛠️</div>
        <div className="label-caps mt-2">Altri timer in arrivo</div>
        <p className="text-[12px] text-[var(--color-ink-3)] mt-1 px-4">
          Plank, riposo tra serie, EMOM, tabata — chiedimi cosa vuoi e li aggiungo.
        </p>
      </Card>
    </>
  )
}
