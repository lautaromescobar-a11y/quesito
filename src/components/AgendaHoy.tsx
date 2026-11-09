import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { foco } from '../lib/foco'
import { aMin, tareasProximas } from '../lib/agenda'
import { fondoSuave } from '../lib/colores'
import { fechaRelativa, hoyISO } from '../lib/fechas'
import { sumarDias } from '../lib/rachas'
import { cambiarTarea } from '../lib/rutinaDb'
import { agendaDelDia, useDatosAgenda } from '../lib/useAgenda'
import Tarjeta from './Tarjeta'

/** Tarjetas de Hoy: la rutina del día (con el bloque actual marcado) y las tareas que vencen pronto. */
export default function AgendaHoy() {
  const datos = useDatosAgenda()
  const navegar = useNavigate()
  const [ahora, setAhora] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setAhora(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  if (!datos) return null
  const hoy = hoyISO()
  const dia = agendaDelDia(datos, hoy)
  const min = ahora.getHours() * 60 + ahora.getMinutes()
  const proximas = tareasProximas(datos.tareas, sumarDias(hoy, 7))

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Tarjeta>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">Rutina del día</h2>
          <Link to="/rutina" className="text-sm font-medium text-acento">Ver semana</Link>
        </div>
        {dia.todoElDia.map((e) => (
          <p key={e.id} className="mb-2 rounded-lg border border-dashed px-3 py-1.5 text-sm font-medium" style={{ background: fondoSuave(e.color), borderColor: e.color }}>
            {e.titulo}
          </p>
        ))}
        {dia.items.length === 0 ? (
          <p className="text-sm text-texto-suave">
            Hoy no hay bloques. {!dia.plantilla && 'Tampoco hay una plantilla vigente para esta fecha.'}
          </p>
        ) : (
          <ol>
            {dia.items.map((it) => {
              const enCurso = aMin(it.inicio) <= min && min < aMin(it.fin)
              const pasado = aMin(it.fin) <= min
              return (
                <li key={it.clave} className={`flex items-center gap-3 border-b border-linea py-2.5 last:border-0 ${pasado ? 'opacity-55' : ''}`}>
                  <span className="w-24 shrink-0 text-[13px] tabular-nums text-texto-suave">
                    {it.inicio} – {it.fin}
                  </span>
                  <span className="h-5 w-1 shrink-0 rounded-full" style={{ background: it.color }} aria-hidden />
                  <span className={`flex-1 text-[15px] ${enCurso ? 'font-semibold' : ''}`}>
                    {it.titulo}
                    {it.modificado && <span className="ml-1 text-texto-suave" title="Cambiado solo hoy">✱</span>}
                  </span>
                  {enCurso && <span className="rounded-full bg-acento px-2 py-0.5 text-xs font-semibold text-sobre-acento">Ahora</span>}
                  {!pasado && it.tipo === 'rutina' && (
                    <button
                      type="button"
                      className="rounded-lg border border-borde px-2 py-1 text-xs hover:border-acento hover:bg-acento-suave"
                      onClick={() => {
                        foco.vincular({ tipo: 'bloque', id: it.bloqueId ?? it.clave, titulo: it.titulo })
                        navegar('/foco')
                      }}
                      aria-label={`Enfocarme en ${it.titulo}`}
                    >
                      Enfocarme
                    </button>
                  )}
                </li>
              )
            })}
          </ol>
        )}
      </Tarjeta>

      <Tarjeta>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">Vence pronto</h2>
          <Link to="/tareas" className="text-sm font-medium text-acento">Ver tareas</Link>
        </div>
        {proximas.length === 0 ? (
          <p className="text-sm text-texto-suave">Nada vence en los próximos 7 días.</p>
        ) : (
          <ul>
            {proximas.map((t) => (
              <li key={t.id} className="flex items-center gap-3 border-b border-linea py-2.5 last:border-0">
                <input
                  type="checkbox"
                  onChange={() => cambiarTarea(t.id, { estado: 'hecha' })}
                  aria-label={`Marcar como hecha: ${t.titulo}`}
                  className="h-5 w-5 shrink-0 accent-[var(--color-acento)]"
                />
                <span className="flex-1 text-[15px]">{t.titulo}</span>
                <span className={`text-sm ${t.fechaLimite! < hoy ? 'font-semibold text-red-700 dark:text-red-300' : 'text-texto-suave'}`}>{fechaRelativa(t.fechaLimite!)}</span>
              </li>
            ))}
          </ul>
        )}
      </Tarjeta>
    </div>
  )
}
