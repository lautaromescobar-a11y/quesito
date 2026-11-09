import { db, guardarAjuste, habitoVacio, nuevo, type BloqueRutina, type DiaSemana, type Habito, type PlantillaSemana, type Sincronizable, type Tarea, type UsoPlantilla } from './db'
import { NOMBRE_APP } from './app'
import { hoyISO } from './fechas'
import { inicioSemana, sumarDias } from './rachas'

type Sin<T> = Omit<T, keyof Sincronizable>

/** Marca la bienvenida como hecha. Con `conEjemplos` carga datos de muestra genéricos para aprender a usar la app. */
export async function terminarBienvenida(nombre: string, conEjemplos: boolean) {
  await db.transaction('rw', [db.habitos, db.plantillas, db.bloques, db.usosPlantilla, db.tareas, db.ajustes], async () => {
    if (conEjemplos) {
      await db.habitos.bulkAdd([
        nuevo<Sin<Habito>>({ ...habitoVacio, nombre: 'Leer', disparador: 'cenar', meta: '10 minutos', versionMinima: '1 página', orden: 1 }),
        nuevo<Sin<Habito>>({ ...habitoVacio, nombre: 'Moverme', frecuencia: 'dias', dias: [1, 3, 5], disparador: 'desayunar', meta: '30 minutos', versionMinima: '5 minutos de estiramiento', orden: 2 }),
      ])

      const p = nuevo<Sin<PlantillaSemana>>({ nombre: 'Mi semana', vigenteDesde: '', vigenteHasta: null, activa: true })
      await db.plantillas.add(p)
      await db.usosPlantilla.add(nuevo<Sin<UsoPlantilla>>({ plantillaId: p.id, tipo: 'desde', desde: inicioSemana(hoyISO()) }))
      const semana: [DiaSemana[], string, string, string, string][] = [
        [[1, 2, 3, 4, 5], '07:30', '08:00', 'Desayuno', '#F2CF66'],
        [[1, 2, 3, 4, 5], '09:00', '13:00', 'Estudio o trabajo', '#7FA8E0'],
        [[1, 2, 3, 4, 5, 6, 0], '13:00', '14:00', 'Almuerzo', '#F2CF66'],
        [[1, 2, 3, 4, 5], '14:00', '17:00', 'Estudio o trabajo', '#7FA8E0'],
        [[1, 3, 5], '18:00', '19:00', 'Moverme', '#8CC08F'],
        [[1, 2, 3, 4, 5, 6, 0], '23:00', '24:00', 'Dormir', '#A0627F'],
      ]
      await db.bloques.bulkAdd(
        semana.flatMap(([dias, inicio, fin, titulo, color]) =>
          dias.map((dia) => nuevo<Sin<BloqueRutina>>({ plantillaId: p.id, dia, inicio, fin, titulo, color, notas: '', categoriaId: null })),
        ),
      )
      await db.tareas.add(nuevo<Sin<Tarea>>({ titulo: `Recorrer ${NOMBRE_APP} y ajustar la semana tipo`, fechaLimite: sumarDias(hoyISO(), 2), prioridad: 'media', estado: 'pendiente', categoriaId: null }))
    }
    await guardarAjuste('nombre', nombre.trim())
    // Flags de versiones anteriores, para que no se vuelvan a aplicar.
    await guardarAjuste('sembrado', true)
    await guardarAjuste('ejemplosFase1', true)
    await guardarAjuste('ejemplosFase2', true)
  })
}
