# <img src="capi-desktop/src/assets/Logo.png" width="48" height="48" align="center" /> Capi Music Player

<p align="center">
  <img src="capi-desktop/Capi.jpeg" alt="Capi" width="600">
</p>

<p align="center">
  <strong>@jhezdev</strong>
</p>

## 📖 About

Capi es un reproductor de música moderno, rápido y elegante para escritorio. Diseñado para quienes buscan una experiencia fluida sin complicaciones, con reproducción en streaming, soporte para música local y estadísticas detalladas.

`youtube` `music` `player` `streaming` `tauri` `rust` `kotlin` `capi` `playlists` `local-library` `lyrics` `cross-platform`

---

Capi es un reproductor de música de escritorio premium, moderno y ultrarrápido desarrollado sobre **Tauri (Rust)** y **React (TypeScript)**, utilizando un daemon optimizado en **Kotlin** para comunicarse fluidamente con la API de YouTube Music sin anuncios ni bloqueos.

Este software se distribuye bajo los términos de la **Licencia Pública General de GNU v3.0 (GPL-3.0)**.

---

## 📖 Nuestra Historia: El nacimiento de Capi

Capi nació de una frustración simple y compartida: la falta de un cliente de escritorio a la altura de las mejores aplicaciones de música de Android (como ViMusic o SimpMusic). En Android existen reproductores increíblemente rápidos, limpios y eficientes que interactúan con YouTube Music, pero al pasar a la PC, las opciones se limitaban a aplicaciones web pesadas cargadas en Electron, con interfaces lentas o llenas de telemetría.

Decidimos cambiar eso. La meta era clara: traer la mejor experiencia móvil de streaming de música a la PC en un cliente nativo ligero.

El desarrollo comenzó con una meta ambiciosa. Gracias a una arquitectura limpia basada en Tauri + Rust y un microservicio en Kotlin para resolver la carga de los streams de audio, **logramos hacer la primera prueba con éxito en menos de 2 horas desde el día 1**. Desde esa primera ejecución exitosa supimos que Capi iba a ser algo grande. Lo que comenzó como un prototipo veloz de dos horas se ha transformado en un reproductor de música premium con un rendimiento excepcional y un consumo mínimo de memoria.

---

## ⚡ Capi frente a la competencia

| Característica / Función | Capi 🐾 | Spotify 🟢 | YouTube Music (Web) 🔴 | Deezer 🟣 |
| :--- | :---: | :---: | :---: | :---: |
| **Consumo de Memoria RAM** | **Muy bajo (<130MB)** | Alto (>300MB) | Alto (pestaña de navegador) | Alto (>250MB) |
| **Bloqueo Automático de Anuncios** | **Sí (Nativo)** | No (Requiere Premium) | No (Requiere Premium) | No (Requiere Premium) |
| **Descarga Física Directa (M4A)** | **Sí (Gratuito/Nativo)** | Solo Caché Encriptado | Solo Móvil / Encriptado | Solo Encriptado |
| **Bypass de Restricciones (PO-Tokens)** | **Sí (Integrado/Automático)** | N/A | No | N/A |
| **Temas Visuales Ilimitados** | **Sí (Ultra Dark, Midnight, etc.)** | No | No (Solo Oscuro) | Limitado |
| **Letras Sincronizadas en Tiempo Real** | **Sí (Integración LrcLib)** | Sí | Sí | Sí |
| **Comunidad y Código Abierto** | **Sí (GPL-3.0)** | No (Propietario) | No (Propietario) | No (Propietario) |
| **Buscador con Navegación por Teclado** | **Sí (Flechas & Tab)** | Sí | Limitado | Sí |

---

## 🎨 Características Principales

*   **Reproducción Instantánea y Caché Inteligente**: Proxy TCP integrado en Rust para entregar el stream de audio sin problemas de TLS o bloqueos del navegador.
*   **Modo Biblioteca Local**: Escaneo y reproducción directa de directorios locales desde el explorador de archivos nativo para formatos de audio `.mp3`, `.wav`, `.m4a`, `.ogg`, `.flac` y `.aac`.
*   **Gestor de Descargas Avanzado**: Descarga tus canciones favoritas directamente a formato M4A. Cancela, monitorea el progreso en tiempo real y gestiona tus pistas desde una pestaña dedicada con un botón animado en el Header.
*   **Letras Dinámicas con Traducción**: Integración automática con servidores de letras para mostrar textos sincronizados y opción de traducción en tiempo real, junto con un candado de bloqueo/desbloqueo de scroll manual.
*   **Estadísticas de Escucha e Historial**: Tarjetas visuales de uso, gráfico de Top Artistas no completado en su totalidad para mejor estética, y opción de exportación/importación en formato JSON.
*   **Confirmaciones Modales Globales**: Modales modernos e integrados que reemplazan los clásicos cuadros de confirmación del navegador para vaciar historiales o resetear datos.
*   **Temas CSS Personalizados**: Cambia al instante la apariencia de la app desde los ajustes a temas como *Ultra Dark* (negro puro), *Light Mode* (claro limpio), *Midnight Blue* (azul medianoche) o *Forest Green* (verde bosque).
*   **Perfil de Usuario**: Sube tu propia foto de perfil (se procesa y almacena localmente en Base64) y define tu nombre de usuario personalizado.
*   **Buscador Inteligente**: Barra de búsqueda predictiva que admite navegación a través de flechas de dirección con botón sticky integrado para vaciar el historial.
*   **Inicio de Sistema (Boot Option)**: Switch en configuraciones para permitir que Capi inicie de manera automática al arrancar el equipo.

---

## 🚀 Descarga e Instalación

**No necesitas realizar ninguna compilación técnica, instalar Java ni usar comandos de Docker.** Capi se distribuye como una aplicación compilada lista para usar.

1. Descarga el archivo ejecutable correspondiente a tu sistema operativo (Linux, Windows o macOS) desde la sección de **Releases** en este repositorio.
2. Si estás en Linux, otorga permisos de ejecución al binario:
   ```bash
   chmod +x Capi-Desktop
   ```
3. Haz doble clic en el archivo ejecutable y ¡disfruta de tu música!

---

## ⚖️ Licencia

Este proyecto está bajo la Licencia **GNU GPL v3.0**. Consulta el archivo [LICENSE](LICENSE) para obtener más detalles.

---

<p align="center">
  <strong>@jhezdev</strong>
</p>
