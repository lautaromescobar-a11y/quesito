import { useSyncExternalStore } from 'react'
import { db, guardarAjuste, leerAjuste, nuevo, type SesionFoco, type Sincronizable } from './db'
import { CONFIG_INICIAL, elegirFase, estadoInicial, iniciar, NOMBRE_FASE, pausar, reiniciar, restante, terminarFase, type ConfigFoco, type EstadoFoco, type Fase, type Vinculo } from './focoLogica'
import { notificar } from './notificaciones'
import { sonarCampana } from './sonidos'

/**
 * Estado global del temporizador de foco.
 * Se guarda en localStorage para que siga corriendo al cambiar de pantalla o recargar la app.
 */
const CLAVE = 'rutirat.foco'

function cargar(): EstadoFoco | null {
  try {
    const t = localStorage.getItem(CLAVE)
    return t ? (JSON.parse(t) as EstadoFoco) : null
  } catch {
    return null
  }
}

function persistir(e: EstadoFoco) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(e))
  } catch {
    /* sin almacenamiento: el reloj funciona igual mientras la app esté abierta */
  }
}

let config: ConfigFoco = CONFIG_INICIAL
let estado: EstadoFoco = cargar() ?? estadoInicial(config)
let foto = { estado, config }
const oyentes = new Set<() => void>()

function cambiar(nuevoEstado: EstadoFoco, nuevaConfig = config) {
  estado = nuevoEstado
  config = nuevaConfig
  foto = { estado, config }
  persistir(estado)
  oyentes.forEach((f) => f())
}

const hora = (ms: number) => new Date(ms).toTimeString().slice(0, 5)
const fecha = (ms: number) => new Date(ms).toLocaleDateString('sv-SE')

async function registrarSesion(e: EstadoFoco, terminoEn: number) {
  await db.foco.add(
    nuevo<Omit<SesionFoco, keyof Sincronizable>>({
      fecha: fecha(terminoEn),
      hora: hora(terminoEn),
      titulo: e.vinculo.titulo,
      minutos: config.foco,
      tareaId: e.vinculo.tipo === 'tarea' ? e.vinculo.id : null,
      bloqueId: e.vinculo.tipo === 'bloque' ? e.vinculo.id : null,
    }),
  )
}

/** Revisa si terminó la fase. Se llama varias veces por segundo mientras la app está abierta. */
async function revisar() {
  if (estado.estado !== 'corriendo' || restante(estado, Date.now()) > 0) return
  const anterior = estado
  const terminoEn = anterior.finEn ?? Date.now()
  const { estado: siguiente, focoCompleto } = terminarFase(anterior, config, Date.now())
  cambiar(siguiente)
  if (focoCompleto) await registrarSesion(anterior, terminoEn)
  sonarCampana()
  const titulo = anterior.fase === 'foco' ? `¡Terminó el foco${anterior.vinculo.titulo ? `: ${anterior.vinculo.titulo}` : ''}!` : 'Terminó la pausa'
  const cuerpo =
    anterior.fase === 'foco'
      ? `Bien ahí: ${config.foco} min de foco. Ahora: ${NOMBRE_FASE[siguiente.fase].toLowerCase()} de ${siguiente.restanteMs / 60_000} min.`
      : `Volvé al foco${anterior.vinculo.titulo ? `: ${anterior.vinculo.titulo}` : ''}.`
  void notificar(titulo, cuerpo, 'foco')
}

export const foco = {
  foto: () => foto,
  suscribir(f: () => void) {
    oyentes.add(f)
    return () => oyentes.delete(f)
  },
  iniciar: () => cambiar(iniciar(estado, Date.now())),
  pausar: () => cambiar(pausar(estado, Date.now())),
  reiniciar: () => cambiar(reiniciar(estado, config)),
  saltar: () => cambiar(terminarFase(estado, config, Date.now(), true).estado),
  elegirFase: (f: Fase) => cambiar(elegirFase(estado, f, config)),
  vincular: (v: Vinculo) => cambiar({ ...estado, vinculo: v }),
  async configurar(c: ConfigFoco) {
    await guardarAjuste('configFoco', c)
    // Si está detenido, el reloj toma la nueva duración enseguida.
    cambiar(estado.estado === 'detenido' ? reiniciar(estado, c) : estado, c)
  },
}

/** Arranca el motor: carga la configuración y revisa el reloj cada medio segundo. */
export function iniciarMotorFoco() {
  void leerAjuste<ConfigFoco>('configFoco', CONFIG_INICIAL).then((c) => {
    const completa = { ...CONFIG_INICIAL, ...c }
    cambiar(estado.estado === 'detenido' ? reiniciar(estado, completa) : estado, completa)
  })
  void revisar()
  const id = window.setInterval(() => void revisar(), 500)
  return () => window.clearInterval(id)
}

export function useFoco() {
  return useSyncExternalStore(foco.suscribir, foco.foto)
}
