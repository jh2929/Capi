# Directrices de UI TV — Capi

> Objetivo: experiencia Android TV/Google TV coherente, usable y accesible,
> priorizando la navegación con mando (D-pad), no el touch.

## 1. Foco

- Todo elemento interactivo usa `Modifier.tvFocusable(...)` (definido en
  `components/TvFocus.kt`): dibuja anillo del `colorScheme.primary`,
  escala 1.03 con `animateFloatAsState`, `clip` al `shape` dado y `clickable`
  para que D-pad/CENTER dispare `onClick`.
- Fuera de `tvFocusable`, se añade `.onFocusChanged` **solo** cuando hace
  falta comportamiento extra (p. ej. scroll automático de listas).
- **Nunca** se usa `clickable` a secas en elementos TV salvo que el elemento
  sea secundario: el anillo de foco es obligatorio para la percepción del
  cursor.

## 2. Navegación

- Rail izquierdo siempre visible: Inicio, Buscar, Biblioteca, Ajustes
  (ver `TvApp.kt`). El foco del rail recuerda el último ítem ampliando la
  barra cuando `isSelected`.
- Rows con `LazyRow` + `animateScrollToItem` cuando el foco sale de los
  bordes (patrón en `TvSectionRow`). Nada de scroll por rueda free.
- BACK: pop de pila; en raíz se degrada a primer plano de la app
  (no cierra el servicio).

## 3. Tipografía y tarjetas

- `TvCard`: 16:10 (160×100dp), borde `extraLarge`, subtítulo secundario,
  `onClick` opcional y `focused` escala por el modifier de foco.
- `TvSongCard`: thumbnail + portada + título (2 líneas) + artista,
  `onClick` opcional.
- Títulos de sección: `titleLarge` SemiBold; nombre de la app en Home:
  `headlineMedium` Bold en `primary`.

## 4. Accesibilidad

- `contentDescription` en iconos y thumbnails relevantes.
- Textos con `maxLines`/`overflow = Ellipsis`; `fontWeight` correcto en
  elementos de lista.
- Soporte `leanback required="false"`, `touchscreen required="false"` y
  `microphone required="false"` en el manifest: la app TV se instala y
  funciona sin micrófono.

## 5. Landscape obligatorio

- `TvMainActivity` es `screenOrientation="landscape"`; la UI asume
  orientación horizontal (pantalla dividida player/cola) y se empaqueta
  como overlay del móvil.

## 6. Strings

- Todas las cadenas visibles viven en `values/capi_strings.xml` con prefijo
  `tv_` (ej. `tv_queue`, `tv_search_hint`). No hardcodear textos.