import { useEffect, useState } from 'react'
import { NavLink, Route, Routes } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { NOMBRE_APP } from './lib/app'
import { recurso } from './lib/ruta'
import { db, leerAjuste } from './lib/db'
import { useFoco } from './lib/foco'
import { formatoReloj, restante } from './lib/focoLogica'
import Avisos from './components/Avisos'
import MotorFoco from './components/MotorFoco'
import VentanitaFoco from './components/VentanitaFoco'
import AvisoActualizacion from './components/AvisoActualizacion'
import MotorGoogle from './components/MotorGoogle'
import { hoyISO } from './lib/fechas'
import { iniciarRecordatorios } from './lib/notificaciones'
import Ajustes from './pages/Ajustes'
import Bienvenida from './pages/Bienvenida'
import Estadisticas from './pages/Estadisticas'
import Foco from './pages/Foco'
import Animo from './pages/Animo'
import Diario from './pages/Diario'
import Habitos from './pages/Habitos'
import Hoy from './pages/Hoy'
import Plantillas from './pages/Plantillas'
import Revision from './pages/Revision'
import Rutina from './pages/Rutina'
import Tareas from './pages/Tareas'

type Seccion = { ruta: string; nombre: string; sub?: boolean }

const secciones: Seccion[] = [
  { ruta: '/habitos', nombre: 'Hábitos' },
  { ruta: '/rutina', nombre: 'Rutina' },
  { ruta: '/plantillas', nombre: 'Plantillas', sub: true },
  { ruta: '/diario', nombre: 'Diario' },
  { ruta: '/animo', nombre: 'Ánimo' },
  { ruta: '/foco', nombre: 'Foco' },
  { ruta: '/revision', nombre: 'Revisión' },
  { ruta: '/estadisticas', nombre: 'Estadísticas' },
  { ruta: '/ajustes', nombre: 'Ajustes' },
]

const claseItem = (activo: boolean, sub?: boolean) =>
  `flex min-h-11 items-center rounded-[10px] transition-colors ${sub ? 'ml-4 min-h-9 px-3 text-sm' : 'px-3 text-[15px]'} ${
    activo ? 'bg-acento-suave font-semibold text-acento-fuerte' : 'text-texto-suave hover:bg-acento-suave/60 hover:text-texto'
  }`

/** Tiempo del foco en el menú mientras el reloj está en marcha o en pausa. */
function MiniReloj() {
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

/** Tareas tiene un lugar destacado en el menú, con contador de pendientes y vencidas. */
function ItemTareas() {
  const conteo = useLiveQuery(async () => {
    const hoy = hoyISO()
    const pendientes = await db.tareas.filter((t) => !t.borrado && t.estado !== 'hecha').toArray()
    return { total: pendientes.length, urgentes: pendientes.filter((t) => t.fechaLimite && t.fechaLimite <= hoy).length }
  })
  return (
    <NavLink
      to="/tareas"
      className={({ isActive }) =>
        `flex min-h-11 items-center justify-between rounded-[10px] border px-3 text-[15px] font-semibold transition-colors ${
          isActive ? 'border-acento bg-acento text-sobre-acento' : 'border-acento/40 text-acento-fuerte hover:bg-acento-suave'
        }`
      }
    >
      Tareas
      {conteo && conteo.total > 0 && (
        <span
          className={`min-w-6 rounded-full px-2 py-0.5 text-center text-xs font-bold ${conteo.urgentes ? 'bg-red-600 text-white' : 'bg-acento-suave text-acento-fuerte'}`}
          title={conteo.urgentes ? `${conteo.urgentes} vencen hoy o ya vencieron` : `${conteo.total} pendientes`}
        >
          {conteo.urgentes || conteo.total}
        </span>
      )}
    </NavLink>
  )
}

export default function App() {
  useEffect(() => iniciarRecordatorios(), [])
  const listo = useLiveQuery(() => leerAjuste('sembrado', false))

  if (listo === undefined) return null
  if (!listo) return <><Bienvenida /><AvisoActualizacion /></>

  return (
    <div className="flex h-full">
      <nav aria-label="Secciones" className="flex w-60 shrink-0 flex-col gap-1 border-r border-borde px-5 py-8">
        <div className="flex items-center gap-2.5 px-3 pb-7">
          <img src={recurso('favicon.svg')} alt={`Logo de ${NOMBRE_APP}`} width="32" height="32" className="rounded-lg" />
          <span className="text-[19px] font-bold tracking-tight">{NOMBRE_APP}</span>
        </div>
        <NavLink to="/" end className={({ isActive }) => claseItem(isActive)}>
          Hoy
        </NavLink>
        <div className="my-1">
          <ItemTareas />
        </div>
        {secciones.map((s) => (
          <NavLink key={s.ruta} to={s.ruta} className={({ isActive }) => claseItem(isActive, s.sub)}>
            {s.nombre}
            {s.ruta === '/foco' && <MiniReloj />}
          </NavLink>
        ))}
      </nav>

      <main className="min-w-0 flex-1 overflow-y-auto px-14 py-12">
        <Routes>
          <Route path="/" element={<Hoy />} />
          <Route path="/tareas" element={<Tareas />} />
          <Route path="/habitos" element={<Habitos />} />
          <Route path="/rutina" element={<Rutina />} />
          <Route path="/plantillas" element={<Plantillas />} />
          <Route path="/diario" element={<Diario />} />
          <Route path="/animo" element={<Animo />} />
          <Route path="/foco" element={<Foco />} />
          <Route path="/revision" element={<Revision />} />
          <Route path="/estadisticas" element={<Estadisticas />} />
          <Route path="/ajustes" element={<Ajustes />} />
        </Routes>
      </main>
      <MotorFoco />
      <VentanitaFoco />
      <AvisoActualizacion />
      <MotorGoogle />
      <Avisos />
    </div>
  )
}
