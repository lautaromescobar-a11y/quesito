import { NOMBRE_APP } from '../lib/app'
import { esIPhone, instalar, useInstalar } from '../lib/instalar'
import Tarjeta from './Tarjeta'
import { botonPrincipal } from './ui'

export default function AjustesInstalar() {
  const estado = useInstalar()
  return (
    <Tarjeta titulo={`Instalar ${NOMBRE_APP}`}>
      {estado === 'instalada' && <p className="text-sm">Ya está instalada en este dispositivo. ✓</p>}
      {estado === 'disponible' && (
        <>
          <p className="mb-3 text-sm">Instalala para abrirla como una app más, con su ícono y en su propia ventana.</p>
          <button type="button" className={botonPrincipal} onClick={() => void instalar()}>
            Instalar {NOMBRE_APP}
          </button>
        </>
      )}
      {estado === 'manual' &&
        (esIPhone() ? (
          <p className="text-sm">
            En iPhone: abrila en <strong>Safari</strong>, tocá <strong>Compartir</strong> (el cuadrado con la flecha) y elegí <strong>Agregar a inicio</strong>.
          </p>
        ) : (
          <p className="text-sm">
            Si ya la instalaste, abrila desde el menú Inicio. Si no: en Chrome tocá los tres puntitos <strong>⋮</strong> → <strong>Transmitir, guardar y compartir</strong> →{' '}
            <strong>Instalar página como app</strong>. En Edge: <strong>…</strong> → <strong>Aplicaciones</strong> → <strong>Instalar este sitio como una aplicación</strong>.
          </p>
        ))}
    </Tarjeta>
  )
}
