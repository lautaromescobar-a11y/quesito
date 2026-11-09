import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import FormularioBloque from '../components/FormularioBloque'
import FormularioPlantilla from '../components/FormularioPlantilla'
import GrillaSemana from '../components/GrillaSemana'
import { botonChico, botonPrincipal } from '../components/ui'
import { actividadesGuardadas, bloquesDePlantilla, plantillaDeFecha, type ItemAgenda } from '../lib/agenda'
import type { DiaSemana, PlantillaSemana } from '../lib/db'
import { hoyISO } from '../lib/fechas'
import { borrarPlantilla, usarDesde } from '../lib/rutinaDb'
import { useDatosAgenda } from '../lib/useAgenda'

const ORDEN: { dia: DiaSemana; nombre: string }[] = [
  { dia: 1, nombre: 'Lunes' },
  { dia: 2, nombre: 'Martes' },
  { dia: 3, nombre: 'Miércoles' },
  { dia: 4, nombre: 'Jueves' },
  { dia: 5, nombre: 'Viernes' },
  { dia: 6, nombre: 'Sábado' },
  { dia: 0, nombre: 'Domingo' },
]

type Formulario = { tipo: 'nueva'; copiarDe?: string } | { tipo: 'renombrar'; p: PlantillaSemana } | null

export default function Plantillas() {
  const datos = useDatosAgenda()
  const [params, setParams] = useSearchParams()
  if (!datos) return null
  return <ContenidoPlantillas datos={datos} elegidaUrl={params.get('id') ?? undefined} alElegir={(id) => setParams({ id }, { replace: true })} />
}

function ContenidoPlantillas({ datos, elegidaUrl, alElegir }: { datos: NonNullable<ReturnType<typeof useDatosAgenda>>; elegidaUrl?: string; alElegir: (id: string) => void }) {
  const enUso = plantillaDeFecha(datos.plantillas, datos.usos, hoyISO())
  const elegida = elegidaUrl ?? enUso?.id ?? datos.plantillas[0]?.id
  const setElegida = alElegir
  const [form, setForm] = useState<Formulario>(null)
  const [bloque, setBloque] = useState<{ dia: DiaSemana; item?: ItemAgenda; hora?: string } | null>(null)
  const [confirmar, setConfirmar] = useState<string | null>(null)

  const actual = datos.plantillas.find((p) => p.id === elegida) ?? datos.plantillas[0]
  const columnas = ORDEN.map((o) => ({ clave: String(o.dia), titulo: o.nombre, items: actual ? bloquesDePlantilla(actual.id, datos.bloques, o.dia) : [] }))

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[30px] md:text-[38px] font-semibold tracking-tight">Plantillas</h1>
          <p className="max-w-2xl text-[15px] text-texto-suave">
            Tus semanas tipo: una por cuatrimestre, vacaciones o semana de parciales. Cuál se usa cada semana lo elegís en Rutina → Semana.
          </p>
        </div>
        <button type="button" className={botonPrincipal} onClick={() => setForm({ tipo: 'nueva' })}>Nueva plantilla</button>
      </header>

      <ul className="grid gap-3 md:grid-cols-2">
        {datos.plantillas.map((p) => {
          const cantidad = datos.bloques.filter((b) => b.plantillaId === p.id).length
          return (
            <li key={p.id}>
              <article className={`rounded-[20px] border-2 bg-superficie p-5 ${p.id === actual?.id ? 'border-acento' : 'border-transparent'}`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <button type="button" onClick={() => setElegida(p.id)} className="text-left">
                    <h3 className="text-lg font-semibold">{p.nombre}</h3>
                    <p className={`text-sm ${cantidad ? 'text-texto-suave' : 'font-medium text-amber-700 dark:text-amber-300'}`}>
                      {cantidad ? `${cantidad} bloques` : 'Vacía: todavía no tiene bloques'}
                    </p>
                  </button>
                  {p.id === enUso?.id && <span className="rounded-full bg-acento-suave px-2.5 py-1 text-xs font-semibold text-acento-fuerte">En uso esta semana</span>}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" className={botonChico} onClick={() => setElegida(p.id)}>Ver y editar bloques</button>
                  {p.id !== enUso?.id && (
                    <button type="button" className={botonChico} onClick={() => usarDesde(hoyISO(), p.id)}>Usar desde esta semana</button>
                  )}
                  <button type="button" className={botonChico} onClick={() => setForm({ tipo: 'renombrar', p })}>Renombrar</button>
                  <button type="button" className={botonChico} onClick={() => setForm({ tipo: 'nueva', copiarDe: p.id })}>Duplicar</button>
                  {confirmar === p.id ? (
                    <span className="flex items-center gap-2 text-sm">
                      ¿Borrar con todos sus bloques?
                      <button type="button" className={`${botonChico} border-red-300 text-red-700 dark:text-red-300`} onClick={() => borrarPlantilla(p.id).then(() => setConfirmar(null))}>Sí, borrar</button>
                      <button type="button" className={botonChico} onClick={() => setConfirmar(null)}>No</button>
                    </span>
                  ) : (
                    <button type="button" className={botonChico} onClick={() => setConfirmar(p.id)}>Borrar</button>
                  )}
                </div>
              </article>
            </li>
          )
        })}
      </ul>

      {actual ? (
        <>
          <h2 id="bloques" className="pt-2 text-lg font-semibold">Bloques de "{actual.nombre}"</h2>
          <p className="-mt-3 text-sm text-texto-suave">Los cambios acá valen para todas las semanas que usen esta plantilla. Tocá un espacio vacío para agregar un bloque.</p>
          <GrillaSemana
            columnas={columnas}
            alNuevo={(col, hora) => setBloque({ dia: ORDEN[col].dia, hora })}
            alAbrir={(col, item) => setBloque({ dia: ORDEN[col].dia, item })}
          />
        </>
      ) : (
        <p className="rounded-[20px] bg-superficie p-5 md:p-7 text-texto-suave">Todavía no tenés plantillas. Creá la primera con "Nueva plantilla".</p>
      )}

      {form?.tipo === 'nueva' && <FormularioPlantilla plantillas={datos.plantillas} copiarDeInicial={form.copiarDe ?? enUso?.id} alCerrar={() => setForm(null)} alGuardar={setElegida} />}
      {form?.tipo === 'renombrar' && <FormularioPlantilla plantilla={form.p} plantillas={datos.plantillas} alCerrar={() => setForm(null)} />}
      {bloque && actual && (
        <FormularioBloque
          contexto={{ modo: 'plantilla', plantillaId: actual.id, dia: bloque.dia }}
          item={bloque.item}
          inicioSugerido={bloque.hora}
          hermanosDe={(x) => bloquesDePlantilla(actual.id, datos.bloques, x)}
          actividades={actividadesGuardadas(datos.bloques, datos.cambios)}
          alCerrar={() => setBloque(null)}
        />
      )}
    </div>
  )
}
