import { db, leerAjuste } from './db'
import { recurso } from './ruta'
import { tocaEseDia } from './rachas'

export type EstadoPermiso = NotificationPermission | 'no-soportado'

export function estadoPermiso(): EstadoPermiso {
  return 'Notification' in window ? Notification.permission : 'no-soportado'
}

export async function pedirPermiso(): Promise<EstadoPermiso> {
  if (!('Notification' in window)) return 'no-soportado'
  return Notification.requestPermission()
}

/**
 * Muestra una notificación del sistema. Se usa el service worker cuando
 * está disponible porque así la notificación aparece aunque la ventana
 * esté minimizada y, al hacer clic, vuelve a abrir la app.
 */
export async function notificar(titulo: string, cuerpo: string, etiqueta?: string) {
  if (estadoPermiso() !== 'granted') return false
  const opciones: NotificationOptions & { renotify?: boolean } = { body: cuerpo, icon: recurso('icon-192.png'), badge: recurso('icon-192.png'), silent: false, ...(etiqueta ? { tag: etiqueta, renotify: true } : {}) }
  const registro = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : undefined
  if (registro) await registro.showNotification(titulo, opciones)
  else new Notification(titulo, opciones)
  return true
}

const hoy = () => new Date().toLocaleDateString('sv-SE') // YYYY-MM-DD en hora local
const ahoraHHMM = () => new Date().toTimeString().slice(0, 5)

/**
 * Revisa cada minuto si algún hábito tiene recordatorio a esta hora y
 * todavía no se registró hoy. Funciona mientras la app esté abierta,
 * aunque esté minimizada. Con la app cerrada hará falta push (Fase 7).
 */
export function iniciarRecordatorios() {
  const avisados = new Set<string>()
  const revisar = async () => {
    if (!(await leerAjuste('notificacionesActivas', true))) return
    const fecha = hoy()
    const hora = ahoraHHMM()
    const habitos = await db.habitos
      .filter((h) => h.activo && !h.borrado && h.horaRecordatorio === hora && tocaEseDia(h, fecha))
      .toArray()
    for (const h of habitos) {
      const clave = `${h.id}-${fecha}`
      if (avisados.has(clave)) continue
      const registros = await db.registrosHabito.where('[habitoId+fecha]').equals([h.id, fecha]).toArray()
      const hecho = registros.some((r) => !r.borrado && r.estado !== 'omitido')
      const cuerpo = [h.disparador && `Después de ${h.disparador}`, h.meta, h.versionMinima && `Mínimo: ${h.versionMinima}`].filter(Boolean).join(' · ')
      if (!hecho) await notificar(`Hora de: ${h.nombre}`, cuerpo || 'Marcalo en la app cuando lo hagas.')
      avisados.add(clave)
    }
  }
  revisar()
  const id = window.setInterval(revisar, 30_000)
  return () => window.clearInterval(id)
}
