import type { HabitoConDatos } from '../lib/useHabitos'
import { hoyISO } from '../lib/fechas'
import { inicioSemana, sumarDias, tocaEseDia } from '../lib/rachas'

const SEMANAS = 17
const FILAS = ['L', '', 'M', '', 'V', '', 'D']
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

/** Cuadrícula de las últimas 17 semanas: columnas = semanas, filas = lunes a domingo. */
export default function MapaCalor({ datos }: { datos: HabitoConDatos }) {
  const hoy = hoyISO()
  const primerLunes = sumarDias(inicioSemana(hoy), -7 * (SEMANAS - 1))
  const semanas = Array.from({ length: SEMANAS }, (_, i) => sumarDias(primerLunes, 7 * i))

  const clase = (dia: string) => {
    if (dia > hoy) return 'bg-transparent'
    const estado = datos.estados.get(dia)
    if (estado === 'completo') return 'bg-acento'
    if (estado === 'minimo') return 'bg-dia-hecho'
    if (datos.habito.frecuencia !== 'semanal' && !tocaEseDia(datos.habito, dia)) return 'bg-linea'
    return 'bg-pista'
  }

  const titulo = (dia: string) => {
    const estado = datos.estados.get(dia)
    return `${dia}: ${estado === 'completo' ? 'cumplido' : estado === 'minimo' ? 'mínimo' : 'sin registrar'}`
  }

  return (
    <div className="overflow-x-auto" role="img" aria-label={`Mapa de las últimas ${SEMANAS} semanas de ${datos.habito.nombre}`}>
      <div className="inline-flex gap-1">
        <div className="mr-1 flex flex-col gap-1 pt-5">
          {FILAS.map((f, i) => (
            <span key={i} className="h-3.5 text-[10.5px] leading-[14px] text-texto-suave">
              {f}
            </span>
          ))}
        </div>
        {semanas.map((lunes, i) => {
          const mes = Number(lunes.slice(5, 7)) - 1
          const cambiaMes = i === 0 || lunes.slice(5, 7) !== sumarDias(lunes, -7).slice(5, 7)
          return (
            <div key={lunes} className="flex flex-col gap-1">
              <span className="relative h-4 w-3.5">
                {cambiaMes && <span className="absolute left-0 top-0 whitespace-nowrap text-[10.5px] text-texto-suave">{MESES[mes]}</span>}
              </span>
              {Array.from({ length: 7 }, (_, d) => {
                const dia = sumarDias(lunes, d)
                return <span key={dia} title={titulo(dia)} className={`h-3.5 w-3.5 rounded-[3px] ${clase(dia)}`} />
              })}
            </div>
          )
        })}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-texto-suave">
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-[3px] bg-acento" />Cumplido</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-[3px] bg-dia-hecho" />Mínimo</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-[3px] bg-pista" />Sin registrar</span>
        {datos.habito.frecuencia === 'dias' && (
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-[3px] bg-linea" />No tocaba</span>
        )}
      </div>
    </div>
  )
}
