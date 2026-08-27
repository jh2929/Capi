# Notas de migración — Capi / capi TV

> Documenta desviaciones intencionales respecto a OpenTune para que nadie
> intente "corregirlas" sin saber por qué.

## 1. `androidx.tv:tv-foundation` (1.0.0) — sin TvLazy

Google retiró `TvLazyRow` / `TvLazyColumn` del artefacto estable
`androidx.tv:tv-foundation`. El antiguo módulo `androidx.tv:tv-foundation-lazy`
**no existe** en Google Maven para ninguna versión (404 verificado en 1.0.0,
1.0.1–1.1.0 y alphas). Consecuencia:

- Se usan `LazyRow` / `LazyColumn` de Compose estándar.
- El scroll al navegar con D-pad se implementa a mano:
  `onFocusChanged { focusedIndex = índice }` + `LaunchedEffect(focusedIndex)`
  → `listState.animateScrollToItem(índice)`.
- Patrón canónico en `TvSectionRow` (TvWidgets.kt); copiado en la cola de
  `TvPlayerScreen`.

No reintroducir `TvLazyColumn` ni `tv-foundation-lazy`.

## 2. `androidx.tv:tv-material` — NO usar

- `tv-material:1.1.0` exige `tv-foundation:1.1.0`, que no existe.
- `tv-material:1.0.1` es de la era Compose 1.6.8 e incompatible con
  Compose 1.11.0-rc01 forzado por `resolutionStrategy`.

## 3. `material-icons-extended`

Se añadió `implementation(libs.compose.material.icons.extended)` al módulo
`app` porque la UI TV usa iconos `Icons.Rounded.*` (QueueMusic, Shuffle…
). El móvil nunca los necesitó, por eso no estaba.

## 4. Composition locals fuera de MainActivity

`LocalDatabase`, `LocalPlayerConnection`, `LocalDownloadUtil`,
`LocalSyncUtils` son **top-level** en el paquete `com.capi.music` (no
anidados en `MainActivity`). Importar desde `com.capi.music.*`, no desde
`com.capi.music.MainActivity`.

## 5. ViewModels TV

- `TvSearchViewModel` y `TvLibraryViewModel` son ViewModels planos (sin
  Hilt): reciben la DB por constructor desde `LocalDatabase.current`.
- `TvHomeScreen` usa `hiltViewModel()` (válido porque `TvMainActivity` es
  `@AndroidEntryPoint`).
- `AlbumViewModel` / `ArtistViewModel` / `OnlinePlaylistViewModel` se
  construyen manualmente con `SavedStateHandle(mapOf("albumId" to id))`,
  igual que en las pantallas móviles.

## 6. Búsqueda TV

`TvSearchViewModel` duplica deliberadamente un fragmento de
`OnlineSearchViewModel` (debounce 400 ms, `HideExplicitKey`/`HideVideoKey`
vía `context.dataStore.get(...)`) para no acoplarse al flujo mobile.

## 7. Consultas de base de datos

`database.playlistSongs(id).first()` se lee dentro de `scope.launch` en
`TvLibraryScreen` (las DAOs expuestas para TV son las consultas `ejem` de
playlists por id; no se inventaron nuevos endpoints).

## 8. Firma/release

- El APK de debug (`capi-universal-debug.apk`) es el artifact que la CI
  publica en Releases; la release firmada requiere ejecutar el workflow
  sobre un tag `v*` y aprovisionar las claves ensecrets.
- El updater ya apunta a `jh2929/Capi-TV`; el fallback `fetchGitCommitHash`
  (API pública de Arturo254) es cosmético: si la API deja de estar
  disponible, ignorar.