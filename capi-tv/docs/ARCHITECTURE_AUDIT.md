# Auditoría de Arquitectura — Capi (derivado de OpenTune)

> **Documento:** FASE 0 — Informe de auditoría previo a cualquier modificación.
> **Proyecto base:** OpenTune — https://github.com/Arturo254/OpenTune (licencia GPL-3.0)
> **Fecha de auditoría:** 13 de agosto de 2026
> **Estado:** Solo lectura. Nada del código fue modificado para producir este informe.

---

## 1. Resumen ejecutivo

OpenTune es una aplicación de música en streaming basada en YouTube Music (InnerTube) + Spotify, escrita 100% en Kotlin con Compose Multiplataforma (solo Android), Hilt, Room y Media3/ExoPlayer. Consta de **12 módulos Gradle** (1 app + 11 librerías). No existe **ningún** código ni dependencia de Android TV en el repositorio (cero referencias a `leanback`, `androidx.tv`, `TvMainActivity`).

La decisión arquitectónica más importante para Capi TV: **el estado del reproductor NO vive en la UI ni en un ViewModel**. Vive en `MusicService` (un `MediaLibraryService`) al que la UI se conecta por binding y envuelve con `PlayerConnection` (que expone `StateFlow`s). Esto significa que una segunda Activity TV puede conectarse al **mismo** servicio ya existente sin tocar el core de reproducción.

---

## 2. Stack técnico (versiones exactas)

| Componente | Versión | Nota |
|---|---|---|
| AGP | 9.1.0 | No tocar salvo incompatibilidad real |
| Kotlin | 2.3.20 | JVM 21 |
| KSP | 2.3.6 | |
| Compose | 1.11.0-rc01 | `resolutionStrategy.force` en app |
| Material3 | 1.5.0-alpha18 | |
| Media3 | 1.10.0 | exoplayer, exoplayer-hls, session, okhttp, ui |
| Room | 2.8.4 | DB `song.db`, versión 28, exportSchema |
| Hilt | 2.59.2 | |
| Ktor | 3.4.2 | cliente + servidor (Together/WebSockets) |
| Coil | 3.4.0 | coil3 + network-okhttp |
| Navigation Compose | 2.9.7 | |
| DataStore | 1.2.1 | Preferencias |
| Glance | 1.2.0-rc01 | Widget |
| minSdk / targetSdk / compileSdk | 26 / 36 / 36 | |
| JDK | 21 | toolchain `jvmToolchain(21)` |
| Flavors | ABI × 5 | `universal`, `arm64`, `armeabi`, `x86`, `x86_64` |
| Build types | release (minify) / debug | `.debug` suffix + GIT commit |

**No existen dependencias `androidx.tv:tv-foundation` ni `androidx.tv:tv-material` en el catálogo de versiones.** Deberán añadirse en una versión compatible con Compose 1.11 / minSdk 26.

---

## 3. Módulos Gradle

```
rootProject.name = "OpenTune"
├── :app                     Android app (Compose, Hilt, Room, Media3, widget Glance)
├── :innertube               Cliente InnerTube de YouTube Music (JVM puro, 96 archivos)
├── :spotify                 API Web de Spotify + auth por cookies + matching YTM
├── :kugou                   Letras KuGou (JVM)
├── :lrclib                  Letras LrcLib (JVM)
├── :lastfm                  Scrobblado/API Last.fm (JVM)
├── :simpmusic               Letras SimpMusic (JVM)
├── :betterlyrics            Proveedor BetterLyrics + parser TTML (JVM)
├── :kizzy                   Discord RPC (package propio com.my.kizzy)
├── :canvas                  Arte animado de álbum (librería Android, namespace com.capi.music.canvas)
├── :shazamkit               Reconocimiento de música Shazam (JVM)
└── :jossredconnect          Cliente multimedia JossRed (namespace com.capi.music.jossredconnect)
```

