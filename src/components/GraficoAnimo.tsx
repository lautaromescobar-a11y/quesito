import type { CheckinAnimo } from '../lib/db'
import { deISO } from '../lib/fechas'
import { sumarDias } from '../lib/rachas'

const ANCHO = 760
const ALTO = 240
const IZQ = 44
const DER = 16
const ARRIBA = 16
const ABAJO = 32

/** Líneas de ánimo y energía de los últimos `dias` días. Los días sin registro quedan como hueco. */
export default function GraficoAnimo({ checkins, hasta, dias = 30 }: { checkins: CheckinAnimo[]; hasta: string; dias?: number }) {
  const fechas = Array.from({ length: dias }, (_, i) => sumarDias(hasta, i - (dias - 1)))
  const porFecha = new Map(checkins.filter((c) => !c.borrado).map((c) => [c.fecha, c]))
  const x = (i: number) => IZQ + (i * (ANCHO - IZQ - DER)) / (dias - 1)
  const y = (v: number) => ARRIBA + ((5 - v) * (ALTO - ARRIBA - ABAJO)) / 4

  /** Tramos continuos: se corta la línea donde falta un día. */
  const tramos = (campo: 'animo' | 'energia') => {
    const res: string[] = []
    let actual: string[] = []
    fechas.forEach((f, i) => {
      const c = porFecha.get(f)
      if (c) actual.push(`${x(i)},${y(c[campo])}`)
      else if (actual.length) {
        res.push(actual.join(' '))
        actual = []
      }
    })
    if (actual.length) res.push(actual.join(' '))
    return res
  }

  const series = [
    { campo: 'animo' as const, nombre: 'Ánimo', color: 'var(--color-acento)', guiones: undefined },
    { campo: 'energia' as const, nombre: 'Energía', color: '#4F7BD1', guiones: '6 4' },
  ]

  return (
    <figure>
      <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="w-full" role="img" aria-label={`Ánimo y energía de los últimos ${dias} días`}>
        {[1, 2, 3, 4, 5].map((v) => (
          <g key={v}>
            <line x1={IZQ} x2={ANCHO - DER} y1={y(v)} y2={y(v)} stroke="var(--color-linea)" />
            <text x={IZQ - 10} y={y(v) + 4} textAnchor="end" fontSize="12" fill="var(--color-texto-suave)">{v}</text>
          </g>
        ))}
        {fechas.map((f, i) =>
          i % 5 === 0 || i === dias - 1 ? (
            <text key={f} x={x(i)} y={ALTO - 10} textAnchor="middle" fontSize="11.5" fill="var(--color-texto-suave)">
              {deISO(f).getDate()}/{deISO(f).getMonth() + 1}
            </text>
          ) : null,
        )}
        {series.map((s) => (
          <g key={s.campo}>
            {tramos(s.campo).map((pts, i) =>
              pts.includes(' ') ? <polyline key={i} points={pts} fill="none" stroke={s.color} strokeWidth="2.5" strokeDasharray={s.guiones} strokeLinejoin="round" /> : null,
            )}
            {fechas.map((f, i) => {
              const c = porFecha.get(f)
              return c ? <circle key={f} cx={x(i)} cy={y(c[s.campo])} r="4" fill={s.color}><title>{`${f} · ${s.nombre}: ${c[s.campo]}`}</title></circle> : null
            })}
          </g>
        ))}
      </svg>
      <figcaption className="mt-2 flex gap-5 text-sm text-texto-suave">
        <span className="flex items-center gap-2"><span className="h-1 w-6 rounded bg-acento" />Ánimo</span>
        <span className="flex items-center gap-2"><span className="h-0 w-6 border-t-[3px] border-dashed" style={{ borderColor: '#4F7BD1' }} />Energía</span>
      </figcaption>
    </figure>
  )
}
