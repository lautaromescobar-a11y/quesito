import { db, guardarAjuste, leerAjuste, nuevo, type CheckinAnimo, type EntradaDiario, type Sincronizable } from './db'
import { hashPin, pinValido } from './diario'

const ahora = () => new Date().toISOString()
type Sin<T> = Omit<T, keyof Sincronizable>

// ---------- Diario: una entrada por día ----------

export type DatosEntrada = Pick<EntradaDiario, 'titulo' | 'texto' | 'etiquetas'>

export async function entradaDelDia(fecha: string) {
  return db.diario.where('fecha').equals(fecha).filter((e) => !e.borrado).first()
}

/** Crea o actualiza la entrada del día. Si queda vacía, se borra. */
export async function guardarEntrada(fecha: string, datos: DatosEntrada) {
  const vacia = !datos.titulo.trim() && !datos.texto.trim() && datos.etiquetas.length === 0
  const existente = await entradaDelDia(fecha)
  if (existente) {
    await db.diario.update(existente.id, vacia ? { borrado: true, actualizado: ahora() } : { ...datos, actualizado: ahora() })
  } else if (!vacia) {
    await db.diario.add(nuevo<Sin<EntradaDiario>>({ fecha, ...datos }))
  }
}

export async function borrarEntrada(fecha: string) {
  const e = await entradaDelDia(fecha)
  if (e) await db.diario.update(e.id, { borrado: true, actualizado: ahora() })
}

// ---------- Ánimo: un check-in por día ----------

export async function guardarCheckin(fecha: string, datos: Partial<Pick<CheckinAnimo, 'animo' | 'energia' | 'nota'>>) {
  const existente = await db.animo.where('fecha').equals(fecha).filter((c) => !c.borrado).first()
  if (existente) {
    await db.animo.update(existente.id, { ...datos, actualizado: ahora() })
  } else {
    await db.animo.add(nuevo<Sin<CheckinAnimo>>({ fecha, animo: datos.animo ?? 3, energia: datos.energia ?? 3, nota: datos.nota ?? '' }))
  }
}

export async function borrarCheckin(fecha: string) {
  await db.animo.where('fecha').equals(fecha).modify({ borrado: true, actualizado: ahora() })
}

// ---------- PIN del diario ----------
// Es una traba de privacidad: impide que alguien abra el diario al pasar.
// No cifra el contenido (los datos siguen en el navegador).

interface PinGuardado {
  hash: string
  sal: string
}

export async function tienePin(): Promise<boolean> {
  return !!(await leerAjuste<PinGuardado | null>('pinDiario', null))
}

export async function crearPin(pin: string) {
  if (!pinValido(pin)) throw new Error('El PIN tiene que tener 4 números.')
  const sal = crypto.randomUUID()
  await guardarAjuste('pinDiario', { hash: await hashPin(pin, sal), sal })
}

export async function verificarPin(pin: string): Promise<boolean> {
  const guardado = await leerAjuste<PinGuardado | null>('pinDiario', null)
  if (!guardado) return true
  return (await hashPin(pin, guardado.sal)) === guardado.hash
}

export async function quitarPin() {
  await guardarAjuste('pinDiario', null)
}

/** Olvidé el PIN: la única forma de quitarlo sin saberlo es borrar el diario, para que el PIN siga sirviendo de algo. */
export async function borrarDiarioYPin() {
  await db.transaction('rw', db.diario, db.ajustes, async () => {
    await db.diario.toCollection().modify({ borrado: true, actualizado: ahora(), titulo: '', texto: '', etiquetas: [] })
    await guardarAjuste('pinDiario', null)
  })
}
