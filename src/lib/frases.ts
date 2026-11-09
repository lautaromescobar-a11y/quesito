/**
 * Frases escritas a partir de las ideas de "Hábitos atómicos" (James Clear).
 * No son citas textuales del libro: están reescritas con palabras propias.
 */
export type Momento = 'dia' | 'marcar' | 'minimo' | 'gracia' | 'nuevo' | 'revision' | 'racha' | 'foco'

export interface Frase {
  id: string
  texto: string
  idea?: string // idea del libro de la que sale
  momentos: Momento[]
  propia?: boolean
}

export const FRASES: Frase[] = [
  { id: 'f01', texto: 'No hace falta un gran salto: mejorar un poquito cada día se acumula.', idea: 'Los hábitos funcionan como el interés compuesto (cap. 1)', momentos: ['dia', 'marcar'] },
  { id: 'f02', texto: 'Que todavía no se note no quiere decir que no esté funcionando.', idea: 'Los resultados aparecen al cruzar un umbral (cap. 1)', momentos: ['dia', 'racha'] },
  { id: 'f03', texto: 'Cuidá el sistema de cada día; la meta llega sola.', idea: 'Sistemas antes que metas (cap. 1)', momentos: ['dia', 'foco'] },
  { id: 'f04', texto: 'Cada vez que lo hacés, votás por la persona que querés ser.', idea: 'Los hábitos construyen identidad (cap. 2)', momentos: ['marcar'] },
  { id: 'f05', texto: 'Preguntate quién querés ser, no solo qué querés lograr.', idea: 'Cambio basado en la identidad (cap. 2)', momentos: ['revision', 'dia'] },
  { id: 'f06', texto: 'Ponele día, hora y lugar: así deja de ser una idea y pasa a ser un plan.', idea: 'Intención de implementación (cap. 5)', momentos: ['nuevo'] },
  { id: 'f07', texto: 'Atalo a algo que ya hacés: "Después de ___, hago ___".', idea: 'Acumulación de hábitos (cap. 5)', momentos: ['nuevo'] },
  { id: 'f08', texto: 'Dejá a la vista lo que te recuerda el hábito bueno.', idea: 'Hacer obvias las señales del ambiente (cap. 6)', momentos: ['nuevo', 'dia'] },
  { id: 'f09', texto: 'Alejarte de la tentación cuesta menos que pelearle.', idea: 'Reducir la exposición a la señal (cap. 7)', momentos: ['dia', 'foco'] },
  { id: 'f10', texto: 'Juntá algo que tenés que hacer con algo que te gusta.', idea: 'Acumulación de tentaciones (cap. 8)', momentos: ['gracia', 'dia'] },
  { id: 'f11', texto: 'Rodeate de gente para la que tu hábito es lo normal.', idea: 'El entorno social marca lo atractivo (cap. 9)', momentos: ['revision'] },
  { id: 'f12', texto: 'Cambiá el "tengo que" por "puedo".', idea: 'Reencuadrar con sentimientos positivos (cap. 10)', momentos: ['dia', 'foco'] },
  { id: 'f13', texto: 'Practicar enseña más que planificar: hacelo aunque no salga perfecto.', idea: 'Acción antes que movimiento (cap. 11)', momentos: ['dia', 'foco'] },
  { id: 'f14', texto: 'Lo que forma el hábito es la cantidad de veces, no el tiempo que pasó.', idea: 'La repetición crea automaticidad (cap. 11)', momentos: ['marcar', 'racha'] },
  { id: 'f15', texto: 'Dejá todo listo hoy para que mañana sea fácil.', idea: 'Preparar el ambiente (cap. 12)', momentos: ['dia', 'revision'] },
  { id: 'f16', texto: 'Empezá tan chico que no te dé para decir que no.', idea: 'Regla de los dos minutos (cap. 13)', momentos: ['nuevo', 'gracia', 'foco'] },
  { id: 'f17', texto: 'Primero lográ que exista; después lo mejorás.', idea: 'Estandarizar antes de optimizar (cap. 13)', momentos: ['minimo'] },
  { id: 'f18', texto: 'Decidí una vez y que la decisión trabaje por vos.', idea: 'Automatizar y mecanismos de compromiso (cap. 14)', momentos: ['nuevo'] },
  { id: 'f19', texto: 'Date un pequeño premio justo después: lo que se disfruta se repite.', idea: 'Hacerlo satisfactorio (cap. 15)', momentos: ['marcar', 'foco'] },
  { id: 'f20', texto: 'Ver tu progreso también es una recompensa.', idea: 'Registro de hábitos (cap. 16)', momentos: ['marcar', 'racha'] },
  { id: 'f21', texto: 'Fallar un día le pasa a cualquiera; lo importante es volver hoy.', idea: 'No fallar dos veces seguidas (cap. 16)', momentos: ['gracia'] },
  { id: 'f22', texto: 'En un mal día, hacer el mínimo también cuenta.', idea: 'Mantener la cadena aunque sea con poco (cap. 16)', momentos: ['minimo', 'gracia'] },
  { id: 'f23', texto: 'Contarle a alguien tu compromiso lo hace más fácil de sostener.', idea: 'Socio corresponsable (cap. 17)', momentos: ['revision'] },
  { id: 'f24', texto: 'Lo que marca la diferencia es seguir cuando no tenés ganas.', idea: 'Superar el aburrimiento (cap. 19)', momentos: ['racha', 'foco', 'dia'] },
  { id: 'f25', texto: 'Revisá cada tanto: lo automático también se puede mejorar.', idea: 'Reflexión y revisión (cap. 20)', momentos: ['revision'] },
]

/** Número estable a partir de un texto (misma frase todo el día). */
function semilla(texto: string): number {
  let h = 2166136261
  for (let i = 0; i < texto.length; i++) h = Math.imul(h ^ texto.charCodeAt(i), 16777619)
  return h >>> 0
}

/** La frase motivacional del día: la misma todo el día, cambia de un día a otro. */
export function fraseDelDia(fecha: string): Frase {
  return FRASES[semilla(fecha) % FRASES.length]
}
