import { useEffect, useState } from 'react'
import { useFoco } from '../lib/foco'
import { formatoReloj, restante } from '../lib/focoLogica'

/** Tiempo del foco en el menú mientras el reloj está en marcha o en pausa. */
export default function MiniReloj() {
  const { estado } = useFoco()
  const [ahora, setAhora] = useState(() => Date.now())
  useEffect(() => {
    if (estado.estado === 'detenido') return
    const id = setInterval(() => setAhora(Date.now()), 500)
    return () => clearInterval(id)
  }, [estado.estado])
  if (estado.estado === 'detenido') return null
  return (
    <span className={`ml-auto rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${estado.fase === 'foco' ? 'bg-acento text-sobre-acento' : 'bg-pista text-texto'}`} title={estado.estado === 'pausado' ? 'En pausa' : 'En marcha'}>
      {estado.estado === 'pausado' ? '⏸ ' : ''}
      {formatoReloj(restante(estado, ahora))}
    </span>
  )
}
