import { useSearchParams } from 'react-router-dom'
import { hoyISO } from '../lib/fechas'
import { useDatosAgenda } from '../lib/useAgenda'
import VistaMes from './rutina/VistaMes'
import VistaSemana from './rutina/VistaSemana'

const VISTAS = [
  { clave: 'semana', nombre: 'Semana' },
  { clave: 'mes', nombre: 'Mes' },
] as const

type Vista = (typeof VISTAS)[number]['clave']

export default function Rutina() {
  const [params, setParams] = useSearchParams()
  const vista: Vista = params.get('vista') === 'mes' ? 'mes' : 'semana'
  const fecha = params.get('fecha') || hoyISO()
  const datos = useDatosAgenda()

  const ir = (v: Vista, f = fecha) => setParams({ vista: v, fecha: f }, { replace: true })

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[30px] md:text-[38px] font-semibold tracking-tight">Rutina</h1>
          <p className="text-[15px] text-texto-suave">Tu semana, los cambios que van surgiendo y los eventos.</p>
        </div>
        <nav aria-label="Vistas de la rutina" className="flex gap-1 rounded-xl bg-superficie p-1">
          {VISTAS.map((v) => (
            <button
              key={v.clave}
              type="button"
              onClick={() => ir(v.clave)}
              aria-current={vista === v.clave ? 'page' : undefined}
              className={`min-h-10 rounded-lg px-4 text-[15px] ${vista === v.clave ? 'bg-acento-suave font-semibold text-acento-fuerte' : 'text-texto-suave hover:text-texto'}`}
            >
              {v.nombre}
            </button>
          ))}
        </nav>
      </header>

      {datos && vista === 'semana' && <VistaSemana datos={datos} fecha={fecha} alCambiarFecha={(f) => ir('semana', f)} />}
      {datos && vista === 'mes' && <VistaMes datos={datos} fecha={fecha} alCambiarFecha={(f) => ir('mes', f)} alVerSemana={(f) => ir('semana', f)} />}
    </div>
  )
}
