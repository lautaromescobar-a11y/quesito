import { db, nuevo, type BloqueRutina, type CambioSemana, type DiaSemana, type Evento, type PlantillaSemana, type Sincronizable, type Tarea, type UsoPlantilla } from './db'
import { inicioSemana } from './rachas'

const ahora = () => new Date().toISOString()
type Sin<T> = Omit<T, keyof Sincronizable>

// ---------- Plantillas ----------

export async function renombrarPlantilla(id: string, nombre: string) {
  await db.plantillas.update(id, { nombre, actualizado: ahora() })
}

/** Crea una plantilla vacía o como copia de otra (con todos sus bloques). No la pone en uso. */
export async function crearPlantilla(nombre: string, copiarDe?: string) {
  const nueva = nuevo<Sin<PlantillaSemana>>({ nombre, vigenteDesde: '', vigenteHasta: null, activa: true })
  const bloques = copiarDe ? await db.bloques.where('plantillaId').equals(copiarDe).filter((b) => !b.borrado).toArray() : []
  await db.transaction('rw', db.plantillas, db.bloques, async () => {
    await db.plantillas.add(nueva)
    await db.bloques.bulkAdd(
      bloques.map((b) => {
        const { id: _i, actualizado: _a, borrado: _b, ...resto } = b
        return nuevo({ ...resto, plantillaId: nueva.id })
      }),
    )
  })
  return nueva.id
}

export async function borrarPlantilla(id: string) {
  await db.transaction('rw', db.plantillas, db.bloques, db.usosPlantilla, async () => {
    await db.plantillas.update(id, { borrado: true, actualizado: ahora() })
    await db.bloques.where('plantillaId').equals(id).modify({ borrado: true, actualizado: ahora() })
    await db.usosPlantilla.where('plantillaId').equals(id).modify({ borrado: true, actualizado: ahora() })
  })
}

// ---------- Uso de plantillas por semana ----------

/** Usa la plantilla desde la semana de `fecha` en adelante (reemplaza lo programado después). */
export async function usarDesde(fecha: string, plantillaId: string | null) {
  const lunes = inicioSemana(fecha)
  await db.transaction('rw', db.usosPlantilla, async () => {
    await db.usosPlantilla
      .filter((u) => !u.borrado && u.tipo === 'desde' && u.desde >= lunes)
      .modify({ borrado: true, actualizado: ahora() })
    // Si esta semana tenía una excepción, se quita para que se vea el cambio.
    await db.usosPlantilla
      .filter((u) => !u.borrado && u.tipo === 'semana' && u.desde === lunes)
      .modify({ borrado: true, actualizado: ahora() })
    await db.usosPlantilla.add(nuevo<Sin<UsoPlantilla>>({ plantillaId, tipo: 'desde', desde: lunes }))
  })
}

/** Usa la plantilla solo en la semana de `fecha`. */
export async function usarSoloEstaSemana(fecha: string, plantillaId: string | null) {
  const lunes = inicioSemana(fecha)
  await db.transaction('rw', db.usosPlantilla, async () => {
    await db.usosPlantilla
      .filter((u) => !u.borrado && u.tipo === 'semana' && u.desde === lunes)
      .modify({ borrado: true, actualizado: ahora() })
    await db.usosPlantilla.add(nuevo<Sin<UsoPlantilla>>({ plantillaId, tipo: 'semana', desde: lunes }))
  })
}

/** Quita la excepción de una semana: vuelve a la plantilla que le toca normalmente. */
export async function quitarExcepcionSemana(fecha: string) {
  const lunes = inicioSemana(fecha)
  await db.usosPlantilla
    .filter((u) => !u.borrado && u.tipo === 'semana' && u.desde === lunes)
    .modify({ borrado: true, actualizado: ahora() })
}

// ---------- Bloques de plantilla ----------

export type DatosBloque = Pick<BloqueRutina, 'titulo' | 'inicio' | 'fin' | 'color' | 'notas'>

export async function guardarBloque(plantillaId: string, dia: DiaSemana, datos: DatosBloque, id?: string) {
  if (id) {
    await db.bloques.update(id, { ...datos, dia, actualizado: ahora() })
    return id
  }
  const fila = nuevo<Sin<BloqueRutina>>({ ...datos, plantillaId, dia, categoriaId: null })
  await db.bloques.add(fila)
  return fila.id
}

export async function borrarBloque(id: string) {
  await db.bloques.update(id, { borrado: true, actualizado: ahora() })
}

// ---------- Cambios de un solo día ----------

/** Crea o reemplaza el cambio de un bloque de plantilla en una fecha. */
export async function cambiarSoloEseDia(fecha: string, bloqueId: string, accion: 'quitar' | 'mover', datos: Partial<DatosBloque> | null) {
  const previo = await db.cambiosSemana.where('fecha').equals(fecha).filter((c) => !c.borrado && c.bloqueId === bloqueId).first()
  if (previo) await db.cambiosSemana.update(previo.id, { accion, datos, actualizado: ahora() })
  else await db.cambiosSemana.add(nuevo<Sin<CambioSemana>>({ fecha, bloqueId, accion, datos }))
}

export async function agregarSoloEseDia(fecha: string, datos: DatosBloque, cambioId?: string) {
  if (cambioId) await db.cambiosSemana.update(cambioId, { datos, actualizado: ahora() })
  else await db.cambiosSemana.add(nuevo<Sin<CambioSemana>>({ fecha, bloqueId: null, accion: 'agregar', datos }))
}

/** Vuelve un día a como dice la plantilla (o borra un bloque agregado solo ese día). */
export async function deshacerCambio(cambioId: string) {
  await db.cambiosSemana.update(cambioId, { borrado: true, actualizado: ahora() })
}

// ---------- Eventos ----------

export type DatosEvento = Pick<Evento, 'titulo' | 'fecha' | 'inicio' | 'fin' | 'repeticion' | 'color'>

export async function guardarEvento(datos: DatosEvento, id?: string) {
  if (id) await db.eventos.update(id, { ...datos, actualizado: ahora() })
  else await db.eventos.add(nuevo<Sin<Evento>>({ ...datos, categoriaId: null, origen: 'propio' }))
}

export async function borrarEvento(id: string) {
  await db.eventos.update(id, { borrado: true, actualizado: ahora() })
}

// ---------- Tareas ----------

export type DatosTarea = Pick<Tarea, 'titulo' | 'fechaLimite' | 'prioridad' | 'estado'>

export async function guardarTarea(datos: DatosTarea, id?: string) {
  if (id) await db.tareas.update(id, { ...datos, actualizado: ahora() })
  else await db.tareas.add(nuevo<Sin<Tarea>>({ ...datos, categoriaId: null }))
}

export async function cambiarTarea(id: string, cambios: Partial<Tarea>) {
  await db.tareas.update(id, { ...cambios, actualizado: ahora() })
}
