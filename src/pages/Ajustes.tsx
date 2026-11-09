import { useEffect, useState } from 'react'
import AjustesPin from '../components/AjustesPin'
import AjustesGoogle from '../components/AjustesGoogle'
import AjustesInstalar from '../components/AjustesInstalar'
import AjustesRespaldo from '../components/AjustesRespaldo'
import { NOMBRE_APP } from '../lib/app'
import AjustesNombre from '../components/AjustesNombre'
import Tarjeta from '../components/Tarjeta'
import { guardarAjuste, leerAjuste } from '../lib/db'
import { estadoPermiso, notificar, pedirPermiso, type EstadoPermiso } from '../lib/notificaciones'
import { cambiarTema, cargarTema, type Tema } from '../lib/tema'

const textoPermiso: Record<EstadoPermiso, string> = {
  granted: 'Permitidas',
  denied: 'Bloqueadas. Habilitalas desde el candado de la barra de direcciones.',
  default: 'Todavía no diste permiso',
  'no-soportado': 'Este navegador no soporta notificaciones',
}

export default function Ajustes() {
  const [tema, setTema] = useState<Tema>('sistema')
  const [permiso, setPermiso] = useState<EstadoPermiso>(estadoPermiso())
  const [activas, setActivas] = useState(true)
  const [mensaje, setMensaje] = useState('')

  useEffect(() => {
    cargarTema().then(setTema)
    leerAjuste('notificacionesActivas', true).then(setActivas)
  }, [])

  const elegirTema = async (t: Tema) => {
    setTema(t)
    await cambiarTema(t)
  }

  const permitir = async () => setPermiso(await pedirPermiso())

  const probar = async () => {
    const ok = await notificar(`${NOMBRE_APP} funciona`, 'Las notificaciones están listas.')
    setMensaje(ok ? 'Notificación enviada. Si no la ves, revisá el modo "No molestar" de Windows.' : 'Primero tenés que permitir las notificaciones.')
  }

  const alternarActivas = async () => {
    setActivas(!activas)
    await guardarAjuste('notificacionesActivas', !activas)
  }

  const boton = 'rounded-lg border border-borde px-4 py-2 text-sm hover:bg-acento-suave'
  const botonPrincipal = 'rounded-lg bg-acento px-4 py-2 text-sm font-medium text-sobre-acento hover:opacity-90'

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-3xl font-semibold">Ajustes</h1>

      <AjustesNombre />
      <AjustesInstalar />
      <AjustesGoogle />

      <Tarjeta titulo="Apariencia">
        <div className="flex gap-2">
          {(['claro', 'oscuro', 'sistema'] as Tema[]).map((t) => (
            <button key={t} onClick={() => elegirTema(t)} className={tema === t ? botonPrincipal : boton}>
              {t === 'claro' ? 'Claro' : t === 'oscuro' ? 'Oscuro' : 'Según Windows'}
            </button>
          ))}
        </div>
      </Tarjeta>

      <Tarjeta titulo="Notificaciones">
        <p className="mb-3 text-sm">
          Estado: <strong>{textoPermiso[permiso]}</strong>
        </p>
        <div className="flex flex-wrap gap-2">
          {permiso !== 'granted' && (
            <button onClick={permitir} className={botonPrincipal}>
              Permitir notificaciones
            </button>
          )}
          <button onClick={probar} className={boton}>
            Enviar notificación de prueba
          </button>
          <button onClick={alternarActivas} className={boton}>
            Recordatorios: {activas ? 'activados' : 'desactivados'}
          </button>
        </div>
        {mensaje && <p className="mt-3 text-sm text-texto-suave">{mensaje}</p>}
        <p className="mt-3 text-xs text-texto-suave">
          Los recordatorios llegan mientras la app esté abierta, aunque esté minimizada. Con la app cerrada llegan en la Fase 7.
        </p>
      </Tarjeta>
      <AjustesRespaldo />
      <AjustesPin />
    </div>
  )
}
