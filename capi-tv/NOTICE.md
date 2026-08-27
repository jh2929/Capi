# NOTICE — Capi

**Capi** es una aplicación Android **derivada y modificada** de **OpenTune**.

## Proyecto original

- Nombre: OpenTune
- Autor original: Arturo254
- Repositorio original: https://github.com/Arturo254/OpenTune
- Licencia: **GNU General Public License v3.0** (GPL-3.0) — ver [LICENSE](LICENSE)
- Copyright original: OpenTune Project Original (2026), Arturo254 (github.com/Arturo254), y sus contribuidores (véase el historial del repositorio original).

## Derivación

- Nombre de la derivación: **Capi**
- Fecha de creación de la derivación: **13 de agosto de 2026**
- Repositorio de la derivación: local, independiente de OpenTune (no se ha modificado ni se hará push al repositorio original).

## Qué es Capi

Capi conserva y reutiliza el núcleo técnico de OpenTune:

- Arquitectura de módulos Gradle (app + innertube, spotify, kugou, lrclib, lastfm, simpmusic, betterlyrics, kizzy, canvas, shazamkit, jossredconnect).
- Sistema de reproducción: `MusicService`, `MediaLibrarySession`/`Media3`, `ExoPlayer`, colas (`Queue`), persistencia de cola, caché de streams, descargas, crossfade, ecualizador, sleep timer y recuperación de red.
- Base de datos Room, DataStore, Hilt, InnerTube/YouTube Music, Spotify, letras (lyrics), widgets, Android Auto y la UI móvil original.

## Modificaciones de Capi

Las modificaciones de Capi sobre OpenTune son, de forma no exhaustiva:

- Nueva identidad de aplicación: nombre visible **Capi**, `applicationId`/`namespace` `com.capi.music` (antes `com.capi.music`).
- Nueva UI específica para **Android TV / Google TV** (`TvMainActivity`, navegación por D-pad, sistema de foco, Home TV, búsqueda TV, biblioteca/álbumes/artistas/playlists TV, mini-player y full player TV, ajustes TV).
- Documentación propia en `docs/` (auditoría de arquitectura, arquitectura TV, guías y plan de pruebas).
- El resto del código no modificado pertenece a OpenTune y se distribuye bajo GPL-3.0 con su atribución original intacta.

Los archivos del proyecto original conservan sus avisos de copyright y licencia. Cualquier archivo que contenga modificaciones sustanciales indica la derivación en comentarios de cabecera cuando es legal y necesario, sin eliminar la atribución original.

## Dependencias externas relevantes

- YouTube Music / InnerTube — datos de música bajo los términos de YouTube.
- Spotify Web API — sincronización de playlists.
- NewPipe Extractor (GPL-3.0) — incluido como dependencia del módulo innertube.
- Proveedores de letras: LrcLib, KuGou, BetterLyrics, SimpMusic.
- ArchiveTune (Rukamori) — atribuciones de terceros en determinados archivos; no se han modificado.
- Librerías de terceros (Media3, Compose, Hilt, Room, Coil, Ktor, OkHttp, Glance, etc.) bajo sus respectivas licencias.

## Uso

Distribuir, modificar o usar Capi implica cumplir los términos de la GPL-3.0 (ver [LICENSE](LICENSE)), incluyendo el requisito de ofrecer el código fuente de la obra derivada bajo la misma licencia y conservar los avisos de copyright originales.