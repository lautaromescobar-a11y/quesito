import { useState } from 'react'
import { aMin, deMin, solapados, type Actividad, type ItemAgenda } from '../lib/agenda'
import { COLOR_POR_DEFECTO, fondoSuave } from '../lib/colores'
import type { DiaSemana } from '../lib/db'
import { fechaCorta } from '../lib/fechas'
import { inicioSemana, sumarDias } from '../lib/rachas'
import {
  agregarSoloEseDia,
  borrarBloque,
  cambiarSoloEseDia,
  deshacerCambio,
  guardarBloque,
  type DatosBloque,
} from '../lib/rutinaDb'
import { ayuda, botonPeligro, botonSecundario, campo, Dialogo, Error, etiqueta, SelectorColor, SelectorHora } from './ui'

const DIAS: { valor: DiaSemana; nombre: string; corto: string }[] = [
  { valor: 1, nombre: 'Lunes', corto: 'L' },
  { valor: 2, nombre: 'Martes', corto: 'M' },
  { valor: 3, nombre: 'Miércoles', corto: 'M' },
  { valor: 4, nombre: 'Jueves', corto: 'J' },
  { valor: 5, nombre: 'Viernes', corto: 'V' },
  { valor: 6, nombre: 'Sábado', corto: 'S' },
  { valor: 0, nombre: 'Domingo', corto: 'D' },
]
const PLURAL = ['domingos', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábados']

export type ContextoBloque =
  | { modo: 'plantilla'; plantillaId: string; dia: DiaSemana }
  | { modo: 'fecha'; fecha: string; dia: DiaSemana; plantillaId: string | null }

const sumarMinutos = (hora: string, min: number) => deMin(Math.min(24 * 60, aMin(hora) + min))

function duracionTexto(min: number) {
  const h = Math.floor(min / 60)
  const m = min % 60
  return h && m ? `${h} h ${m} min` : h ? `${h} h` : `${m} min`
}

/**
 * Crea, edita o duplica un bloque.
 * - En la plantilla, los cambios valen para todas las semanas.
 * - En una fecha concreta, se elige si el cambio es solo para ese día o para la plantilla.
 * - Las actividades ya usadas se ofrecen para cargarlas con un clic (nombre, color y duración).
 * - Al crear, se puede repetir el bloque en otros días de una vez.
 */
export default function FormularioBloque({
  contexto,
  item,
  inicioSugerido,
  hermanosDe,
  actividades,
  alCerrar,
}: {
  contexto: ContextoBloque
  item?: ItemAgenda
  inicioSugerido?: string
  /** Bloques de rutina de un día (para avisar si se pisan). */
  hermanosDe: (dia: DiaSemana) => ItemAgenda[]
  actividades: Actividad[]
  alCerrar: () => void
}) {
  const inicio0 = item?.inicio ?? inicioSugerido ?? '09:00'
  const [d, setD] = useState<DatosBloque>({
    titulo: item?.titulo ?? '',
    inicio: inicio0,
    fin: item?.fin ?? sumarMinutos(`${inicio0.slice(0, 2)}:00`, 60),
    color: item?.color ?? COLOR_POR_DEFECTO,
    notas: item?.notas ?? '',
  })
  const [dia, setDia] = useState<DiaSemana>(contexto.dia)
  const [extras, setExtras] = useState<DiaSemana[]>([])
  const [duplicando, setDuplicando] = useState(false)
  const [alcance, setAlcance] = useState<'dia' | 'siempre'>('dia')
  const [error, setError] = useState('')

  /** El bloque que se edita; al duplicar se trabaja sobre una copia nueva. */
  const editado = duplicando ? undefined : item
  const esNuevo = !editado
  const esAgregadoDelDia = !!editado && !editado.bloqueId
  const conPlantilla = contexto.modo === 'plantilla' || !!contexto.plantillaId
  const lunes = contexto.modo === 'fecha' ? inicioSemana(contexto.fecha) : ''
  const fechaDe = (x: DiaSemana) => sumarDias(lunes, (x + 6) % 7)

  const set = <K extends keyof DatosBloque>(k: K, v: DatosBloque[K]) => setD((x) => ({ ...x, [k]: v }))

  const usarActividad = (a: Actividad) => setD((x) => ({ ...x, titulo: a.titulo, color: a.color, fin: sumarMinutos(x.inicio, a.minutos) }))

  const cambiarTitulo = (titulo: string) => {
    const a = esNuevo ? actividades.find((x) => x.titulo.toLocaleLowerCase('es') === titulo.trim().toLocaleLowerCase('es')) : undefined
    if (a) usarActividad({ ...a, titulo })
    else set('titulo', titulo)
  }

  const cambiarInicio = (h: string) => {
    // Al mover el inicio se conserva la duración.
    const dur = aMin(d.fin) - aMin(d.inicio)
    setD((x) => ({ ...x, inicio: h, fin: dur > 0 ? sumarMinutos(h, dur) : x.fin }))
  }

  const diaPrincipal = esNuevo ? dia : contexto.dia
  const otros = hermanosDe(diaPrincipal).filter((h) => h.clave !== editado?.clave)
  const pisa = solapados([...otros, { clave: '__este', inicio: d.inicio, fin: d.fin }]).has('__este')
  const conQuien = otros.filter((o) => aMin(o.inicio) < aMin(d.fin) && aMin(d.inicio) < aMin(o.fin)).map((o) => o.titulo)

  const guardar = async () => {
    if (!d.titulo.trim()) return setError('Poné un título o elegí una actividad guardada.')
    if (aMin(d.fin) <= aMin(d.inicio)) return setError('La hora de fin tiene que ser posterior a la de inicio.')
    const datos = { ...d, titulo: d.titulo.trim(), notas: d.notas.trim() }
    const dias = esNuevo ? [dia, ...extras.filter((x) => x !== dia)] : []

    if (contexto.modo === 'plantilla') {
      if (editado) await guardarBloque(contexto.plantillaId, dia, datos, editado.bloqueId ?? undefined)
      else for (const x of dias) await guardarBloque(contexto.plantillaId, x, datos)
    } else if (editado?.bloqueId) {
      if (alcance === 'dia') await cambiarSoloEseDia(contexto.fecha, editado.bloqueId, 'mover', datos)
      else {
        await guardarBloque(contexto.plantillaId!, contexto.dia, datos, editado.bloqueId)
        if (editado.cambioId) await deshacerCambio(editado.cambioId)
      }
    } else if (editado?.cambioId) {
      await agregarSoloEseDia(contexto.fecha, datos, editado.cambioId)
    } else {
      for (const x of dias) {
        if (alcance === 'siempre' && contexto.plantillaId) await guardarBloque(contexto.plantillaId, x, datos)
        else await agregarSoloEseDia(fechaDe(x), datos)
      }
    }
    alCerrar()
  }

  const accion = async (f: () => Promise<unknown>) => {
    await f()
    alCerrar()
  }

  const duplicar = () => {
    setDuplicando(true)
    setExtras([])
    setError('')
    if (conPlantilla) setAlcance('siempre')
  }

  let botones = null
  if (editado) {
    const borrar =
      contexto.modo === 'plantilla' ? (
        <button type="button" className={botonPeligro} onClick={() => accion(() => borrarBloque(editado.bloqueId!))}>Borrar</button>
      ) : editado.bloqueId ? (
        <>
          <button type="button" className={botonPeligro} onClick={() => accion(() => cambiarSoloEseDia(contexto.fecha, editado.bloqueId!, 'quitar', null))}>
            Quitar solo este día
          </button>
          {editado.modificado && editado.cambioId && (
            <button type="button" className={botonSecundario} onClick={() => accion(() => deshacerCambio(editado.cambioId!))}>
              Volver a la plantilla
            </button>
          )}
        </>
      ) : (
        <button type="button" className={botonPeligro} onClick={() => accion(() => deshacerCambio(editado.cambioId!))}>Borrar</button>
      )
    botones = (
      <div className="mr-auto flex flex-wrap gap-2">
        <button type="button" className={botonSecundario} onClick={duplicar}>Duplicar</button>
        {borrar}
      </div>
    )
  }

  const titulo = duplicando ? 'Duplicar bloque' : editado ? 'Editar bloque' : 'Nuevo bloque'
  const sugeridas = actividades.slice(0, 12)

  return (
    <Dialogo titulo={titulo} alCerrar={alCerrar} alEnviar={guardar} pie={botones}>
      {duplicando && (
        <p className="-mt-1 rounded-lg bg-acento-suave px-3 py-2 text-[13px] text-acento-fuerte">
          Es una copia de "{item?.titulo}". Elegí el día y el horario; con "También en" la ponés en varios días a la vez.
        </p>
      )}

      {sugeridas.length > 0 && (
        <div>
          <p className={etiqueta}>Actividades guardadas</p>
          <div className="flex flex-wrap gap-1.5">
            {sugeridas.map((a) => (
              <button
                key={a.titulo}
                type="button"
                onClick={() => usarActividad(a)}
                title={`${a.titulo} · ${duracionTexto(a.minutos)}`}
                aria-pressed={d.titulo === a.titulo}
                className={`rounded-full border-l-4 px-3 py-1 text-[13px] ${d.titulo === a.titulo ? 'font-semibold ring-2 ring-acento' : ''}`}
                style={{ background: fondoSuave(a.color, 40), borderColor: a.color }}
              >
                {a.titulo}
              </button>
            ))}
          </div>
          <p className={ayuda}>Se carga el nombre, el color y la duración. Las actividades se guardan solas a medida que creás bloques.</p>
        </div>
      )}

      <div>
        <label htmlFor="b-titulo" className={etiqueta}>Título</label>
        <input
          id="b-titulo"
          list="b-actividades"
          className={`${campo} w-full`}
          value={d.titulo}
          onChange={(e) => cambiarTitulo(e.target.value)}
          placeholder="Ej.: Cursada, Estudio, Gimnasio"
          autoFocus
        />
        <datalist id="b-actividades">
          {actividades.map((a) => (
            <option key={a.titulo} value={a.titulo} />
          ))}
        </datalist>
      </div>

      <div className="flex flex-wrap gap-4">
        {(contexto.modo === 'plantilla' || esNuevo) && (
          <div>
            <label htmlFor="b-dia" className={etiqueta}>Día</label>
            <select id="b-dia" className={`${campo} w-48`} value={dia} onChange={(e) => setDia(Number(e.target.value) as DiaSemana)}>
              {DIAS.map((x) => (
                <option key={x.valor} value={x.valor}>
                  {x.nombre}
                  {contexto.modo === 'fecha' ? ` ${fechaCorta(fechaDe(x.valor)).split(' ')[1]}` : ''}
                </option>
              ))}
            </select>
          </div>
        )}
        <SelectorHora id="b-inicio" etiquetaTexto="Desde" valor={d.inicio} alCambiar={cambiarInicio} />
        <SelectorHora id="b-fin" etiquetaTexto="Hasta" valor={d.fin} alCambiar={(h) => set('fin', h)} />
      </div>
      {pisa && (
        <p className="-mt-2 rounded-lg bg-amber-50 px-3 py-2 text-[13px] text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          Se pisa con: {conQuien.join(', ')}. Podés guardarlo igual.
        </p>
      )}

      {esNuevo && (
        <fieldset>
          <legend className={etiqueta}>También en <span className="font-normal text-texto-suave">(opcional)</span></legend>
          <div className="flex gap-1.5">
            {DIAS.map((x) => {
              const principal = x.valor === dia
              const activo = principal || extras.includes(x.valor)
              return (
                <button
                  key={x.valor}
                  type="button"
                  disabled={principal}
                  onClick={() => setExtras(extras.includes(x.valor) ? extras.filter((y) => y !== x.valor) : [...extras, x.valor])}
                  aria-pressed={activo}
                  aria-label={x.nombre}
                  title={principal ? `${x.nombre} (día elegido arriba)` : x.nombre}
                  className={`h-11 w-11 rounded-full border text-sm font-semibold ${activo ? 'border-acento bg-acento text-sobre-acento' : 'border-borde text-texto-suave hover:border-acento'} ${principal ? 'opacity-70' : ''}`}
                >
                  {x.corto}
                </button>
              )
            })}
          </div>
          <p className={ayuda}>Crea el mismo bloque, a la misma hora, en todos los días marcados.</p>
        </fieldset>
      )}

      {contexto.modo === 'fecha' && contexto.plantillaId && !esAgregadoDelDia && (
        <fieldset>
          <legend className={etiqueta}>¿A qué días aplica?</legend>
          <div className="flex flex-col gap-2">
            {(
              [
                ['dia', esNuevo ? 'Solo esta semana' : `Solo el ${fechaCorta(contexto.fecha)}`, 'La plantilla no cambia; las demás semanas siguen igual.'],
                ['siempre', esNuevo ? 'Todas las semanas (plantilla)' : `Todos los ${PLURAL[contexto.dia]} (plantilla)`, 'Cambia la plantilla de la semana.'],
              ] as const
            ).map(([valor, texto, detalle]) => (
              <label key={valor} className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 ${alcance === valor ? 'border-acento bg-acento-suave' : 'border-borde'}`}>
                <input type="radio" name="alcance" className="mt-1 accent-[var(--color-acento)]" checked={alcance === valor} onChange={() => setAlcance(valor)} />
                <span>
                  <span className="block text-[15px] font-medium">{texto}</span>
                  <span className="block text-[13px] text-texto-suave">{detalle}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {contexto.modo === 'fecha' && !contexto.plantillaId && <p className={ayuda}>Esta semana no usa plantilla: el bloque se guarda solo para esta semana.</p>}

      <SelectorColor valor={d.color} alCambiar={(c) => set('color', c)} />

      <div>
        <label htmlFor="b-notas" className={etiqueta}>Notas <span className="font-normal text-texto-suave">(opcional)</span></label>
        <textarea id="b-notas" rows={2} className={`${campo} w-full`} value={d.notas} onChange={(e) => set('notas', e.target.value)} />
      </div>

      <Error texto={error} />
    </Dialogo>
  )
}
