import { useState } from 'react'
import type { PlantillaSemana } from '../lib/db'
import { crearPlantilla, renombrarPlantilla, usarDesde } from '../lib/rutinaDb'
import { hoyISO } from '../lib/fechas'
import { ayuda, campo, Dialogo, Error, etiqueta } from './ui'

/** Crear (vacía o como copia) o renombrar una plantilla. Crearla no la pone en uso salvo que se pida. */
export default function FormularioPlantilla({
  plantilla,
  plantillas,
  copiarDeInicial,
  alCerrar,
  alGuardar,
}: {
  plantilla?: PlantillaSemana
  plantillas: PlantillaSemana[]
  copiarDeInicial?: string
  alCerrar: () => void
  alGuardar?: (id: string) => void
}) {
  const [nombre, setNombre] = useState(plantilla?.nombre ?? '')
  const [copiarDe, setCopiarDe] = useState<string>(copiarDeInicial ?? plantillas[0]?.id ?? '')
  const [usarYa, setUsarYa] = useState(false)
  const [error, setError] = useState('')

  const guardar = async () => {
    if (!nombre.trim()) return setError('Poné un nombre, por ejemplo "1.º cuatrimestre 2027".')
    if (plantilla) {
      await renombrarPlantilla(plantilla.id, nombre.trim())
      alCerrar()
      return
    }
    const id = await crearPlantilla(nombre.trim(), copiarDe || undefined)
    if (usarYa) await usarDesde(hoyISO(), id)
    alGuardar?.(id)
    alCerrar()
  }

  return (
    <Dialogo titulo={plantilla ? 'Renombrar plantilla' : 'Nueva plantilla'} alCerrar={alCerrar} alEnviar={guardar}>
      <div>
        <label htmlFor="p-nombre" className={etiqueta}>Nombre</label>
        <input id="p-nombre" className={`${campo} w-full`} value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej.: 1.º cuatrimestre 2027, Vacaciones, Semana de parciales" autoFocus />
      </div>

      {!plantilla && (
        <>
          <div>
            <label htmlFor="p-base" className={etiqueta}>Empezar con</label>
            <select id="p-base" className={`${campo} w-full`} value={copiarDe} onChange={(e) => setCopiarDe(e.target.value)}>
              {plantillas.map((p) => (
                <option key={p.id} value={p.id}>Una copia de "{p.nombre}"</option>
              ))}
              <option value="">Una semana vacía</option>
            </select>
            <p className={ayuda}>Con una copia solo tenés que cambiar lo que sea distinto.</p>
          </div>

          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-[15px]">
            <input type="checkbox" className="h-5 w-5 accent-[var(--color-acento)]" checked={usarYa} onChange={(e) => setUsarYa(e.target.checked)} />
            Usarla desde esta semana
          </label>
          <p className={`${ayuda} -mt-4`}>Si no la marcás, la plantilla queda guardada y la activás cuando quieras desde la vista Semana.</p>
        </>
      )}
      <Error texto={error} />
    </Dialogo>
  )
}
