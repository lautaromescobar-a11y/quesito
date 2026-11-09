import { guardarAjuste, leerAjuste } from './db'

export type Tema = 'claro' | 'oscuro' | 'sistema'

export function aplicarTema(tema: Tema) {
  const oscuro = tema === 'oscuro' || (tema === 'sistema' && matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', oscuro)
}

export async function cargarTema(): Promise<Tema> {
  const tema = await leerAjuste<Tema>('tema', 'sistema')
  aplicarTema(tema)
  return tema
}

export async function cambiarTema(tema: Tema) {
  aplicarTema(tema)
  await guardarAjuste('tema', tema)
}
