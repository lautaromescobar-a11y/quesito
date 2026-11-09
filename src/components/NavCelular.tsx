import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import MiniReloj from './MiniReloj'
import { secciones } from '../lib/secciones'
import { NOMBRE_APP } from '../lib/app'
import { db } from '../lib/db'
import { hoyISO } from '../lib/fechas'
import { useFoco } from '../lib/foco'
import { recurso } from '../lib/ruta'

/** Rutas que van en la barra de abajo; el resto queda en "Más". */
const PRINCIPALES = ['/', '/tareas', '/habitos', '/rutina']

function Icono({ ruta }: { ruta: string }) {
  const comun = { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true }
  switch (ruta) {
    case '/':
      return <svg {...comun}><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" /></svg>
    case '/tareas':
      return <svg {...comun}><rect x="4" y="4" width="16" height="16" rx="3.5" /><path d="m8.5 12 2.5 2.5 4.5-5" /></svg>
    case '/habitos':
      return <svg {...comun}><path d="M12 21c-4.4 0-7.5-3-7.5-7 0-3.6 2.6-6 4.4-8.4.4.9 1.1 2 2.3 2.4C11 5.7 12.5 3.6 14.6 2.5c-.3 2.9 4.9 5.6 4.9 11.5 0 4-3.1 7-7.5 7Z" /></svg>
    case '/rutina':
      return <svg {...comun}><rect x="3.5" y="5" width="17" height="15.5" rx="3" /><path d="M3.5 10h17M8 3v4M16 3v4" /></svg>
    default:
      return <svg {...comun}><circle cx="5.5" cy="12" r="1.3" /><circle cx="12" cy="12" r="1.3" /><circle cx="18.5" cy="12" r="1.3" /></svg>
  }
}

const NOMBRES: Record<string, string> = { '/': 'Hoy', '/tareas': 'Tareas', '/habitos': 'Hábitos', '/rutina': 'Rutina' }

function Contador() {
  const n = useLiveQuery(async () => {
    const hoy = hoyISO()
    const p = await db.tareas.filter((t) => !t.borrado && t.estado !== 'hecha').toArray()
    return { total: p.length, urgentes: p.filter((t) => t.fechaLimite && t.fechaLimite <= hoy).length }
  })
  if (!n?.total) return null
  return (
    <span className={`absolute -top-1 left-[calc(50%+6px)] min-w-[18px] rounded-full px-1 text-center text-[11px] font-bold leading-[18px] ${n.urgentes ? 'bg-red-600 text-white' : 'bg-acento text-sobre-acento'}`}>
      {n.urgentes || n.total}
    </span>
  )
}

/** Barra de navegación de abajo para el celular (en pantallas chicas reemplaza al menú lateral). */
export default function NavCelular() {
  const [abierto, setAbierto] = useState(false)
  const { pathname } = useLocation()
  const { estado } = useFoco()
  useEffect(() => setAbierto(false), [pathname])
  const enMas = !PRINCIPALES.includes(pathname)
  const item = (activo: boolean) => `relative flex flex-1 flex-col items-center justify-center gap-0.5 pt-2 pb-1.5 text-[11px] font-medium ${activo ? 'text-acento-fuerte' : 'text-texto-suave'}`

  return (
    <>
      {abierto && (
        <div className="fixed inset-0 z-40 bg-black/30 md:hidden" onClick={() => setAbierto(false)}>
          <div
            role="dialog"
            aria-label="Más secciones"
            className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-superficie px-4 pt-3 pb-[calc(84px+env(safe-area-inset-bottom))] shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-pista" aria-hidden />
            <div className="mb-2 flex items-center gap-2 px-2">
              <img src={recurso('favicon.svg')} alt="" width="24" height="24" className="rounded-md" />
              <span className="font-bold">{NOMBRE_APP}</span>
            </div>
            <ul className="grid grid-cols-2 gap-1">
              {secciones
                .filter((s) => !PRINCIPALES.includes(s.ruta))
                .map((s) => (
                  <li key={s.ruta}>
                    <NavLink
                      to={s.ruta}
                      className={({ isActive }) => `flex min-h-12 items-center gap-2 rounded-xl px-3 text-[15px] ${isActive ? 'bg-acento-suave font-semibold text-acento-fuerte' : 'text-texto'}`}
                    >
                      {s.nombre}
                      {s.ruta === '/foco' && <MiniReloj />}
                    </NavLink>
                  </li>
                ))}
            </ul>
          </div>
        </div>
      )}
      <nav aria-label="Secciones principales" className="fixed inset-x-0 bottom-0 z-40 flex border-t border-borde bg-superficie/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {PRINCIPALES.map((r) => (
          <NavLink key={r} to={r} end={r === '/'} className={({ isActive }) => item(isActive)}>
            <Icono ruta={r} />
            {NOMBRES[r]}
            {r === '/tareas' && <Contador />}
          </NavLink>
        ))}
        <button type="button" className={item(enMas || abierto)} onClick={() => setAbierto((a) => !a)} aria-expanded={abierto}>
          <Icono ruta="mas" />
          Más
          {estado.estado !== 'detenido' && <span className="absolute top-1.5 left-[calc(50%+8px)] h-2 w-2 rounded-full bg-acento" aria-label="Foco en marcha" />}
        </button>
      </nav>
    </>
  )
}
