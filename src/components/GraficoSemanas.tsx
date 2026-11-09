import { deISO } from '../lib/fechas'

const ANCHO = 760
const ALTO = 220
const IZQ = 44
const DER = 12
const ARRIBA = 18
const ABAJO = 30

export interface Serie {
  nombre: string
  color: string
  valores: (number | null)[]
  guiones?: string
}

const etiquetaSemana = (lunes: string) => `${deISO(lunes).getDate()}/${deISO(lunes).getMonth() + 1}`

/**
 * Valores por semana. `tipo` barras para cantidades (una serie) o línea para promedios (una o más series).
 * Los huecos (null) cortan la línea o dejan la barra vacía.
 */
export default function GraficoSemanas({
  semanas,
  series,
  tipo,
  max,
  min = 0,
  unidad = '',
  descripcion,
}: {
  semanas: string[]
  series: Serie[]
  tipo: 'barras' | 'linea'
  max?: number
  min?: number
  unidad?: string
  descripcion: string
}) {
  const todos = series.flatMap((s) => s.valores).filter((v): v is number => v !== null)
  const tope = max ?? Math.max(1, ...todos) * 1.15
  const n = semanas.length
  const paso = (ANCHO - IZQ - DER) / n
  const x = (i: number) => IZQ + paso * i + paso / 2
  const y = (v: number) => ARRIBA + (1 - (v - min) / (tope - min)) * (ALTO - ARRIBA - ABAJO)
  const marcas = Array.from({ length: 5 }, (_, i) => min + ((tope - min) * i) / 4)
  const redondear = (v: number) => (tope - min <= 6 ? Math.round(v * 10) / 10 : Math.round(v))

  return (
    <figure>
      <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="w-full" role="img" aria-label={descripcion}>
        {marcas.map((m) => (
          <g key={m}>
            <line x1={IZQ} x2={ANCHO - DER} y1={y(m)} y2={y(m)} stroke="var(--color-linea)" />
            <text x={IZQ - 8} y={y(m) + 4} textAnchor="end" fontSize="11.5" fill="var(--color-texto-suave)">{redondear(m)}{unidad}</text>
          </g>
        ))}
        {semanas.map((s, i) =>
          n <= 8 || i % 2 === n % 2 || i === n - 1 ? (
            <text key={s} x={x(i)} y={ALTO - 9} textAnchor="middle" fontSize="11.5" fill="var(--color-texto-suave)">{etiquetaSemana(s)}</text>
          ) : null,
        )}
        {tipo === 'barras' &&
          series[0].valores.map((v, i) =>
            v === null ? null : (
              <g key={i}>
                <rect x={x(i) - paso * 0.32} y={y(v)} width={paso * 0.64} height={Math.max(0, y(min) - y(v))} rx="4" fill={i === n - 1 ? series[0].color : `color-mix(in srgb, ${series[0].color} 55%, var(--color-superficie))`}>
                  <title>{`Semana del ${etiquetaSemana(semanas[i])}: ${v}${unidad}`}</title>
                </rect>
              </g>
            ),
          )}
        {tipo === 'linea' &&
          series.map((s) => {
            const tramos: string[][] = [[]]
            s.valores.forEach((v, i) => (v === null ? tramos.push([]) : tramos[tramos.length - 1].push(`${x(i)},${y(v)}`)))
            return (
              <g key={s.nombre}>
                {tramos.filter((t) => t.length > 1).map((t, i) => (
                  <polyline key={i} points={t.join(' ')} fill="none" stroke={s.color} strokeWidth="2.5" strokeDasharray={s.guiones} strokeLinejoin="round" />
                ))}
                {s.valores.map((v, i) =>
                  v === null ? null : (
                    <circle key={i} cx={x(i)} cy={y(v)} r="4" fill={s.color}>
                      <title>{`${s.nombre}, semana del ${etiquetaSemana(semanas[i])}: ${v}${unidad}`}</title>
                    </circle>
                  ),
                )}
              </g>
            )
          })}
      </svg>
      {series.length > 1 && (
        <figcaption className="mt-1 flex gap-5 text-sm text-texto-suave">
          {series.map((s) => (
            <span key={s.nombre} className="flex items-center gap-2">
              <span className="w-6 border-t-[3px]" style={{ borderColor: s.color, borderStyle: s.guiones ? 'dashed' : 'solid' }} />
              {s.nombre}
            </span>
          ))}
        </figcaption>
      )}
    </figure>
  )
}