Ninguno de los módulos de librería depende de Compose → el trabajo de UI TV se limita al módulo `:app`.

---

## 4. Dependencias clave / potenciales conflictos para TV

| Área | Decisión |
|---|---|
| Versiones de `androidx.tv` | Debe investigarse versión compatible con Compose 1.11.0-rc01 + Kotlin 2.3.20 (ver sección 13) |
| `resolutionStrategy.force` de Compose | Si tv-foundation arrastra una versión distinta de Compose, hay que forzarla también |
| minSdk 26 | Compatible con Android TV (TV usa API ≥ 21 normalmente; 26 es seguro) |
| Compose BOM no usado | Las versiones se declaran una a una; añadir tv-foundation explícitamente |
| Material3 1.5.0-alpha18 | tv-material requiere alineación con foundation/material de esta generación |

---

## 5. Flujo de reproducción (CORE — NO TOCAR)

```
Stream resolver (YouTube.streamProxy / InnerTube / SpotifyPlaybackResolver)
        ↓  MediaMetadata / MediaItem
MusicService (MediaLibraryService, com.capi.music.playback.MusicService)
        ↓
ExoPlayer (única instancia, creada en onCreate:622-665)
        ├─ setMediaSourceFactory(createMediaSourceFactory())  → ResolvingDataSource(CacheDataSource(OkHttpDataSource))
        ├─ setRenderersFactory(createRenderersFactory())      → DefaultRenderersFactory + CrossfadeAudioProcessor
        ├─ setHandleAudioBecomingNoisy(true)
        ├─ setWakeMode(C.WAKE_MODE_NETWORK)
        ├─ setAudioAttributes(USAGE_MEDIA, CONTENT_TYPE_MUSIC)
        ├─ SeekBack/Forward 5s, device volume control, audio offload configurable
        └─ AudioSink → salida de audio del TV (HDMI/ARC/Bluetooth)
```

Puntos críticos del servicio (con líneas de referencia `playback/MusicService.kt`):
- `onCreate` (622): construcción de ExoPlayer y de `MediaLibrarySession` (678-689) con `MediaLibrarySessionCallback` inyectado.
- Audio focus manual (672, `setupAudioFocusRequest`) + volumen combinado (737-741: `playerVolume × normalizeFactor × audioFocusVolumeFactor × playbackFadeFactor`).
- `createCacheDataSource()` (4283) y `createRenderersFactory()` (4659): cache por `CacheDataSource` con `LazyCache` (DI), sin eviction para descargas.
- Persistencia de cola: archivo `persistent_player_state.data` (constante `PERSISTENT_PLAYER_STATE_FILE` :5197) en `filesDir`, formato `PersistPlayerState`/`PersistQueue` — **debe seguir estable en Capi** (afecta a usuarios de la app: misma clave de archivo).
- Audio: `CrossfadeAudio`/`CrossfadeAudioProcessor`, ecualizador (`EqualizerJson`), `SleepTimer`, normalización (`normalizeFactor`), silence-skipping (`SkipSilenceKey`), recuperación de red (`waitingForNetworkConnection`), stream recovery con revalidación de URLs.
- `onTaskRemoved` (5053), `onDestroy` (4949), hora de parada cuando no hay clientes vinculados (`StopMusicOnTaskClear`).

## 6. MediaSession / MediaController (canal público existente)

- **Servicio:** `MusicService : MediaLibraryService()` — expone `MediaLibrarySession` (678-689) con `onGetSession` (5110) y `setSessionActivity(MainActivity)`.
- **Callback:** `MediaLibrarySessionCallback` (inhabilitado para Android Auto, `toggleLike`/`toggleStartRadio`/`toggleLibrary` inyectados por el servicio) — `playback/MediaLibrarySessionCallback.kt:56`.
- **Conexión interna:** en `onCreate` (704-706) ya se crea un `MediaController` interno al propio servicio (`SessionToken(this, MusicService)`).
- **Receptor de media buttons:** `MediaButtonReceiver` en el manifest → el mando físico (PLAY/PAUSE/NEXT/PREVIOUS) ya funcionará sin cambios, porque Media3 lo enruta a la sesión.
- **Android Auto:** declarado con `automotive_app_desc.xml` (`<uses name="media"/>`) → el framework de Auto ya disfruta del mismo `MediaLibrarySession`. TV se beneficiará igual del estado de sesión.

