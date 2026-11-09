/**
 * Ratoncito del Pomodoro, en el estilo del logo (cara en gota, orejas grandes, verde salvia).
 * - estudia: sentado leyendo un libro que pasa de página.
 * - descansa: acostado durmiendo, con "z" que suben.
 * - espera: sentado al lado de un queso, parpadea.
 * Las animaciones se apagan si el sistema pide reducir movimiento.
 */
type Modo = 'estudia' | 'descansa' | 'espera'

const VERDE = '#3F7D5C'
const VERDE_OSCURO = '#1F3A2B'
const SALVIA = '#CFE3D6'
const CONTORNO = '#2C5A41'

const ESTILOS = `
.rt-cabeceo{animation:rt-cabeceo 3.2s ease-in-out infinite;transform-box:fill-box;transform-origin:50% 90%}
.rt-cola{animation:rt-cola 2.6s ease-in-out infinite;transform-box:fill-box;transform-origin:0% 50%}
.rt-hoja{animation:rt-hoja 4s ease-in-out infinite;transform-box:fill-box;transform-origin:0% 50%}
.rt-respira{animation:rt-respira 3.6s ease-in-out infinite;transform-box:fill-box;transform-origin:50% 100%}
.rt-parpadeo{animation:rt-parpadeo 4.5s infinite;transform-box:fill-box;transform-origin:50% 50%}
.rt-z{animation:rt-z 3.6s ease-out infinite;opacity:0}
.rt-z2{animation-delay:1.2s}.rt-z3{animation-delay:2.4s}
@keyframes rt-cabeceo{0%,100%{transform:translateY(0) rotate(0)}50%{transform:translateY(1.5px) rotate(-2deg)}}
@keyframes rt-cola{0%,100%{transform:rotate(0)}50%{transform:rotate(-14deg)}}
@keyframes rt-hoja{0%,40%{transform:scaleX(1)}55%,100%{transform:scaleX(-1)}}
@keyframes rt-respira{0%,100%{transform:scaleY(1)}50%{transform:scaleY(1.06)}}
@keyframes rt-parpadeo{0%,92%,100%{transform:scaleY(1)}95%{transform:scaleY(0.1)}}
@keyframes rt-z{0%{opacity:0;transform:translate(0,0)}20%{opacity:1}100%{opacity:0;transform:translate(10px,-26px)}}
@media (prefers-reduced-motion: reduce){.rt-cabeceo,.rt-cola,.rt-hoja,.rt-respira,.rt-parpadeo,.rt-z{animation:none}.rt-z{opacity:1}}
`

