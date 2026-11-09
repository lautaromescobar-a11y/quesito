import { useState } from 'react'
import { useCelular } from '../../lib/useCelular'
import FormularioEvento from '../../components/FormularioEvento'
import FormularioTarea from '../../components/FormularioTarea'
import { botonChico, botonPrincipal, MarcaGoogle } from '../../components/ui'
import { ocurrencias } from '../../lib/agenda'
import { fondoSuave } from '../../lib/colores'
import type { Evento, Tarea } from '../../lib/db'
import { aISO, deISO, fechaLarga, hoyISO, nombreMes } from '../../lib/fechas'
import { inicioSemana, sumarDias } from '../../lib/rachas'
import type { DatosAgenda } from '../../lib/useAgenda'

type Abierto = { tipo: 'evento'; fecha: string; evento?: Evento } | { tipo: 'tarea'; tarea: Tarea } | null

export default function VistaMes({ datos, fecha, alCambiarFecha, alVerSemana }: { datos: DatosAgenda; fecha: string; alCambiarFecha: (f: string) => void; alVerSemana: (f: string) => void }) {
  const [abierto, setAbierto] = useState<Abierto>(null)
  const celular = useCelular()
  const hoy = hoyISO()
  const [diaCel, setDiaCel] = useState<string | null>(null)
  const primero = fecha.slice(0, 8) + '01'
  const d = deISO(primero)
  const ultimo = aISO(new Date(d.getFullYear(), d.getMonth() + 1, 0, 12))
  const inicio = inicioSemana(primero)
  const semanas = Math.ceil((Math.round((deISO(ultimo).getTime() - deISO(inicio).getTime()) / 86_400_000) + 1) / 7)
  const celdas = Array.from({ length: semanas * 7 }, (_, i) => sumarDias(inicio, i))

  const eventosPorDia = new Map<string, Evento[]>()
  for (const e of datos.eventos) {
    for (const f of ocurrencias(e, celdas[0], celdas[celdas.length - 1])) eventosPorDia.set(f, [...(eventosPorDia.get(f) ?? []), e])
  }
  const mesAnterior = sumarDias(primero, -1).slice(0, 8) + '01'
  const mesSiguiente = sumarDias(ultimo, 1)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={botonChico} onClick={() => alCambiarFecha(mesAnterior)} aria-label="Mes anterior">←</button>
          <button type="button" className={botonChico} onClick={() => alCambiarFecha(hoy)}>Este mes</button>
          <button type="button" className={botonChico} onClick={() => alCambiarFecha(mesSiguiente)} aria-label="Mes siguiente">→</button>
          <h2 className="ml-2 text-lg font-semibold capitalize">{nombreMes(d.getMonth() + 1)} {d.getFullYear()}</h2>
        </div>
        <button type="button" className={botonPrincipal} onClick={() => setAbierto({ tipo: 'evento', fecha: fecha.slice(0, 7) === hoy.slice(0, 7) ? hoy : primero })}>Nuevo evento</button>
      </div>

      {celular ? (
        <MesCelular celdas={celdas} primero={primero} hoy={hoy} eventosPorDia={eventosPorDia} tareas={datos.tareas} elegido={diaCel ?? (fecha.slice(0, 7) === hoy.slice(0, 7) ? hoy : primero)} alElegir={setDiaCel} alAbrir={setAbierto} alVerSemana={alVerSemana} />
      ) : (
      <div className="overflow-x-auto rounded-[20px] bg-superficie p-4">
        <div className="grid min-w-[760px] grid-cols-7 border-l border-t border-linea">
          {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((n) => (
            <div key={n} className="border-b border-r border-linea py-2 text-center text-sm font-semibold text-texto-suave">{n}</div>
          ))}
          {celdas.map((f) => {
            const delMes = f.slice(0, 7) === primero.slice(0, 7)
            const tareas = datos.tareas.filter((t) => t.fechaLimite === f && t.estado !== 'hecha')
            return (
              <div key={f} className={`flex min-h-28 flex-col gap-1 border-b border-r border-linea p-1.5 ${delMes ? '' : 'opacity-45'} ${f === hoy ? 'bg-acento-suave/50' : ''}`}>
                <div className="flex items-center justify-between">
                  <button type="button" onClick={() => alVerSemana(f)} title="Ver esa semana" className={`flex h-7 min-w-7 items-center justify-center rounded-full px-1 text-sm hover:bg-acento-suave ${f === hoy ? 'bg-acento font-semibold text-sobre-acento hover:bg-acento' : ''}`}>
                    {deISO(f).getDate()}
                  </button>
                  <button type="button" onClick={() => setAbierto({ tipo: 'evento', fecha: f })} aria-label={`Agregar evento el ${f}`} className="h-7 w-7 rounded-full text-texto-suave hover:bg-acento-suave hover:text-texto">+</button>
                </div>
                {(eventosPorDia.get(f) ?? []).map((e) => (
                  <button key={e.id} type="button" onClick={() => setAbierto({ tipo: 'evento', fecha: f, evento: e })} className="truncate rounded-md border-l-4 px-1.5 py-0.5 text-left text-[12px]" style={{ background: fondoSuave(e.color), borderColor: e.color }}>
                    {e.origen === 'google' && <MarcaGoogle />}
                    {e.inicio && <span className="tabular-nums text-texto-suave">{e.inicio} </span>}
                    {e.titulo}
                  </button>
                ))}
                {tareas.map((t) => (
                  <button key={t.id} type="button" onClick={() => setAbierto({ tipo: 'tarea', tarea: t })} className="truncate rounded-md bg-pista px-1.5 py-0.5 text-left text-[12px]">
                    ☐ {t.titulo}
                  </button>
                ))}
              </div>
            )
          })}
        </div>
      </div>
      )}
      <p className="text-sm text-texto-suave">El mes muestra eventos y tareas con fecha. Tu rutina de todos los días está en la vista Semana.</p>

      {abierto?.tipo === 'evento' && <FormularioEvento evento={abierto.evento} fecha={abierto.fecha} alCerrar={() => setAbierto(null)} />}
      {abierto?.tipo === 'tarea' && <FormularioTarea tarea={abierto.tarea} alCerrar={() => setAbierto(null)} />}
    </div>
  )
}