> **Conclusión TV:** la infraestructura de `MediaController`/`MediaSession` para el control remoto y los media buttons **ya existe y funciona**. La UI TV solo necesita acceder a la sesión o al `PlayerConnection` existente.

## 7. Flujo de conexión UI → reproductor (el puente a reutilizar)

`PlayerConnection` (`playback/PlayerConnection.kt:38-232`) — clase pública creada en `MainActivity.onServiceConnected` (317) tras bindear `MusicService`, expuesta como `LocalPlayerConnection` (composition local, `MainActivity.kt:2113`).

**StateFlows públicos** (colección directa desde Compose con `collectAsState`):
`playbackState`, `playbackParameters`, `isPlaying` (derivado), `mediaMetadata`, `currentSong`, `currentLyrics`, `currentFormat`, `queueTitle`, `queueWindows`, `currentMediaItemIndex`, `currentWindowIndex`, `shuffleModeEnabled`, `repeatMode`, `canSkipPrevious`, `canSkipNext`, `error`, `waitingForNetworkConnection`, `queueRestoreCompleted`.

**Funciones públicas**: `playQueue(queue)`, `startRadioSeamlessly()`, `playNext(item/items)`, `addToQueue(item/items)`, `toggleLike()`, `seekToNext()`, `seekToPrevious()`, `dispose()`. Además expone `val player = service.player` (ExoPlayer directo, usado por la UI móvil para seek/toggle/repeat/shuffle vía `PlayerExt.kt`).

**Patrón de UI móvil (a imitar en TV):**
```kotlin
val playerConnection = LocalPlayerConnection.current ?: return
playerConnection.playQueue(YouTubeQueue.radio(item.toMediaMetadata()))
// reproducción de una canción existente:
playerConnection.player.togglePlayPause() / player.seekTo(pos) / etc.
```

## 8. Flujo de búsqueda

- **Sugerencias:** `OnlineSearchSuggestionViewModel` (`viewmodels/OnlineSearchSuggestionViewModel.kt`) — `YouTube.searchSuggestions(query)` + historial Room (`searchHistory`).
- **Resultados:** `OnlineSearchViewModel` (`viewmodels/OnlineSearchViewModel.kt`) — `query` desde `SavedStateHandle`, `filter`, `YouTube.searchSummary` + `YouTube.search(query, filter)` → `ItemsPage(items: List<YTItem>, continuation)`; `YTItem` sealed: `SongItem | AlbumItem | ArtistItem | PlaylistItem`.
- **Acciones por tipo:** Song → `playQueue(YouTubeQueue.radio(...))`/toggle; Album → ruta `album/{id}`; Artist → `artist/{id}`; Playlist → `online_playlist/{id}`.
- Búsqueda local: `LocalSearchViewModel` (`searchSongs/Artists/Albums/Playlists` en Room).

## 9. Flujo de navegación (móvil)

- Navigation Compose, rutas string en `NavigationBuilder.kt:105-461`; tabs `Screens` (`Screens.kt`): Home, Search, Library, DownloadQueue, MoodAndGenres.
- `MainActivity` (componente único, 1900+ líneas): `BoxWithConstraints` con `NavigationRail`/`FloatingNavigationToolbar`, AppBar/top search composable (navega a `search/{query}`), `NavHost`, mini-player/bottom sheet player, `LocalPlayerConnection`, `LocalDatabase`, `LocalDownloadUtil`, etc.
- Deep links: `opentune://together`, YouTube (watch/playlist/browse/channel), share y `audio/*` — tratados en `handleDeepLinkIntent` (1990-2082).

