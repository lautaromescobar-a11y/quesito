import { useState } from 'react'
import FormularioBloque from '../../components/FormularioBloque'
import FormularioPlantilla from '../../components/FormularioPlantilla'
import GrillaSemana from '../../components/GrillaSemana'
import { botonChico, botonPrincipal } from '../../components/ui'
import { bloquesDePlantilla, plantillaVigente, type ItemAgenda } from '../../lib/agenda'
import type { DiaSemana, PlantillaSemana } from '../../lib/db'
import { fechaCorta, hoyISO } from '../../lib/fechas'
import { borrarPlantilla } from '../../lib/rutinaDb'
import type { DatosAgenda } from '../../lib/useAgenda'

const ORDEN: { dia: DiaSemana; nombre: string }[] = [
  { dia: 1, nombre: 'Lunes' },
  { dia: 2, nombre: 'Martes' },
  { dia: 3, nombre: 'Miércoles' },
  { dia: 4, nombre: 'Jueves' },
  { dia: 5, nombre: 'Viernes' },
  { dia: 6, nombre: 'Sábado' },
  { dia: 0, nombre: 'Domingo' },
]

type Formulario = { tipo: 'nueva' } | { tipo: 'editar'; p: PlantillaSemana } | { tipo: 'duplicar'; p: PlantillaSemana } | null

export default function VistaPlantillas({ datos }: { datos: DatosAgenda }) {
  const enUso = plantillaVigente(datos.plantillas, hoyISO())
  const [elegida, setElegida] = useState<string | undefined>(enUso?.id ?? datos.plantillas[0]?.id)
  const [form, setForm] = useState<Formulario>(null)
  const [bloque, setBloque] = useState<{ dia: DiaSemana; item?: ItemAgenda; hora?: string } | null>(null)
  const [confirmar, setConfirmar] = useState<string | null>(null)

  const actual = datos.plantillas.find((p) => p.id === elegida) ?? datos.plantillas[0]
  const columnas = ORDEN.map((o) => ({ clave: String(o.dia), titulo: o.nombre, items: actual ? bloquesDePlantilla(actual.id, datos.bloques, o.dia) : [] }))

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-2xl text-[15px] text-texto-suave">
          Una plantilla es tu semana tipo durante un período, por ejemplo un cuatrimestre. Cuando cambie, duplicá la actual y ajustá solo lo distinto.
        </p>
        <button type="button" className={botonPrincipal} onClick={() => setForm({ tipo: 'nueva' })}>Nueva plantilla</button>
      </div>

      <ul className="grid gap-3 md:grid-cols-2">
        {datos.plantillas.map((p) => {
          const cantidad = datos.bloques.filter((b) => b.plantillaId === p.id).length
          return (
            <li key={p.id}>
              <article className={`rounded-[20px] border-2 bg-superficie p-5 ${p.id === actual?.id ? 'border-acento' : 'border-transparent'}`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <button type="button" onClick={() => setElegida(p.id)} className="text-left">
                    <h3 className="text-lg font-semibold">{p.nombre}</h3>
                    <p className="text-sm text-texto-suave">
                      Desde {fechaCorta(p.vigenteDesde)} {p.vigenteHasta ? `hasta ${fechaCorta(p.vigenteHasta)}` : 'sin fecha de fin'} · {cantidad} bloques
                    </p>
                  </button>
                  {p.id === enUso?.id && <span className="rounded-full bg-acento-suave px-2.5 py-1 text-xs font-semibold text-acento-fuerte">En uso hoy</span>}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" className={botonChico} onClick={() => setElegida(p.id)}>Ver y editar bloques</button>
                  <button type="button" className={botonChico} onClick={() => setForm({ tipo: 'editar', p })}>Nombre y fechas</button>
                  <button type="button" className={botonChico} onClick={() => setForm({ tipo: 'duplicar', p })}>Duplicar</button>
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
          <h2 className="pt-2 text-lg font-semibold">Bloques de "{actual.nombre}"</h2>
          <p className="-mt-3 text-sm text-texto-suave">Los cambios acá valen para todas las semanas de esta plantilla.</p>
          <GrillaSemana
            columnas={columnas}
            alNuevo={(col, hora) => setBloque({ dia: ORDEN[col].dia, hora })}
            alAbrir={(col, item) => setBloque({ dia: ORDEN[col].dia, item })}
          />
        </>
      ) : (
        <p className="rounded-[20px] bg-superficie p-7 text-texto-suave">Todavía no tenés plantillas. Creá la primera con "Nueva plantilla".</p>
      )}

      {form?.tipo === 'nueva' && <FormularioPlantilla alCerrar={() => setForm(null)} alGuardar={setElegida} />}
      {form?.tipo === 'editar' && <FormularioPlantilla plantilla={form.p} alCerrar={() => setForm(null)} />}
      {form?.tipo === 'duplicar' && <FormularioPlantilla duplicarDe={form.p} alCerrar={() => setForm(null)} alGuardar={setElegida} />}
      {bloque && actual && (
        <FormularioBloque
          contexto={{ modo: 'plantilla', plantillaId: actual.id, dia: bloque.dia }}
          item={bloque.item}
          inicioSugerido={bloque.hora}
          hermanos={bloquesDePlantilla(actual.id, datos.bloques, bloque.dia)}
          alCerrar={() => setBloque(null)}
        />
      )}
    </div>
  )
}
