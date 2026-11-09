import { NOMBRE_APP } from './app'
import { db, guardarAjuste, leerAjuste } from './db'
import { FORMATO_RESPALDO, validarRespaldo, VERSION_RESPALDO, type Respaldo } from './estadisticas'

/** Ajustes que no viajan en el respaldo: la música son archivos grandes y la marca de respaldo es de este equipo. */
const AJUSTES_LOCALES = ['musicaFoco', 'ultimoRespaldo', 'google']
/** Tablas que son copia de otro lado (se vuelven a traer) y no viajan en el respaldo. */
const TABLAS_LOCALES = ['eventosGoogle']

export const nombresTablas = () => db.tables.map((t) => t.name)

export async function crearRespaldo(): Promise<Respaldo> {
  const tablas: Record<string, unknown[]> = {}
  for (const t of db.tables) {
    if (TABLAS_LOCALES.includes(t.name)) continue
    const filas = await t.toArray()
    tablas[t.name] = t.name === 'ajustes' ? filas.filter((f) => !AJUSTES_LOCALES.includes((f as { clave: string }).clave)) : filas
  }
  return { formato: FORMATO_RESPALDO, version: VERSION_RESPALDO, creado: new Date().toISOString(), tablas }
}

/** Descarga el respaldo como archivo .json. */
export async function descargarRespaldo() {
  const r = await crearRespaldo()
  const blob = new Blob([JSON.stringify(r)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${NOMBRE_APP.toLowerCase()}-respaldo-${r.creado.slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  await guardarAjuste('ultimoRespaldo', r.creado)
}

export async function leerArchivoRespaldo(archivo: File): Promise<{ respaldo?: Respaldo; error?: string }> {
  let datos: unknown
  try {
    datos = JSON.parse(await archivo.text())
  } catch {
    return { error: 'No se pudo leer el archivo. Tiene que ser el .json que descargaste de la app.' }
  }
  const error = validarRespaldo(datos, nombresTablas())
  return error ? { error } : { respaldo: datos as Respaldo }
}

/** Reemplaza todos los datos por los del respaldo. La música propia de este equipo se conserva. */
export async function restaurarRespaldo(r: Respaldo) {
  const musica = await leerAjuste('musicaFoco', [])
  const google = await leerAjuste('google', null)
  await db.transaction('rw', db.tables, async () => {
    for (const t of db.tables) {
      if (TABLAS_LOCALES.includes(t.name)) continue
      await t.clear()
      const filas = r.tablas[t.name]
      if (filas?.length) await t.bulkPut(filas)
    }
  })
  await guardarAjuste('musicaFoco', musica)
  if (google) await guardarAjuste('google', google)
  await guardarAjuste('ultimoRespaldo', r.creado)
}