## 10. Componentes que NO deben modificarse (core)

| Componente | Razón |
|---|---|
| `playback/MusicService.kt` | Corazón del reproductor: cola, persistencia, audio focus, cache, recovery, crossfade, sleep timer. 5200 líneas de lógica validada |
| `playback/PlayerConnection.kt` | Puente oficial UI↔servicio; cualquier cambio rompería toda la UI móvil |
| `playback/MediaLibrarySessionCallback.kt` | Android Auto + sesión externa |
| `playback/queues/*` (`Queue`, `ListQueue`, `YouTubeQueue`, `LocalAlbumRadio`, `LocalMixQueue`, `YouTubeAlbumRadio`, `EmptyQueue`) | Lógica de colas/shuffle/repeat |
| `playback/DownloadUtil.kt` + `ExoDownloadService.kt` | Sistema de descargas |
| `playback/CrossfadeAudio*.kt`, `EqualizerModels.kt`, `SleepTimer.kt` | Post-procesado de audio |
| `models/PersistQueue.kt` / `PersistPlayerState.kt` | Formato persistente en disco (`persistent_player_state.data`) |
| `db/*` (Room) | Base de datos compartida; renombrar paquete exige mantener **mismo esquema** y migraciones |
| `utils/DataStore.kt` + `constants/PreferenceKeys.kt` | Preferencias compartidas; **renombrar claves rompe ajustes existentes** |
| `innertube/`, `spotify/`, `lyrics/`, `together/`, `widget/` | Integraciones |
| `App.kt` (Hilt + Coil factory) | Bootstrap de la app |

## 11. Componentes reutilizables por la UI TV

- `PlayerConnection` + composables que ya consumen su estado (patrón `collectAsState`).
- Todos los ViewModels de contenido: `HomeViewModel`, `OnlineSearchViewModel`, `OnlineSearchSuggestionViewModel`, `AlbumViewModel`, `ArtistViewModel`, `OnlinePlaylistViewModel`, `LocalSearchViewModel`, `LibraryViewModels`, `HistoryViewModel`, `DownloadQueueViewModel` (@HiltViewModel, inyectables sin UI).
- `MusicDatabase` (Room, singleton Hilt), `YouTube` (facade de innertube), repositorios de Spotify.
- `Models`: `MediaMetadata`, `YTItem`/`ItemsPage`, `Song/Album/Artist/Playlist` (Room).
- `Utils`: `ResolveImages`, `NetworkConnectivityObserver`, `DownloadUtil`, `SyncUtils`, `Utils`.
- `ui/utils/KeyUtils.kt` (verificar si ya existe manejo de teclas), `NavControllerUtils`.
- Tema: `OpenTuneTheme` (`ui/theme/Theme.kt`) — el sistema de colores dinámicos/seed no depende de la UI móvil; reutilizable por TV con fuentes grandes.
- Componentes simples: `ChipsRow`, `EmptyPlaceholder`, `Thumbnail` (Coil), `AutoResizeText`.

## 12. Componentes que deben crearse para TV (a partir de FASE 6+)

| Componente | Nota |
|---|---|
| `TvMainActivity` + `TvApp` (si hace falta) | Entry point `androidx.tv` / LEANBACK_LAUNCHER |
| Kit de foco TV: `TvFocusableCard`, `TvSongCard`, `TvAlbumCard`, `TvArtistCard`, `TvPlaylistCard`, `TvButton`, `TvNavigationItem`, `TvSection`, `TvFocusContainer`, `TvSearchField`, `TvMiniPlayer`, `TvFullPlayer` | D-pad + `FocusRequester` + señal visual clara |
| Navegación TV (Home/Buscar/Biblioteca/Playlists/Descargas/Historial/Ajustes) | Rutas propias, sin solapamiento con móvil |
| `HardwareKeyHandler` (media buttons 4-16) | Solo el puente indentable; los `MediaButtonReceiver` ya existen |
| Banner TV `@drawable/banner` | Sin uno actual (banner de TV obligatorio para LEANBACK_LAUNCHER) |
| `layout/` landscape, `values-tvdpi` opcional | Responsive 720p/1080p/4K |

