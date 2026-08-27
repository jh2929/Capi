# Arquitectura TV — Capi (derivado de OpenTune)

> **Estado:** FASE 2 — Implementación completa (compila y empaqueta `universalDebug`).
> Compose TV UI en `app/src/main/kotlin/com/capi/music/tv/`.

## Principios

1. **El core de reproducción NO se toca.** El estado del reproductor vive en
   `MusicService` (un `MediaLibraryService`), no en la UI ni en un ViewModel.
   La UI se conecta por binding y lo envuelve con `PlayerConnection`, que
   expone `StateFlow`s (`mediaMetadata`, `isPlaying`, `queueWindows`,
   `currentWindowIndex`, `shuffleModeEnabled`, `repeatMode`, `position`, …).
2. **Una instancia propia de `PlayerConnection` por Activity TV.** Cada
   consumidor crea la suya (patrón de `MainActivity`) y la libera en
   `onDestroy` con `dispose()`. Nunca se crea un segundo servicio.
3. **Sin dependencias de AndroidX TV layout.** Google retiró
   `TvLazyRow`/`TvLazyColumn` del artefacto estable `androidx.tv:tv-foundation`
   (el módulo `tv-foundation-lazy` no existe en Google Maven). Se usan
   `LazyRow`/`LazyColumn` de Compose con **scroll manual por foco** (ver §5).
4. **Recorrido 100% por D-pad.** Nada requiere touch: foco explícito
   (`tvFocusable`), teclas DPAD/CENTER/Media en `dispatchKeyEvent` del
   `TvMainActivity`, y botón HOME del mando para el rail.

## Estructura

```
tv/
├── TvMainActivity.kt        # Activity leanback, dirige la TV, gestiona binder
├── TvApp.kt                 # Rail de navegación + AnimatedContent por ruta
├── TvNavigation.kt          # Rutas cifradas (URLEncoder) + TvBackStack
├── TvMiniPlayer.kt          # Barra inferior: portada, título, reproducir/parar, cola
├── components/
│   ├── TvFocus.kt           # tvFocusable(): anillo de foco + zoom + clic
│   └── TvWidgets.kt         # TvCard, TvSongCard, botones, seek, secciones…
└── screens/
    ├── TvHomeScreen.kt      # Quick Picks, Speed Dial, Keep Listening, similares, playlists
    ├── TvSearchScreen.kt    # Debounce 400ms: sugerencias + resultados (buscar)
    ├── TvLibraryScreen.kt   # Pestañas Cantadas/Álbumes/Artistas/Playlists (EJEM)
    ├── TvAlbumScreen.kt     # Reutiliza AlbumViewModel (Room + YTM)
    ├── TvArtistScreen.kt    # Reutiliza ArtistViewModel (Room + YTM)
    ├── TvPlaylistScreen.kt  # Reutiliza OnlinePlaylistViewModel
    ├── TvPlayerScreen.kt    # Player completo: seek D-pad, shuffle/repetir/like/cola
    └── TvSettingsScreen.kt  # Calidad de audio, wake lock, acerca de
```

## Ciclo de vida del servicio

```
TvMainActivity.onStart()
  └─ startService(MusicService)  // si no estaba corriendo
  └─ bindService(MusicService, serviceConnection, BIND_AUTO_CREATE)
       └─ onServiceConnected → PlayerConnection(binder) → PlayerConnection.start()
TvMainActivity.onStop()/onDestroy()
  └─ unbindService + playerConnection.dispose()
```

El móvil y la TV comparten el mismo servicio sin conflicto: cuando ambos
están vivos, la última `setSessionActivity` gana el foco de sesión Media3.

## Navegación

- `TvRoute` define rutas; los parámetros se cifran base64/URL para pasar
  `songId`, `albumId`, etc. por el rail (`onOpenAlbum`…).
- `rememberTvBackStack()` guarda la pila en `rememberSaveable` (sobrevive a
  rotación), y `TvBackStack` expone `current`/`navigate`/`back`.
- BACK del mando: si hay cola → `applyBack` no hace nada cuando `current` es
  la pantalla raíz (la Activity se lleva a segundo plano).

## Player TV

- `TvSeekRow`: botón LEFT/RIGHT = saltos de 10 s vía `onKeyEvent`, con barra
  de progreso y tiempo transcurrido/duraión.
- Cola ("Up Next"): `LazyColumn` con `itemsIndexed`, resalte de la canción
  actual, y scroll-por-foco.
- Repetir: OFF → ALL → ONE; Aleatorio: toggle; Like: `toggleLike()` de
  `PlayerConnection`.
- Estado de reproducción vía `collectAsState` de los `StateFlow` de
  `PlayerConnection` (mismo origen de datos que la UI móvil).