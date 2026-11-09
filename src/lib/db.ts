import Dexie, { type EntityTable } from 'dexie'

/**
 * Campos que llevan TODAS las tablas. Son los que va a usar la
 * sincronización automática (Fase 7) para saber qué cambió:
 * - id: identificador único global (UUID), no un número autoincremental.
 * - actualizado: fecha/hora de la última modificación (ISO).
 * - borrado: borrado lógico; nunca se elimina una fila, se marca.
 */
export interface Sincronizable {
  id: string
  actualizado: string
  borrado: boolean
}

export type DiaSemana = 0 | 1 | 2 | 3 | 4 | 5 | 6 // 0 = domingo

export interface Categoria extends Sincronizable {
  nombre: string
  color: string
}

export interface PlantillaSemana extends Sincronizable {
  nombre: string
  vigenteDesde: string // YYYY-MM-DD
  vigenteHasta: string | null
  activa: boolean
}

/**
 * Qué plantilla se usa y cuándo.
 * - tipo "desde": a partir de ese lunes en adelante (hasta que otro "desde" posterior la reemplace).
 * - tipo "semana": solo la semana de ese lunes; tiene prioridad sobre "desde".
 * plantillaId null = semana libre, sin plantilla.
 */
export interface UsoPlantilla extends Sincronizable {
  plantillaId: string | null
  tipo: 'desde' | 'semana'
  desde: string // lunes, YYYY-MM-DD
}

export interface BloqueRutina extends Sincronizable {
  plantillaId: string
  dia: DiaSemana
  inicio: string // HH:mm
  fin: string
  titulo: string
  categoriaId: string | null
  color: string // hex, ej. #8CC08F
  notas: string
}

export interface CambioSemana extends Sincronizable {
  fecha: string
  bloqueId: string | null
  accion: 'quitar' | 'mover' | 'agregar'
  datos: Partial<BloqueRutina> | null
}

export interface Evento extends Sincronizable {
  titulo: string
  color: string
  fecha: string
  inicio: string | null
  fin: string | null
  repeticion: 'ninguna' | 'semanal' | 'mensual' | 'anual'
  categoriaId: string | null
  origen: 'propio' | 'google'
}

export interface Tarea extends Sincronizable {
  titulo: string
  fechaLimite: string | null
  estado: 'pendiente' | 'en_curso' | 'hecha'
  prioridad: 'baja' | 'media' | 'alta'
  categoriaId: string | null
}

export interface Habito extends Sincronizable {
  nombre: string
  frecuencia: 'diaria' | 'dias' | 'semanal'
  dias: DiaSemana[] // para 'dias'
  vecesPorSemana: number // para 'semanal'
  disparador: string // lo que va después de "Después de ..."
  meta: string // lo que cuenta como hacerlo completo
  versionMinima: string // lo mínimo en un mal día
  diasGracia: number
  horaRecordatorio: string | null // HH:mm
  activo: boolean
  orden: number
}

export interface RegistroHabito extends Sincronizable {
  habitoId: string
  fecha: string
  estado: 'completo' | 'minimo' | 'omitido'
  nota: string
}

export interface EntradaDiario extends Sincronizable {
  fecha: string
  titulo: string
  texto: string
  etiquetas: string[]
}

export interface CheckinAnimo extends Sincronizable {
  fecha: string
  animo: 1 | 2 | 3 | 4 | 5
  energia: 1 | 2 | 3 | 4 | 5
  nota: string
}

export interface SesionFoco extends Sincronizable {
  fecha: string
  hora: string // HH:mm en que terminó
  titulo: string // en qué se enfocó
  minutos: number
  tareaId: string | null
  bloqueId: string | null
}

export interface RevisionSemanal extends Sincronizable {
  semana: string // lunes de la semana, YYYY-MM-DD
  respuestas: Record<string, string>
  prioridades: string[]
}

export interface Ajuste {
  clave: string
  valor: unknown
}

class RutinaDB extends Dexie {
  categorias!: EntityTable<Categoria, 'id'>
  plantillas!: EntityTable<PlantillaSemana, 'id'>
  usosPlantilla!: EntityTable<UsoPlantilla, 'id'>
  bloques!: EntityTable<BloqueRutina, 'id'>
  cambiosSemana!: EntityTable<CambioSemana, 'id'>
  eventos!: EntityTable<Evento, 'id'>
  tareas!: EntityTable<Tarea, 'id'>
  habitos!: EntityTable<Habito, 'id'>
  registrosHabito!: EntityTable<RegistroHabito, 'id'>
  diario!: EntityTable<EntradaDiario, 'id'>
  animo!: EntityTable<CheckinAnimo, 'id'>
  foco!: EntityTable<SesionFoco, 'id'>
  revisiones!: EntityTable<RevisionSemanal, 'id'>
  ajustes!: EntityTable<Ajuste, 'clave'>