## 13. Investigación pendiente antes de añadir TV (interdependencias)

1. `androidx.tv:tv-foundation` / `tv-material` **compatibles con Compose 1.11.0-rc01 y Kotlin 2.3.20** (minSdk 26). No actualizar Compose por ello.
2. Confirmar si `navigation-compose` 2.9.7 admite una segunda `NavHost` (sí) o si TV usará sus propias rutas en la misma `Activity` (recomendado: `TvMainActivity` separada).
3. `Media3 1.10.0`: verificar que `MediaController` (vía `SessionToken`) funciona igual de bien desde una segunda Activity — ya lo hace para widget/Auto, no requiere cambios.
4. `android.software.leanback` en el manifest: **cuidado** — declararlo como `required="false"` para no romper móvil; `LEANBACK_LAUNCHER` como intent-filter adicional (no reemplaza a LAUNCHER).
5. Compatibilidad del `resolutionStrategy.force` con cualquier dependencia tv que arrastre Compose.

## 14. Riesgos técnicos (del port a TV)

1. **`PlayerConnection` vive en `MainActivity`** (composition local). TV necesita su propia instancia → crear `PlayerConnection` en `TvMainActivity` de la misma forma (bind al mismo servicio) es seguro: el servicio ya admite **múltiples** MediaControllers (comprobado: lo hace con Auto/widget).
2. **`setSessionActivity(MainActivity)`** apunta a la Activity móvil → en TV, el clic en la notificación abriría MainActivity. Debe hacerse configurable sin tocar el servicio móvil (o aceptar que en el port TV la notificación abra la app móvil que no existe → **debe revisarse**; solución mínima: overlay en `TvMainActivity` o `PendingIntent` dinámico en el servicio sólo si corre TV, si la arquitectura lo permite).
3. **Persistencia de cola** (`persistent_player_state.data` + DataStore): compartida por ambas UIs. No romper formato.
4. **Renombrado de paquete (`com.capi.music` → `com.capi.music`)**: afecta a (a) red Room `song.db` → **renombrar paquete NO cambia el contenido del esquema** (los JSON de esquema de Room son por clase DB, no por paquete, y `MusicDatabase` usa nombre fijo "song.db"), pero el path del archivo sí cambia → la base de datos se recrea si el nombre de archivo cambia (se mantiene `song.db` idéntico). Riesgo: los usuarios del debug de Capi partan de cero (aceptable siendo app nueva). (b) `settings.preferences_pb` se mantiene igual si el DataStore conserva el nombre "settings" → ajustes se conservan. (c) deep link `opentune://` → en Capi cambiar a `capi://` (rompe enlaces antiguos de users de OpenTune, pero es identidad nueva).
5. **Focus Compose en TV**: los componentes móviles usan interacción táctil (scroll por arrastre, bottom sheets); las pantallas TV serán 100% nuevas. No mezclar.
6. **Rendimiento 4K**: Home móvil ya optimizada (lazy rows + Coil), la TV debe usar `TvLazyRow` con tamaños de imagen proporcionales y `contentType`.
7. **`theme="Theme.OpenTune"`** (XML Material.Light.NoActionBar) — TV puede usar el mismo tema Compose; el XML del manifest de TV debe apuntar al mismo style o uno propio.
8. **Terminación del servicio**: `onTaskRemoved`/`hasBoundClients`/`idleStopJob` — abrir la app desde la Activity TV mantiene el servicio vivo igual que móvil (mismo proceso).
9. **`fetchGitCommitHash`** en build.gradle.kts consulta `api.github.com/repos/Arturo254/OpenTune/commits/master` como fallback → en Capi fallará el fallback (red OK pero API del repo original): el build caerá a `"unknown"`; es aceptable pero conviene apuntar el fallback al repo Capi real o a `unknown` local.

