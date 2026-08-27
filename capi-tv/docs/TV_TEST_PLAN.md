# Plan de pruebas TV — Capi

> Objetivo: verificar la experiencia Android TV del APK de debug
> (`app/build/outputs/apk/universal/debug/capi-universal-debug.apk`).

## 1. Instalación y arranque

- Instalar en emulador Android TV (o dispositivo) con
  `adb install -r capi-universal-debug.apk`.
- Comprobar que aparece en "Aplicaciones" con icono y banner correctos
  (icono 16:10, banner 640×360 px).
- Abrir desde la launcher: ACTIVIDAD `TvMainActivity` en landscape.

## 2. Navegación básica

| Prueba | Esperado |
|---|---|
| DPAD sobre el rail | Los 4 destinos (Inicio, Buscar, Biblioteca, Ajustes) son accesibles y marcan foco |
| CENTER en un destino | Cambia la pantalla y el rail marca selección |
| BACK | Vuelve a la pantalla anterior; en Home lleva la app a segundo plano |
| Escape | alterna en primer plano/segundo plano, no crashea |

## 3. Home y reproducción

- Quick Picks / Speed Dial / Forgotten Favorites renderizan tarjetas; al
  hacer clic **empieza a sonar** (colas desde Youtube Music).
- Keep Listening y recomendaciones similares abren álbum/artista/playlist o
  reproducen.
- El mini-player inferior aparece al reproducir: portada, título, play/pause
  con CENTER, abrir cola.

## 4. Búsqueda

- Teclear ≥2 caracteres muestra sugerencias; pulsar "buscar" lanza
  `YouTube.searchSummary`; resultados en cards; clic reproduce o abre.
- REPRODUCIR desde resultados: cola de canciones correcta.

## 5. Biblioteca

- Pestañas Cantadas/Álbumes/Artistas/Playlists con DPAD izquierda/izquierda
  (tab row focusable).
- Álbum: listado de canciones con duración; clic → cola en la posición.
- Artista: "Álbumes" y "Canciones" (ArtistPage).

## 6. Player

- Seek: LEFT/RIGHT saltos de 10 s y actualizan `position/currentPosition`.
- Shuffle / Repeat (OFF→ALL→ONE) / Like reflejan el estado y persisten al
  rotar.
- Cola lateral: enfocar ítem resalta canción actual; CENTER salta a ella.
- Cierre del player con BACK conserva la reproducción (mini-player).

## 7. Persistencia y coexistencia

- Iniciar reproducción en TV → abrir la app móvil: el móvil ve el playback
  de la sesión (mismo `MusicService`).
- Cerrar sesión de TV (Settings) no interrumpe el servicio.
- Ducking/notifications: el widget `CapiPlayerWidget` sigue funcionando
  (no se tocó el core).

## 8. Rendimiento

- Las listas grandes (Library, cola) no traban al scrollear con DPAD.
- Sin ANRs de 5 s en dispositivos de gama media (10 min de uso mixto).
- Memoria estable en el player (artwork async de Coil).
---

## Resultados — 13 de agosto de 2026 (emulador API 34 x86_64, KVM)

- Instalación y arranque de `TvMainActivity`: OK. Launcher: icono propio.
- **Bug encontrado y corregido**: `hideSystemBars()` en `onCreate` lanzaba NPE
  (`DecorView.getWindowInsetsController()` nulo) → movido a
  `onWindowFocusChanged`. `TvMainActivity.kt`.
- Rail (Home/Search/Library/Settings), cambio de pantalla y foco D-pad: OK
  (Settings muestra Audio quality + Wake lock + About; selección de opción).
- Búsqueda: texto "lung"/"piano" → sugerencias y resultados reales de
  YouTube Music; reproducción al abrir una canción: `state=PLAYING`,
  metadata correcta, cola de 12 pistas, posición avanzando.
- Media keys (`KEYCODE_MEDIA_PLAY_PAUSE`): pausa/reanuda la sesión
  (`PAUSED(2)` ↔ `PLAYING(3)`).
- Pantalla Player completa (ruta `player`): título/artista reales, tiempo
  transcurrido ("0:42"), cola "Up Next" renderizada con las pistas.
- Sin crashes (`logcat -b crash` vacío tras el fix), sin ANRs.
- **Limitación del emulador**: la franja inferior (~y>950) no recibe tap ni
  foco D-pad dentro de `TvMiniPlayer` (zona gestos del sistema en la imagen
  de teléfono). Se sustituyó `clickable` por `tvFocusable` en la barra para
  garantizar anillo visible y foco por mando; verificarlo en TV real
  (Dispositivo Android TV / emulador android-tv).
- Ritmo: mini-player aparece con la pista en reproducción; seek D-pad por
  `TvSeekRow` (LEFT/RIGHT ±10 s) pendiente de verificación visual en TV real.
