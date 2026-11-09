# Quesito

App personal de rutina, hábitos y diario. PWA hecha con React + TypeScript + Vite.
Los datos se guardan en tu PC (IndexedDB, mediante Dexie).

## Comandos

| Comando | Qué hace |
| --- | --- |
| `npm install` | Descarga las dependencias (solo la primera vez o cuando cambian) |
| `npm run dev` | Abre la app en modo desarrollo en http://localhost:5173 |
| `npm run build` | Genera la versión final en la carpeta `dist` |
| `npm run preview` | Sirve la versión final en http://localhost:4173 |

## Estructura

```
src/
  main.tsx              Punto de entrada: carga tema y hábitos iniciales
  App.tsx               Menú lateral y rutas de cada sección
  index.css             Variables de tema (colores y tipografía)
  lib/db.ts             Base de datos local: las 13 tablas del plan
  lib/notificaciones.ts Permiso, notificación de prueba y recordatorios
  lib/tema.ts           Modo claro / oscuro / según Windows
  pages/                Una pantalla por sección
  components/           Piezas de interfaz reutilizables
public/                 Íconos de la app
vite.config.ts          Configuración de Vite y de la PWA (instalación)
```

## Qué incluye hasta ahora

- **Hoy:** saludo, progreso de hábitos, rutina del día con el bloque actual y tareas que vencen pronto.
- **Tareas:** carga rápida, fecha límite, prioridad, contador en el menú.
- **Hábitos:** frecuencia diaria, por días o N por semana; meta, versión mínima, días de gracia, recordatorio; rachas y mapa de calor.
- **Rutina:** semana y mes; cambios de un solo día; eventos con repetición; elegir plantilla por semana.
- **Plantillas:** semanas tipo (por cuatrimestre, vacaciones…), duplicar, actividades guardadas, repetir un bloque en varios días.
- App instalable, funciona sin internet, modo claro/oscuro, notificaciones mientras está abierta.

Los datos se guardan en el navegador (IndexedDB, base interna `rutina`). El nombre interno de la base no cambia para no perder datos.