/** En el celular: el mes con puntitos por día y, abajo, la lista del día elegido. */
function MesCelular({
  celdas,
  primero,
  hoy,
  eventosPorDia,
  tareas,
  elegido,
  alElegir,
  alAbrir,
  alVerSemana,
}: {
  celdas: string[]
  primero: string
  hoy: string
  eventosPorDia: Map<string, Evento[]>
  tareas: Tarea[]
  elegido: string
  alElegir: (f: string) => void
  alAbrir: (a: Abierto) => void
  alVerSemana: (f: string) => void
}) {
  const tareasDe = (f: string) => tareas.filter((t) => t.fechaLimite === f && t.estado !== 'hecha')
  const evs = eventosPorDia.get(elegido) ?? []
  const tas = tareasDe(elegido)
  return (
    <>
      <div className="rounded-[20px] bg-superficie p-3">
        <div className="grid grid-cols-7">
          {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((n, i) => (
            <div key={i} className="py-1 text-center text-xs font-semibold text-texto-suave">{n}</div>
          ))}
          {celdas.map((f) => {
            const delMes = f.slice(0, 7) === primero.slice(0, 7)
            const colores = [...(eventosPorDia.get(f) ?? []).map((e) => e.color), ...tareasDe(f).map(() => 'var(--color-texto-suave)')].slice(0, 3)
            const sel = f === elegido
            return (
              <button
                key={f}
                type="button"
                onClick={() => alElegir(f)}
                aria-pressed={sel}
                aria-label={`Día ${deISO(f).getDate()}`}
                className={`flex h-12 flex-col items-center justify-center gap-1 rounded-xl text-[15px] ${delMes ? '' : 'opacity-40'} ${sel ? 'bg-acento font-semibold text-sobre-acento' : f === hoy ? 'font-bold text-acento' : ''}`}
              >
                {deISO(f).getDate()}
                <span className="flex h-1.5 gap-0.5" aria-hidden>
                  {colores.map((c, i) => (
                    <span key={i} className="h-1.5 w-1.5 rounded-full" style={{ background: sel ? 'var(--color-sobre-acento)' : c }} />
                  ))}
                </span>
              </button>
            )
          })}
        </div>
      </div>
      <section className="rounded-[20px] bg-superficie p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="font-semibold">{fechaLarga(deISO(elegido))}</h3>
          <button type="button" className="text-sm font-medium text-acento" onClick={() => alVerSemana(elegido)}>Ver semana</button>
        </div>
        {evs.length + tas.length === 0 && <p className="text-sm text-texto-suave">Sin eventos ni tareas.</p>}
        <ul className="space-y-1.5">
          {evs.map((e) => (
            <li key={e.id}>
              <button type="button" onClick={() => alAbrir({ tipo: 'evento', fecha: elegido, evento: e })} className="flex w-full items-center gap-2 rounded-lg border-l-4 px-3 py-2 text-left text-[15px]" style={{ background: fondoSuave(e.color), borderColor: e.color }}>
                <span className="w-24 shrink-0 text-sm tabular-nums text-texto-suave">{e.inicio ? `${e.inicio}–${e.fin}` : 'Todo el día'}</span>
                <span className="min-w-0 truncate">
                  {e.origen === 'google' && <MarcaGoogle />}
                  {e.titulo}
                </span>
              </button>
            </li>
          ))}
          {tas.map((t) => (
            <li key={t.id}>
              <button type="button" onClick={() => alAbrir({ tipo: 'tarea', tarea: t })} className="flex w-full items-center gap-2 rounded-lg bg-pista px-3 py-2 text-left text-[15px]">
                <span className="w-24 shrink-0 text-sm text-texto-suave">Tarea</span>
                <span className="min-w-0 truncate">{t.titulo}</span>
              </button>
            </li>
          ))}
        </ul>
        <button type="button" className={`${botonChico} mt-3`} onClick={() => alAbrir({ tipo: 'evento', fecha: elegido })}>+ Evento este día</button>
      </section>
    </>
  )
}
