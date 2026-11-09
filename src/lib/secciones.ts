/** Secciones del menú (además de Hoy y Tareas, que tienen su lugar propio). */
export type Seccion = { ruta: string; nombre: string; sub?: boolean }

export const secciones: Seccion[] = [
  { ruta: '/habitos', nombre: 'Hábitos' },
  { ruta: '/rutina', nombre: 'Rutina' },
  { ruta: '/plantillas', nombre: 'Plantillas', sub: true },
  { ruta: '/diario', nombre: 'Diario' },
  { ruta: '/animo', nombre: 'Ánimo' },
  { ruta: '/foco', nombre: 'Foco' },
  { ruta: '/revision', nombre: 'Revisión' },
  { ruta: '/estadisticas', nombre: 'Estadísticas' },
  { ruta: '/ajustes', nombre: 'Ajustes' },
]
