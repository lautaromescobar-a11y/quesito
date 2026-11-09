import { MarcaGoogle } from './ui'
import type { ReactNode } from 'react'
import { aMin, solapados, type ItemAgenda } from '../lib/agenda'
import { fondoSuave } from '../lib/colores'

export interface ColumnaGrilla {
  clave: string
  titulo: string
  subtitulo?: string
  esHoy?: boolean
  items: ItemAgenda[]
  /** Fila de arriba: eventos de todo el día y tareas que vencen. */
  arriba?: ReactNode
}

const ALTO_HORA = 44

/** Reparte los ítems que se pisan en carriles, para mostrarlos lado a lado. */
function carriles(items: ItemAgenda[]) {
  const pisados = solapados(items)
  const fines: number[] = []
  const lugar = new Map<string, number>()
  for (const it of [...items].sort((a, b) => aMin(a.inicio) - aMin(b.inicio))) {
    if (!pisados.has(it.clave)) continue
    let carril = fines.findIndex((f) => f <= aMin(it.inicio))
    if (carril === -1) carril = fines.length
    fines[carril] = aMin(it.fin)
    lugar.set(it.clave, carril)
  }
  return { lugar, total: Math.max(1, fines.length) }
}

export default function GrillaSemana({
  columnas,
  alNuevo,
  alAbrir,
  horaActual,
}: {
  columnas: ColumnaGrilla[]
  alNuevo: (columna: number, hora: string) => void
  alAbrir: (columna: number, item: ItemAgenda) => void
  /** Minutos desde la medianoche, para la línea de "ahora" en la columna de hoy. */
  horaActual?: number
}) {
  const todos = columnas.flatMap((c) => c.items)
  const desde = Math.min(6, ...todos.map((i) => Math.floor(aMin(i.inicio) / 60)))
  const hasta = Math.max(24, ...todos.map((i) => Math.ceil(aMin(i.fin) / 60)))
  const horas = Array.from({ length: hasta - desde }, (_, i) => desde + i)
  const alto = horas.length * ALTO_HORA
  const hayArriba = columnas.some((c) => c.arriba)

  return (
    <div className="overflow-x-auto rounded-[20px] bg-superficie p-4">
      <div className="grid min-w-[860px]" style={{ gridTemplateColumns: `52px repeat(${columnas.length}, minmax(0, 1fr))` }}>
        {/* Encabezados */}
        <div />
        {columnas.map((c) => (
          <div key={c.clave} className="px-1 pb-2 text-center">
            <p className={`text-sm font-semibold ${c.esHoy ? 'text-acento' : ''}`}>{c.titulo}</p>
            {c.subtitulo && (
              <p className={`text-xs ${c.esHoy ? 'font-semibold text-acento' : 'text-texto-suave'}`}>{c.subtitulo}</p>
            )}
          </div>
        ))}

        {hayArriba && (
          <>
            <div className="border-t border-linea py-1.5 pr-2 text-right text-[10.5px] leading-tight text-texto-suave">Todo el día</div>
            {columnas.map((c) => (
              <div key={c.clave} className="flex min-h-9 flex-col gap-1 border-t border-l border-linea p-1">
                {c.arriba}
              </div>
            ))}
          </>
        )}

        {/* Columna de horas */}
        <div className="relative border-t border-linea" style={{ height: alto }}>
          {horas.map((h, i) => (
            <span key={h} className="absolute right-2 -translate-y-1/2 text-[11px] tabular-nums text-texto-suave" style={{ top: i * ALTO_HORA }}>
              {i === 0 ? '' : `${String(h).padStart(2, '0')}:00`}
            </span>
          ))}
        </div>

        {/* Días */}
        {columnas.map((c, ci) => {
          const { lugar, total } = carriles(c.items)
          const chocan = solapados(c.items.filter((i) => i.tipo === 'rutina'))
          return (
            <div key={c.clave} className={`relative border-t border-l border-linea ${c.esHoy ? 'bg-acento-suave/40' : ''}`} style={{ height: alto }}>
              {horas.map((h, i) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => alNuevo(ci, `${String(h).padStart(2, '0')}:00`)}
                  aria-label={`Agregar bloque el ${c.titulo} a las ${h}:00`}
                  className="absolute inset-x-0 border-b border-linea hover:bg-acento-suave/60"
                  style={{ top: i * ALTO_HORA, height: ALTO_HORA }}
                />
              ))}

              {c.items.map((it) => {
                const top = ((aMin(it.inicio) - desde * 60) / 60) * ALTO_HORA
                const h = Math.max(18, ((aMin(it.fin) - aMin(it.inicio)) / 60) * ALTO_HORA - 2)
                const carril = lugar.get(it.clave)
                const ancho = carril === undefined ? 100 : 100 / total
                const izq = carril === undefined ? 0 : carril * ancho
                return (
                  <button
                    key={it.clave}
                    type="button"
                    onClick={() => alAbrir(ci, it)}
                    title={`${it.titulo} · ${it.inicio}–${it.fin}${it.modificado ? ' · cambiado solo este día' : ''}`}
                    className={`absolute overflow-hidden rounded-lg px-2 py-1 text-left text-texto transition-shadow hover:shadow-md ${
                      it.tipo === 'evento' ? 'border-2 border-dashed' : 'border-l-4'
                    } ${chocan.has(it.clave) ? 'ring-1 ring-red-400' : ''}`}
                    style={{
                      top: top + 1,
                      height: h,
                      left: `calc(${izq}% + 3px)`,
                      width: `calc(${ancho}% - 6px)`,
                      background: fondoSuave(it.color),
                      borderColor: it.color,
                    }}
                  >
                    <span className="block truncate text-[12.5px] font-semibold leading-tight">
                      {it.modificado && <span aria-label="Cambiado solo este día">✱ </span>}
                      {it.google && <MarcaGoogle />}
                      {it.titulo}
                    </span>
                    {h >= 34 && (
                      <span className="block truncate text-[11px] tabular-nums text-texto-suave">
                        {it.inicio}–{it.fin}
                      </span>
                    )}
                  </button>
                )
              })}

              {c.esHoy && horaActual !== undefined && horaActual >= desde * 60 && horaActual <= hasta * 60 && (
                <div className="pointer-events-none absolute inset-x-0 h-0.5 bg-red-500" style={{ top: ((horaActual - desde * 60) / 60) * ALTO_HORA }} aria-hidden>
                  <span className="absolute -left-1 -top-1 h-2.5 w-2.5 rounded-full bg-red-500" />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
