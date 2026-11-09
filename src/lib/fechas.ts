/** Fecha local en formato YYYY-MM-DD. */
export function aISO(d: Date): string {
  return d.toLocaleDateString('sv-SE')
}

export function hoyISO(): string {
  return aISO(new Date())
}

/** Los últimos `n` días terminando hoy, del más viejo al más nuevo. */
export function ultimosDias(n: number): string[] {
  const dias: string[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    dias.push(aISO(d))
  }
  return dias
}

/** "Domingo 1 de noviembre" */
export function fechaLarga(d = new Date()): string {
  const t = d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }).replace(',', '')
  return t.charAt(0).toUpperCase() + t.slice(1)
}

/** Inicial del día de la semana: "L", "M", ... */
export function inicialDia(iso: string): string {
  const d = new Date(iso + 'T12:00:00')
  return ['D', 'L', 'M', 'M', 'J', 'V', 'S'][d.getDay()]
}

export function saludo(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Buen día'
  if (h < 20) return 'Buenas tardes'
  return 'Buenas noches'
}

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

export function deISO(iso: string): Date {
  return new Date(iso + 'T12:00:00')
}

export function nombreDia(iso: string): string {
  return DIAS[deISO(iso).getDay()]
}

export function nombreMes(mes: number): string {
  return MESES[mes - 1]
}

/** "lun 2 nov" */
export function fechaCorta(iso: string): string {
  const d = deISO(iso)
  return `${DIAS[d.getDay()].slice(0, 3)} ${d.getDate()} ${MESES[d.getMonth()].slice(0, 3)}`
}

/** "Hoy", "Mañana", "Ayer", "Vencida hace 3 días" o "lun 2 nov". */
export function fechaRelativa(iso: string, hoy = hoyISO()): string {
  const dif = Math.round((deISO(iso).getTime() - deISO(hoy).getTime()) / 86_400_000)
  if (dif === 0) return 'Hoy'
  if (dif === 1) return 'Mañana'
  if (dif === -1) return 'Ayer'
  if (dif < 0) return `Hace ${-dif} días`
  if (dif < 7) return `${DIAS[deISO(iso).getDay()].charAt(0).toUpperCase()}${DIAS[deISO(iso).getDay()].slice(1)}`
  return fechaCorta(iso)
}
