import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { db, type CheckinAnimo as Checkin } from '../lib/db'
import { ETIQUETAS_ANIMO, ETIQUETAS_ENERGIA } from '../lib/diario'
import { guardarCheckin } from '../lib/diarioDb'
import { campo } from './ui'

type Valor = Checkin['animo']

function Escala({ nombre, etiquetas, valor, alElegir }: { nombre: string; etiquetas: readonly string[]; valor: number | undefined; alElegir: (v: Valor) => void }) {
  return (
    <fieldset>
      <legend className="mb-2 flex w-full justify-between text-sm font-medium">
        <span>{nombre}</span>
        <span className="font-normal text-texto-suave">{valor ? etiquetas[valor - 1] : 'Sin registrar'}</span>
      </legend>
      <div className="grid grid-cols-5 gap-2">
        {([1, 2, 3, 4, 5] as Valor[]).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => alElegir(v)}
            aria-pressed={valor === v}
            aria-label={`${nombre} ${v}: ${etiquetas[v - 1]}`}
            title={etiquetas[v - 1]}
            className={`min-h-11 rounded-xl border text-[17px] font-semibold transition-colors ${
              valor === v ? 'border-acento bg-acento text-sobre-acento' : 'border-borde bg-superficie hover:border-acento'
            }`}
          >
            {v}
          </button>
        ))}
      </div>
    </fieldset>
  )
}

/** Check-in de ánimo y energía de un día: dos toques y una nota opcional. Se guarda al tocar. */
export default function CheckinAnimo({ fecha, compacto = false }: { fecha: string; compacto?: boolean }) {
  const actual = useLiveQuery(() => db.animo.where('fecha').equals(fecha).filter((c) => !c.borrado).first(), [fecha])
  const [nota, setNota] = useState('')

  useEffect(() => {
    setNota(actual?.nota ?? '')
  }, [actual?.id, actual?.nota])

  const guardarNota = () => {
    if (actual && nota !== actual.nota) guardarCheckin(fecha, { nota: nota.trim() })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className={`grid gap-5 ${compacto ? '' : 'md:grid-cols-2'}`}>
        <Escala nombre="Ánimo" etiquetas={ETIQUETAS_ANIMO} valor={actual?.animo} alElegir={(v) => guardarCheckin(fecha, { animo: v, energia: actual?.energia ?? 3 })} />
        <Escala nombre="Energía" etiquetas={ETIQUETAS_ENERGIA} valor={actual?.energia} alElegir={(v) => guardarCheckin(fecha, { energia: v, animo: actual?.animo ?? 3 })} />
      </div>
      {actual && (
        <div>
          <label htmlFor={`nota-${fecha}`} className="sr-only">Nota sobre cómo te sentís</label>
          <input
            id={`nota-${fecha}`}
            className={`${campo} w-full text-sm`}
            placeholder="¿Algo que influyó? (opcional)"
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            onBlur={guardarNota}
            onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
          />
        </div>
      )}
    </div>
  )
}
