import { useState } from 'react'
import type { PlantillaSemana, UsoPlantilla } from '../lib/db'
import { fechaCorta } from '../lib/fechas'
import { inicioSemana, sumarDias } from '../lib/rachas'
import { quitarExcepcionSemana, usarDesde, usarSoloEstaSemana } from '../lib/rutinaDb'
import { botonSecundario, Dialogo, etiqueta } from './ui'

/** Ventana para elegir qué plantilla usa una semana: solo esa semana o desde esa semana en adelante. */
export default function ElegirPlantillaSemana({
  fecha,
  plantillas,
  bloquesPorPlantilla,
  actual,
  uso,
  alCerrar,
}: {
  fecha: string
  plantillas: PlantillaSemana[]
  bloquesPorPlantilla: Map<string, number>
  actual: PlantillaSemana | undefined
  uso: UsoPlantilla | undefined
  alCerrar: () => void
}) {
  const lunes = inicioSemana(fecha)
  const [elegida, setElegida] = useState<string>(actual?.id ?? '')
  const [alcance, setAlcance] = useState<'semana' | 'desde'>('desde')

  const guardar = async () => {
    const id = elegida || null
    if (alcance === 'semana') await usarSoloEstaSemana(lunes, id)
    else await usarDesde(lunes, id)
    alCerrar()
  }

  const quitarExcepcion = async () => {
    await quitarExcepcionSemana(lunes)
    alCerrar()
  }

  const semanaTexto = `${fechaCorta(lunes)} al ${fechaCorta(sumarDias(lunes, 6))}`

  return (
    <Dialogo
      titulo="Plantilla de esta semana"
      alCerrar={alCerrar}
      alEnviar={guardar}
      pie={
        uso?.tipo === 'semana' && (
          <button type="button" className={`${botonSecundario} mr-auto`} onClick={quitarExcepcion}>
            Volver a la plantilla habitual
          </button>
        )
      }
    >
      <p className="-mt-1 text-[15px] text-texto-suave">Semana del {semanaTexto}.</p>

      <fieldset>
        <legend className={etiqueta}>Usar</legend>
        <div className="flex flex-col gap-2">
          {[...plantillas.map((p) => ({ id: p.id, nombre: p.nombre, detalle: `${bloquesPorPlantilla.get(p.id) ?? 0} bloques` })), { id: '', nombre: 'Semana libre', detalle: 'Sin plantilla: solo eventos y lo que agregues a mano' }].map((op) => (
            <label key={op.id || 'libre'} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 ${elegida === op.id ? 'border-acento bg-acento-suave' : 'border-borde'}`}>
              <input type="radio" name="plantilla" className="accent-[var(--color-acento)]" checked={elegida === op.id} onChange={() => setElegida(op.id)} />
              <span className="flex-1">
                <span className="block text-[15px] font-medium">{op.nombre}</span>
                <span className={`block text-[13px] ${op.detalle.startsWith('0 ') ? 'font-medium text-amber-700 dark:text-amber-300' : 'text-texto-suave'}`}>
                  {op.detalle.startsWith('0 ') ? 'Vacía: todavía no tiene bloques' : op.detalle}
                </span>
              </span>
              {actual?.id === op.id && op.id && <span className="text-xs font-semibold text-acento">Actual</span>}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className={etiqueta}>¿Por cuánto tiempo?</legend>
        <div className="flex flex-col gap-2">
          {(
            [
              ['desde', 'Desde esta semana en adelante', 'Ideal cuando empieza un cuatrimestre nuevo. Las semanas anteriores no cambian.'],
              ['semana', 'Solo esta semana', 'Para una semana especial: parciales, vacaciones, un viaje. La siguiente vuelve a la habitual.'],
            ] as const
          ).map(([valor, texto, detalle]) => (
            <label key={valor} className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 ${alcance === valor ? 'border-acento bg-acento-suave' : 'border-borde'}`}>
              <input type="radio" name="alcance-plantilla" className="mt-1 accent-[var(--color-acento)]" checked={alcance === valor} onChange={() => setAlcance(valor)} />
              <span>
                <span className="block text-[15px] font-medium">{texto}</span>
                <span className="block text-[13px] text-texto-suave">{detalle}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
    </Dialogo>
  )
}