## 15. Inventario de identidad (para FASE 3 y 30)

| Área | Valor actual | Acción Capi planeada |
|---|---|---|
| `rootProject.name` | `OpenTune` | `Capi` |
| `namespace` / `applicationId` | `com.capi.music` / `com.capi.music` (¡con mayúscula A!) | `com.capi.music` (propuesto) |
| `res/values/app_name.xml` | `OpenTune` | `Capi` |
| Tema XML | `Theme.OpenTune` | `Theme.Capi` (nuevo style, manteniendo estructura) |
| Deep link | `opentune://together` | `capi://together` (+ mantener parseo en `TogetherLink.kt` y tests) |
| Widget | `OpenTunePlayerWidget*`, `@xml/opentune_player_widget` | renombrar a `CapiPlayerWidget*` o mantener clase y renombrar solo label — **decisión de FASE 3** |
| Shortcuts XML | `com.capi.music.action.SEARCH` | sincronizar con nuevo applicationId |
| Strings locales | `strings.xml` (16 cadenas brand) | actualizar app_name + referencias en ~13 locales, **sin traducir de más** |
| Preferencias | claves con `OpenTune`/`JossRed` (<10) | **NO renombrar claves** (se perderían ajustes) — documentar |
| Paquetes internos módulos | todos `com.arturo254.*` | renombrar a `com.capi.*` (gran refactor, ejecutar con herramienta segura) |
| Licencias/atribución | GPL-3.0, headers `OpenTune Project Original (2026) Arturo254` | **CONSERVAR**; NOTICE.md documentará la derivación |
| Referencias URL repositorio | README/CONTRIBUTING/GitHub API | conservar atribución, actualizar solo lo necesario para build |
| Terceros a NO tocar | `com.my.kizzy`, ArchiveTune (Rukamori) en spotify/ y `ResolveImages.kt` | intactos |

## 16. Tests existentes

`app/src/test/` (JVM, JUnit4, sin Robolectric): `UpdaterSemVerTest`, `SyncLikedSongsOrderingTest`, `AddToPlaylistDialogFilterTest`, `TogetherGuestPlaybackPlannerTest`, `TogetherCoreTest` (incluye roundtrip del deep link `opentune://` — **se actualiza al cambiar el scheme**), `StopMusicOnTaskClearTest`, `CookieParsingTest` (módulo innertube).

---

## 17. Decisión arquitectónica recomendada (resumen)

```
                    CAPI
        ┌─────────────┴─────────────┐
        │                           │
   Mobile UI (MainActivity)     TV UI (TvMainActivity, nueva)
        │                           │
        └─────────────┬─────────────┘
                      │  PlayerConnection (duplicación aceptable de la delgada
                      │  capa de conexión; NO del reproductor)
                      ├─────────────┤
               MusicService + MediaLibrarySession + ExoPlayer   ← ÚNICOS, intactos
                      │
                    AUDIO
```

- **Sí** crear `TvMainActivity` + UI TV completamente nueva (focus/D-pad).
- **Sí** crear una segunda instancia de `PlayerConnection` (es el puente estándar del proyecto) — misma clase, mismo servicio, cero cambios en el núcleo.
- **No** crear `TvMusicService`, `TvExoPlayer`, ni duplicar colas/cache/descargas/DB.
- **No** renombrar claves de preferencias ni formatos persistidos.
- Requisito previo de build en FASE 6: verificar compatibilidad `androidx.tv:tv-foundation` con Compose 1.11.0-rc01 (sin tocar las versiones de Compose/Kotlin/AGP).