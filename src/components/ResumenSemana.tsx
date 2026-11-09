import type { ResumenSemana as Resumen } from '../lib/estadisticas'

function Dato({ titulo, valor, detalle }: { titulo: string; valor: string; detalle?: string }) {
  return (
    <div className="rounded-2xl bg-fondo px-4 py-3">
      <p className="text-xs text-texto-suave">{titulo}</p>
      <p className="text-2xl font-semibold tabular-nums">{valor}</p>
      {detalle && <p className="text-xs text-texto-suave">{detalle}</p>}
    </div>
  )
}

/** Números de una semana: hábitos, ánimo, foco, tareas y diario. */
export default function ResumenSemana({ r }: { r: Resumen }) {
  const horas = Math.floor(r.minutosFoco / 60)
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Dato titulo="Hábitos" valor={r.total.porcentaje === null ? '–' : `${r.total.porcentaje}%`} detalle={`${r.total.hechos} de ${r.total.esperados}`} />
        <Dato titulo="Ánimo" valor={r.animo === null ? '–' : `${r.animo}/5`} detalle={`Energía ${r.energia ?? '–'} · ${r.diasAnimo} días`} />
        <Dato titulo="Foco" valor={horas ? `${horas} h ${r.minutosFoco % 60} min` : `${r.minutosFoco} min`} detalle={`${r.sesionesFoco} sesiones`} />
        <Dato titulo="Tareas hechas" valor={String(r.tareasHechas)} />
        <Dato titulo="Diario" valor={String(r.entradasDiario)} detalle={r.entradasDiario === 1 ? 'entrada' : 'entradas'} />
      </div>
      {r.habitos.length > 0 && (
        <ul className="space-y-2">
          {r.habitos.map((h) => {
            const p = h.cumplimiento.porcentaje
            return (
              <li key={h.nombre} className="flex items-center gap-3 text-sm">
                <span className="w-32 truncate">{h.nombre}</span>
                <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-pista" aria-hidden>
                  <span className="block h-2.5 rounded-full bg-acento" style={{ width: `${p ?? 0}%` }} />
                </span>
                <span className="w-24 text-right tabular-nums text-texto-suave">
                  {p === null ? 'sin datos' : `${h.cumplimiento.hechos}/${h.cumplimiento.esperados} · ${p}%`}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