/** Cabeza del logo (dibujada en el espacio de 512 px del logo y escalada). */
function Cabeza({ x, y, escala, rotar = 0, ojos }: { x: number; y: number; escala: number; rotar?: number; ojos: 'abiertos' | 'abajo' | 'cerrados' }) {
  const ojoY = ojos === 'abajo' ? 282 : 266
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotar}) scale(${escala}) translate(-256 -290)`}>
      <circle cx="166" cy="178" r="80" fill="#fff" stroke={CONTORNO} strokeWidth="7" />
      <circle cx="346" cy="178" r="80" fill="#fff" stroke={CONTORNO} strokeWidth="7" />
      <circle cx="160" cy="174" r="47" fill={SALVIA} />
      <circle cx="352" cy="174" r="47" fill={SALVIA} />
      <path d="M256 408 C226 408 150 338 146 270 C142 206 196 172 256 172 C316 172 370 206 366 270 C362 338 286 408 256 408 Z" fill="#fff" stroke={CONTORNO} strokeWidth="7" />
      {ojos === 'cerrados' ? (
        <g stroke={VERDE_OSCURO} strokeWidth="10" strokeLinecap="round" fill="none">
          <path d="M196 268 q18 14 36 0" />
          <path d="M280 268 q18 14 36 0" />
        </g>
      ) : (
        <g className={ojos === 'abiertos' ? 'rt-parpadeo' : undefined}>
          <circle cx="214" cy={ojoY} r="15" fill={VERDE_OSCURO} />
          <circle cx="298" cy={ojoY} r="15" fill={VERDE_OSCURO} />
        </g>
      )}
      <ellipse cx="256" cy="386" rx="20" ry="15" fill={VERDE_OSCURO} />
      <g stroke={CONTORNO} strokeWidth="7" strokeLinecap="round" fill="none" opacity="0.8">
        <path d="M176 334 L96 318" />
        <path d="M182 354 L104 370" />
        <path d="M336 334 L416 318" />
        <path d="M330 354 L408 370" />
      </g>
    </g>
  )
}

function Queso({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M0 30 L44 30 L44 8 Z" fill="#F2CF66" stroke="#C99A2E" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M0 30 L44 8 L36 4 Z" fill="#F7DE8E" stroke="#C99A2E" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="30" cy="22" r="3.2" fill="#D9AE45" />
      <circle cx="38" cy="15" r="2.2" fill="#D9AE45" />
      <circle cx="18" cy="26" r="2" fill="#D9AE45" />
    </g>
  )
}

export default function Ratoncito({ modo, tamano = 200 }: { modo: Modo; tamano?: number }) {
  const etiqueta = modo === 'estudia' ? 'Ratoncito estudiando' : modo === 'descansa' ? 'Ratoncito durmiendo la siesta' : 'Ratoncito esperando con su queso'
  return (
    <svg viewBox="0 0 220 170" width={tamano} height={(tamano * 170) / 220} role="img" aria-label={etiqueta}>
      <style>{ESTILOS}</style>
      {/* sombra */}
      <ellipse cx="112" cy="160" rx="70" ry="6" fill={VERDE} opacity="0.12" />

      {modo === 'estudia' && (
        <>
          <path className="rt-cola" d="M146 140 C172 150 192 136 184 114" fill="none" stroke={SALVIA} strokeWidth="5" strokeLinecap="round" />
          <ellipse cx="110" cy="120" rx="40" ry="34" fill="#fff" stroke={CONTORNO} strokeWidth="1.6" />
          <g className="rt-cabeceo">
            <Cabeza x={110} y={70} escala={0.24} ojos="abajo" />
          </g>
          {/* libro */}
          <path d="M66 130 L110 140 L110 160 L66 150 Z" fill={VERDE} />
          <path d="M110 140 L154 130 L154 150 L110 160 Z" fill={VERDE} />
          <path d="M70 128 L110 137 L110 155 L70 146 Z" fill="#fff" stroke={CONTORNO} strokeWidth="0.8" />
          <path d="M110 137 L150 128 L150 146 L110 155 Z" fill="#fff" stroke={CONTORNO} strokeWidth="0.8" />
          <g stroke={SALVIA} strokeWidth="1.4">
            <path d="M78 134 L104 140" />
            <path d="M78 140 L104 146" />
            <path d="M116 140 L142 134" />
            <path d="M116 146 L142 140" />
          </g>
          <path className="rt-hoja" d="M110 137 L146 129 L146 147 L110 155 Z" fill="#F7FAF8" stroke={CONTORNO} strokeWidth="0.8" />
          {/* patitas sobre el libro */}
          <ellipse cx="92" cy="132" rx="7" ry="5" fill="#fff" stroke={CONTORNO} strokeWidth="1.2" />
          <ellipse cx="128" cy="132" rx="7" ry="5" fill="#fff" stroke={CONTORNO} strokeWidth="1.2" />
        </>
      )}

      {modo === 'descansa' && (
        <>
          <path className="rt-cola" d="M168 142 C196 146 200 162 174 160" fill="none" stroke={SALVIA} strokeWidth="5" strokeLinecap="round" />
          <g className="rt-respira">
            <ellipse cx="124" cy="134" rx="54" ry="24" fill="#fff" stroke={CONTORNO} strokeWidth="1.6" />
          </g>
          <Queso x={36} y={128} s={0.9} />
          <Cabeza x={70} y={116} escala={0.22} rotar={-24} ojos="cerrados" />
          <ellipse cx="104" cy="152" rx="8" ry="4.5" fill="#fff" stroke={CONTORNO} strokeWidth="1.2" />
          <g fill={VERDE} fontFamily="inherit" fontWeight="700">
            <text className="rt-z" x="98" y="66" fontSize="14">z</text>
            <text className="rt-z rt-z2" x="110" y="56" fontSize="17">z</text>
            <text className="rt-z rt-z3" x="124" y="46" fontSize="20">Z</text>
          </g>
        </>
      )}

      {modo === 'espera' && (
        <>
          <path className="rt-cola" d="M136 142 C164 152 182 136 174 114" fill="none" stroke={SALVIA} strokeWidth="5" strokeLinecap="round" />
          <ellipse cx="100" cy="122" rx="38" ry="34" fill="#fff" stroke={CONTORNO} strokeWidth="1.6" />
          <Cabeza x={100} y={70} escala={0.24} ojos="abiertos" />
          <ellipse cx="86" cy="150" rx="8" ry="5" fill="#fff" stroke={CONTORNO} strokeWidth="1.2" />
          <ellipse cx="114" cy="150" rx="8" ry="5" fill="#fff" stroke={CONTORNO} strokeWidth="1.2" />
          <Queso x={150} y={124} s={1.1} />
        </>
      )}
    </svg>
  )
}
