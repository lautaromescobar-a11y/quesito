import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ElegirPlantillaSemana from '../../components/ElegirPlantillaSemana'
import FormularioBloque from '../../components/FormularioBloque'
import FormularioEvento from '../../components/FormularioEvento'
import FormularioTarea from '../../components/FormularioTarea'
import GrillaSemana from '../../components/GrillaSemana'
import { botonChico, botonPrincipal, botonSecundario } from '../../components/ui'
import { actividadesGuardadas, type ItemAgenda } from '../../lib/agenda'
import { fondoSuave } from '../../lib/colores'
import type { DiaSemana, Evento, Tarea } from '../../lib/db'
import { deISO, fechaCorta, hoyISO, nombreMes } from '../../lib/fechas'
import { inicioSemana, sumarDias } from '../../lib/rachas'
import { agendaDelDia, type DatosAgenda } from '../../lib/useAgenda'

const DIAS_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

type Abierto =
  | { tipo: 'bloque'; fecha: string; item?: ItemAgenda; hora?: string }
  | { tipo: 'evento'; fecha: string; evento?: Evento }
  | { tipo: 'tarea'; tarea: Tarea }
  | { tipo: 'plantilla' }
  | null

function textoSemana(lunes: string) {
  const a = deISO(lunes)
  const b = deISO(sumarDias(lunes, 6))
  const mesA = nombreMes(a.getMonth() + 1)
  const mesB = nombreMes(b.getMonth() + 1)
  return mesA === mesB ? `${a.getDate()} al ${b.getDate()} de ${mesB}` : `${a.getDate()} de ${mesA} al ${b.getDate()} de ${mesB}`
}

