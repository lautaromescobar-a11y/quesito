import { useState } from 'react'
import FormularioEvento from '../../components/FormularioEvento'
import FormularioTarea from '../../components/FormularioTarea'
import { botonChico, botonPrincipal, MarcaGoogle } from '../../components/ui'
import { ocurrencias } from '../../lib/agenda'
import { fondoSuave } from '../../lib/colores'
import type { Evento, Tarea } from '../../lib/db'
import { aISO, deISO, hoyISO, nombreMes } from '../../lib/fechas'
import { inicioSemana, sumarDias } from '../../lib/rachas'
import type { DatosAgenda } from '../../lib/useAgenda'

type Abierto = { tipo: 'evento'; fecha: string; evento?: Evento } | { tipo: 'tarea'; tarea: Tarea } | null

export default function VistaMes({ datos, fecha, alCambiarFecha, alVerSemana }: { datos: DatosAgenda; fecha: string; alCambiarFecha: (f: string) => void; alVerSemana: (f: string) => void }) {
  const [abierto, setAbierto] = useState<Abierto>(null)
  const hoy = hoyISO()
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
      <p className="text-sm text-texto-suave">El mes muestra eventos y tareas con fecha. Tu rutina de todos los días está en la vista Semana.</p>

      {abierto?.tipo === 'evento' && <FormularioEvento evento={abierto.evento} fecha={abierto.fecha} alCerrar={() => setAbierto(null)} />}
      {abierto?.tipo === 'tarea' && <FormularioTarea tarea={abierto.tarea} alCerrar={() => setAbierto(null)} />}
    </div>
  )
}
