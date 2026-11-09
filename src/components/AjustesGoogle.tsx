import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { db } from '../lib/db'
import {
  AJUSTES_GOOGLE_INICIALES,
  cambiarEnvio,
  CLIENT_ID,
  conectar,
  desconectar,
  elegirCalendario,
  sincronizar,
  useEstadoGoogle,
  type AjustesGoogle as Ajustes,
} from '../lib/google'
import Tarjeta from './Tarjeta'
import { botonChico, botonPrincipal, botonSecundario } from './ui'

function haceCuanto(iso?: string): string {
  if (!iso) return 'todavía no'
  const min = Math.round((Date.now() - Date.parse(iso)) / 60_000)
  if (min < 1) return 'recién'
  if (min < 60) return `hace ${min} min`
  const h = Math.round(min / 60)
  return h < 24 ? `hace ${h} h` : new Date(iso).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
}

export default function AjustesGoogle() {
  const a = useLiveQuery(async () => ((await db.ajustes.get('google'))?.valor as Ajustes | undefined) ?? AJUSTES_GOOGLE_INICIALES)
  const cantidad = useLiveQuery(() => db.eventosGoogle.count())
  const estado = useEstadoGoogle()
  const [confirmar, setConfirmar] = useState(false)
  // Las casillas cambian al instante; la base de datos se actualiza atrás.
  const [marcados, setMarcados] = useState<Record<string, boolean>>({})
  const [enviarLocal, setEnviarLocal] = useState<boolean | null>(null)
  if (!a) return null

  const ocupado = estado.fase === 'sincronizando'

  return (
    <Tarjeta titulo="Google Calendar">
      {!CLIENT_ID ? (
        <p className="text-sm text-texto-suave">La conexión con Google todavía no está configurada en esta versión de la app.</p>
      ) : !a.conectado ? (
        <>
          <p className="mb-3 text-sm">
            Mostrá los eventos de tu Google Calendar en tu agenda de Quesito, y mandá los eventos que cargues acá a un calendario llamado <strong>Quesito</strong> en tu Google.
          </p>
          <button type="button" className={botonPrincipal} onClick={() => void conectar()}>
            Conectar con Google
          </button>
          <p className="mt-3 text-xs text-texto-suave">
            Google va a mostrar un aviso de “app no verificada”: es porque Quesito es una app personal. Tocá <strong>Continuar</strong> y dejá tildados todos los permisos.
          </p>
        </>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <p className="flex-1 text-sm">
              {ocupado ? 'Actualizando…' : `Última actualización: ${haceCuanto(a.ultimaSinc)}`}
              {cantidad !== undefined && !ocupado && <span className="text-texto-suave"> · {cantidad} eventos de Google en tu agenda</span>}
            </p>
            <button type="button" className={botonChico} disabled={ocupado} onClick={() => void sincronizar(true)}>
              Actualizar ahora
            </button>
          </div>

          {(estado.fase === 'reconectar' || estado.fase === 'error') && (
            <p role="alert" className={`rounded-xl px-4 py-3 text-sm ${estado.fase === 'error' ? 'bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200' : 'bg-acento-suave'}`}>
              {estado.mensaje}
            </p>
          )}

          <div>
            <p className="mb-2 text-sm font-medium">Calendarios que se ven en Quesito</p>
            {a.calendarios.length === 0 ? (
              <p className="text-sm text-texto-suave">Tocá “Actualizar ahora” para traer tus calendarios.</p>
            ) : (
              <ul className="space-y-1">
                {a.calendarios.map((c) => (
                  <li key={c.id}>
                    <label className="flex min-h-10 cursor-pointer items-center gap-3 text-[15px]">
                      <input type="checkbox" className="h-5 w-5 accent-[var(--color-acento)]" checked={marcados[c.id] ?? c.elegido}
                        onChange={(e) => {
                          const v = e.target.checked
                          setMarcados((m) => ({ ...m, [c.id]: v }))
                          void elegirCalendario(c.id, v)
                        }} />
                      <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: c.color }} aria-hidden />
                      {c.nombre}
                    </label>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-1 text-xs text-texto-suave">Se ven en la agenda con una <strong>G</strong>. Se cambian en Google; acá son solo para mirar.</p>
          </div>

          <label className="flex cursor-pointer items-start gap-3 text-[15px]">
            <input type="checkbox" className="mt-0.5 h-5 w-5 accent-[var(--color-acento)]" checked={enviarLocal ?? a.enviar}
              onChange={(e) => {
                setEnviarLocal(e.target.checked)
                void cambiarEnvio(e.target.checked)
              }} />
            <span>
              Enviar mis eventos de Quesito a Google
              <span className="block text-sm text-texto-suave">Van a un calendario llamado “Quesito”. Si los cambiás o borrás acá, también cambian allá.</span>
            </span>
          </label>

          <div className="border-t border-linea pt-4">
            {!confirmar ? (
              <button type="button" className={botonSecundario} onClick={() => setConfirmar(true)}>
                Desconectar Google
              </button>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <p className="w-full text-sm">Los eventos de Google dejan de verse en Quesito. Tus eventos propios y el calendario “Quesito” en Google no se borran.</p>
                <button type="button" className={botonPrincipal} onClick={() => void desconectar().then(() => setConfirmar(false))}>
                  Sí, desconectar
                </button>
                <button type="button" className={botonSecundario} onClick={() => setConfirmar(false)}>
                  Cancelar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </Tarjeta>
  )
}
