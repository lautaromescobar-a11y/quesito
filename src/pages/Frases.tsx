import { useState, type FormEvent } from 'react'
import { botonChico, botonPrincipal, campo } from '../components/ui'
import { elegirFrase, todasLasFrases } from '../lib/frases'
import { hoyISO } from '../lib/fechas'
import { cambiarFrasesPref, useFrasesPref } from '../lib/usePrefs'

export default function Frases() {
  const pref = useFrasesPref()
  const [nueva, setNueva] = useState('')
  const [verOcultas, setVerOcultas] = useState(false)
  const [otra, setOtra] = useState(0)
  if (!pref) return null

  const delDia = elegirFrase(pref, 'dia', otra ? `${hoyISO()}-${otra}` : hoyISO())
  const lista = todasLasFrases(pref, true).filter((f) => verOcultas || !pref.ocultas.includes(f.id))
  const ocultas = pref.ocultas.length

  const alternar = (campoPref: 'favoritas' | 'ocultas', id: string) =>
    cambiarFrasesPref((p) => ({ ...p, [campoPref]: p[campoPref].includes(id) ? p[campoPref].filter((x) => x !== id) : [...p[campoPref], id] }))

  const agregar = async (e: FormEvent) => {
    e.preventDefault()
    if (!nueva.trim()) return
    await cambiarFrasesPref((p) => ({ ...p, propias: [...p.propias, { id: `p-${crypto.randomUUID()}`, texto: nueva.trim() }] }))
    setNueva('')
  }

  const borrarPropia = (id: string) => cambiarFrasesPref((p) => ({ ...p, propias: p.propias.filter((x) => x.id !== id), favoritas: p.favoritas.filter((x) => x !== id) }))

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="text-[38px] font-semibold tracking-tight">Frases</h1>
        <p className="text-[15px] text-texto-suave">
          Ideas para sostener tus hábitos. Aparecen en Hoy y cuando marcás un hábito. Las del libro están escritas con otras palabras a partir de <em>Hábitos atómicos</em> de James Clear.
        </p>
      </header>

      {delDia && (
        <section className="rounded-[20px] bg-acento-suave p-7">
          <p className="text-sm font-medium text-acento-fuerte">Frase del día</p>
          <p className="mt-2 text-2xl font-semibold leading-snug">{delDia.texto}</p>
          {delDia.idea && <p className="mt-2 text-sm text-texto-suave">{delDia.idea}</p>}
          <button type="button" className={`${botonChico} mt-4 bg-superficie`} onClick={() => setOtra(otra + 1)}>Mostrame otra</button>
        </section>
      )}

      <form onSubmit={agregar} className="flex flex-wrap gap-3 rounded-[20px] bg-superficie p-4">
        <label htmlFor="frase-nueva" className="sr-only">Nueva frase propia</label>
        <input id="frase-nueva" className={`${campo} min-w-64 flex-1`} placeholder="Agregá una frase tuya o de alguien que te inspire" value={nueva} onChange={(e) => setNueva(e.target.value)} />
        <button type="submit" className={botonPrincipal}>Agregar</button>
      </form>

      <section className="rounded-[20px] bg-superficie p-7">
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold">Todas las frases</h2>
          {ocultas > 0 && (
            <button type="button" className="text-sm font-medium text-acento" onClick={() => setVerOcultas(!verOcultas)}>
              {verOcultas ? 'Esconder las ocultas' : `Ver ocultas (${ocultas})`}
            </button>
          )}
        </div>
        <ul>
          {lista.map((f) => {
            const fav = pref.favoritas.includes(f.id)
            const oculta = pref.ocultas.includes(f.id)
            return (
              <li key={f.id} className={`flex items-start gap-3 border-t border-linea py-3 ${oculta ? 'opacity-50' : ''}`}>
                <button type="button" onClick={() => alternar('favoritas', f.id)} aria-pressed={fav} aria-label={fav ? 'Quitar de favoritas' : 'Marcar como favorita'} title={fav ? 'Favorita: aparece más seguido' : 'Marcar como favorita'} className={`mt-0.5 h-8 w-8 shrink-0 rounded-full text-lg ${fav ? 'text-amber-500' : 'text-texto-suave hover:text-amber-500'}`}>
                  {fav ? '★' : '☆'}
                </button>
                <span className="flex-1">
                  <span className="block text-[15px]">{f.texto}</span>
                  <span className="block text-xs text-texto-suave">{f.propia ? 'Tuya' : f.idea}</span>
                </span>
                {f.propia ? (
                  <button type="button" className={botonChico} onClick={() => borrarPropia(f.id)}>Borrar</button>
                ) : (
                  <button type="button" className={botonChico} onClick={() => alternar('ocultas', f.id)}>{oculta ? 'Mostrar' : 'Ocultar'}</button>
                )}
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
