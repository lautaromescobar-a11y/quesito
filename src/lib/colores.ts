/** Paleta para bloques y eventos. Se ve bien en modo claro y oscuro porque se mezcla con el fondo. */
export const COLORES = [
  { nombre: 'Salvia', hex: '#7FB394' },
  { nombre: 'Verde', hex: '#8CC08F' },
  { nombre: 'Gris', hex: '#A8B0AC' },
  { nombre: 'Amarillo', hex: '#F2CF66' },
  { nombre: 'Naranja', hex: '#F0B27A' },
  { nombre: 'Rosa', hex: '#E7A9B5' },
  { nombre: 'Malva', hex: '#D6A2C4' },
  { nombre: 'Lavanda', hex: '#B3A6D9' },
  { nombre: 'Celeste', hex: '#7FA8E0' },
  { nombre: 'Azul', hex: '#4F7BD1' },
  { nombre: 'Ciruela', hex: '#A0627F' },
] as const

export const COLOR_POR_DEFECTO = '#7FB394'

/** Fondo suave del bloque: el color mezclado con la superficie (claro u oscuro). */
export function fondoSuave(hex: string, porcentaje = 32): string {
  return `color-mix(in srgb, ${hex} ${porcentaje}%, var(--color-superficie))`
}