export default function VistaSemana({ datos, fecha, alCambiarFecha }: { datos: DatosAgenda; fecha: string; alCambiarFecha: (f: string) => void }) {
  const [abierto, setAbierto] = useState<Abierto>(null)
  const [ahora, setAhora] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setAhora(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  const hoy = hoyISO()
  const lunes = inicioSemana(fecha)
  const dias = Array.from({ length: 7 }, (_, i) => agendaDelDia(datos, sumarDias(lunes, i)))
  const plantilla = dias[0].plantilla
  const uso = dias[0].uso
  const bloquesPorPlantilla = new Map<string, number>()
  for (const b of datos.bloques) bloquesPorPlantilla.set(b.plantillaId, (bloquesPorPlantilla.get(b.plantillaId) ?? 0) + 1)
  const vacia = plantilla && !bloquesPorPlantilla.get(plantilla.id)
  const cambiosSemana = dias.reduce((n, d) => n + d.items.filter((i) => i.modificado).length, 0) + datos.cambios.filter((c) => c.accion === 'quitar' && c.fecha >= lunes && c.fecha <= sumarDias(lunes, 6)).length

  const columnas = dias.map((d) => ({
    clave: d.fecha,
    titulo: DIAS_CORTOS[deISO(d.fecha).getDay()],
    subtitulo: String(deISO(d.fecha).getDate()),
    esHoy: d.fecha === hoy,
    items: d.items,
    arriba:
      d.todoElDia.length + d.tareas.length > 0 ? (
        <>
          {d.todoElDia.map((e) => (
            <button key={e.id} type="button" onClick={() => setAbierto({ tipo: 'evento', fecha: d.fecha, evento: e })} className="truncate rounded-md border border-dashed px-1.5 py-0.5 text-left text-[11.5px] font-medium" style={{ background: fondoSuave(e.color), borderColor: e.color }}>
              {e.titulo}
            </button>
          ))}
          {d.tareas.map((t) => (
            <button key={t.id} type="button" onClick={() => setAbierto({ tipo: 'tarea', tarea: t })} className="truncate rounded-md bg-pista px-1.5 py-0.5 text-left text-[11.5px]">
              ☐ {t.titulo}
            </button>
          ))}
        </>
      ) : undefined,
  }))

  const abrirItem = (col: number, it: ItemAgenda) => {
    const f = dias[col].fecha
    if (it.tipo === 'evento') setAbierto({ tipo: 'evento', fecha: f, evento: datos.eventos.find((e) => e.id === it.eventoId) })
    else setAbierto({ tipo: 'bloque', fecha: f, item: it })
  }

  const diaAbierto = abierto && abierto.tipo === 'bloque' ? dias.find((d) => d.fecha === abierto.fecha)! : null

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={botonChico} onClick={() => alCambiarFecha(sumarDias(lunes, -7))} aria-label="Semana anterior">←</button>
          <button type="button" className={botonChico} onClick={() => alCambiarFecha(hoy)}>Esta semana</button>
          <button type="button" className={botonChico} onClick={() => alCambiarFecha(sumarDias(lunes, 7))} aria-label="Semana siguiente">→</button>
          <h2 className="ml-2 text-lg font-semibold">Semana del {textoSemana(lunes)}</h2>
        </div>
        <div className="flex gap-2">
          <button type="button" className={botonSecundario} onClick={() => setAbierto({ tipo: 'evento', fecha: fecha < lunes || fecha > sumarDias(lunes, 6) ? lunes : fecha })}>Nuevo evento</button>
          <button type="button" className={botonPrincipal} onClick={() => setAbierto({ tipo: 'bloque', fecha: lunes <= hoy && hoy <= sumarDias(lunes, 6) ? hoy : lunes })}>Nuevo bloque</button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl bg-superficie px-5 py-3">
        <span className="text-sm text-texto-suave">Plantilla de esta semana:</span>
        <span className="font-semibold">{plantilla ? plantilla.nombre : 'Semana libre'}</span>
        {uso && (
          <span className="rounded-full bg-acento-suave px-2.5 py-0.5 text-xs font-medium text-acento-fuerte">
            {uso.tipo === 'semana' ? 'Solo esta semana' : `Desde ${fechaCorta(uso.desde)}`}
          </span>
        )}
        <button type="button" className={`${botonChico} ml-1`} onClick={() => setAbierto({ tipo: 'plantilla' })}>
          Cambiar plantilla
        </button>
        {plantilla && (
          <Link to={`/plantillas?id=${plantilla.id}`} className="text-sm font-medium text-acento underline-offset-4 hover:underline">
            Editar plantilla
          </Link>
        )}
        <span className="ml-auto text-xs text-texto-suave">
          {cambiosSemana > 0 && `${cambiosSemana} ${cambiosSemana === 1 ? 'cambio' : 'cambios'} solo de esta semana (✱) · `}
          Tocá un espacio vacío para agregar un bloque
        </span>
      </div>

      {vacia && (
        <p role="status" className="rounded-2xl bg-amber-50 px-5 py-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          "{plantilla.nombre}" todavía no tiene bloques, por eso la semana está vacía. Podés{' '}
          <Link to={`/plantillas?id=${plantilla.id}`} className="font-semibold underline">cargarle bloques</Link> o{' '}
          <button type="button" className="font-semibold underline" onClick={() => setAbierto({ tipo: 'plantilla' })}>usar otra plantilla</button>.
        </p>
      )}

      <GrillaSemana
        columnas={columnas}
        alNuevo={(col, hora) => setAbierto({ tipo: 'bloque', fecha: dias[col].fecha, hora })}
        alAbrir={abrirItem}
        horaActual={ahora.getHours() * 60 + ahora.getMinutes()}
      />

      {abierto?.tipo === 'bloque' && diaAbierto && (
        <FormularioBloque
          contexto={{ modo: 'fecha', fecha: abierto.fecha, dia: deISO(abierto.fecha).getDay() as DiaSemana, plantillaId: diaAbierto.plantilla?.id ?? null }}
          item={abierto.item}
          inicioSugerido={abierto.hora}
          hermanosDe={(x) => (dias.find((dd) => deISO(dd.fecha).getDay() === x)?.items ?? []).filter((i) => i.tipo === 'rutina')}
          actividades={actividadesGuardadas(datos.bloques, datos.cambios)}
          alCerrar={() => setAbierto(null)}
        />
      )}
      {abierto?.tipo === 'evento' && <FormularioEvento evento={abierto.evento} fecha={abierto.fecha} alCerrar={() => setAbierto(null)} />}
      {abierto?.tipo === 'tarea' && <FormularioTarea tarea={abierto.tarea} alCerrar={() => setAbierto(null)} />}
      {abierto?.tipo === 'plantilla' && (
        <ElegirPlantillaSemana fecha={lunes} plantillas={datos.plantillas} bloquesPorPlantilla={bloquesPorPlantilla} actual={plantilla} uso={uso} alCerrar={() => setAbierto(null)} />
      )}
    </div>
  )
}