  constructor() {
    super('rutina')
    // Solo se indexan los campos por los que se busca u ordena.
    this.version(1).stores({
      categorias: 'id, actualizado',
      plantillas: 'id, activa, vigenteDesde, actualizado',
      bloques: 'id, plantillaId, dia, actualizado',
      cambiosSemana: 'id, fecha, actualizado',
      eventos: 'id, fecha, actualizado',
      tareas: 'id, fechaLimite, estado, actualizado',
      habitos: 'id, orden, actualizado',
      registrosHabito: 'id, habitoId, fecha, [habitoId+fecha], actualizado',
      diario: 'id, fecha, *etiquetas, actualizado',
      animo: 'id, fecha, actualizado',
      foco: 'id, fecha, actualizado',
      revisiones: 'id, semana, actualizado',
      ajustes: 'clave',
    })
    // v2 (Fase 1): meta del hábito y frecuencia "N veces por semana".
    this.version(2).stores({}).upgrade((tx) =>
      tx
        .table('habitos')
        .toCollection()
        .modify((h: Partial<Habito>) => {
          h.meta ??= ''
          h.vecesPorSemana ??= 3
        }),
    )
    // v3: el uso de las plantillas se elige por semana, en una tabla aparte.
    // Las plantillas vacías no se activan, para no dejar semanas en blanco.
    this.version(3)
      .stores({ usosPlantilla: 'id, desde, plantillaId, actualizado' })
      .upgrade(async (tx) => {
        const plantillas = (await tx.table('plantillas').toArray()) as PlantillaSemana[]
        const bloques = (await tx.table('bloques').toArray()) as BloqueRutina[]
        const vivas = plantillas.filter((p) => !p.borrado && p.vigenteDesde)
        const conBloques = vivas.filter((p) => bloques.some((b) => !b.borrado && b.plantillaId === p.id))
        const usar = conBloques.length ? conBloques : vivas
        const ahora = new Date().toISOString()
        await tx.table('usosPlantilla').bulkAdd(
          usar.map((p) => ({ id: crypto.randomUUID(), actualizado: ahora, borrado: false, plantillaId: p.id, tipo: 'desde', desde: lunesDe(p.vigenteDesde) })),
        )
      })
  }
}

function lunesDe(iso: string): string {
  const d = new Date(iso + 'T12:00:00')
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return d.toLocaleDateString('sv-SE')
}

export const db = new RutinaDB()

/** Crea los campos de sincronización para una fila nueva. */
export function nuevo<T extends object>(datos: T): T & Sincronizable {
  return { ...datos, id: crypto.randomUUID(), actualizado: new Date().toISOString(), borrado: false }
}

export async function leerAjuste<T>(clave: string, porDefecto: T): Promise<T> {
  const fila = await db.ajustes.get(clave)
  return fila ? (fila.valor as T) : porDefecto
}

export async function guardarAjuste(clave: string, valor: unknown) {
  await db.ajustes.put({ clave, valor })
}

type DatosHabito = Omit<Habito, keyof Sincronizable>

export const habitoVacio: DatosHabito = {
  nombre: '',
  frecuencia: 'diaria',
  dias: [],
  vecesPorSemana: 3,
  disparador: '',
  meta: '',
  versionMinima: '',
  diasGracia: 2,
  horaRecordatorio: null,
  activo: true,
  orden: 0,
}

/** Completa Lectura y Gimnasio de quien venía de la Fase 0 (solo si seguían vacíos). */
const ejemplos: DatosHabito[] = [
  { ...habitoVacio, nombre: 'Lectura', frecuencia: 'diaria', disparador: 'clases', meta: 'Leer un capítulo', orden: 1 },
  { ...habitoVacio, nombre: 'Gimnasio', frecuencia: 'dias', dias: [1, 3, 5], disparador: 'desayunar', meta: '1 hora de gimnasio', orden: 2 },
]

/** Actualiza datos de usuarios que venían de versiones anteriores. */
export async function sembrarDatosIniciales() {
  // Los usuarios nuevos pasan por la bienvenida, que decide si cargar ejemplos.
  if (!(await leerAjuste('sembrado', false))) return
  // Quien venía de la Fase 0 tiene Lectura y Gimnasio sin configurar: se completan
  // con los ejemplos solo si siguen vacíos, para no pisar cambios propios.
  if (await leerAjuste('ejemplosFase1', false)) return
  await db.transaction('rw', db.habitos, db.ajustes, async () => {
    for (const e of ejemplos) {
      const h = await db.habitos.filter((x) => x.nombre === e.nombre && !x.borrado).first()
      if (h && !h.disparador && !h.meta) {
        const { orden: _orden, activo: _activo, ...config } = e
        await db.habitos.update(h.id, { ...config, actualizado: new Date().toISOString() })
      }
    }
    await guardarAjuste('ejemplosFase1', true)
  })
}

/** Guarda un hábito nuevo o editado. */
export async function guardarHabito(datos: DatosHabito, id?: string) {
  if (id) {
    await db.habitos.update(id, { ...datos, actualizado: new Date().toISOString() })
    return id
  }
  const ultimo = await db.habitos.orderBy('orden').last()
  const fila = nuevo({ ...datos, orden: (ultimo?.orden ?? 0) + 1 })
  await db.habitos.add(fila)
  return fila.id
}

export async function cambiarHabito(id: string, cambios: Partial<Habito>) {
  await db.habitos.update(id, { ...cambios, actualizado: new Date().toISOString() })
}

/**
 * Registra el estado de un hábito en una fecha. `null` borra el registro.
 * Reutiliza la fila existente para no dejar duplicados (importa para la sincronización).
 */
export async function registrarHabito(habitoId: string, fecha: string, estado: RegistroHabito['estado'] | null) {
  const ahora = new Date().toISOString()
  const existentes = await db.registrosHabito.where('[habitoId+fecha]').equals([habitoId, fecha]).toArray()
  const [principal, ...sobrantes] = existentes
  for (const x of sobrantes) await db.registrosHabito.update(x.id, { borrado: true, actualizado: ahora })
  if (principal) {
    await db.registrosHabito.update(principal.id, estado ? { estado, borrado: false, actualizado: ahora } : { borrado: true, actualizado: ahora })
  } else if (estado) {
    await db.registrosHabito.add(nuevo({ habitoId, fecha, estado, nota: '' }))
  }
}
