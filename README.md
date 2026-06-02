# <img src="capi-desktop/src/assets/Logo.png" width="48" height="48" align="center" /> Capi Music Player

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
| **Consumo de Memoria RAM** | **Muy bajo (<80MB)** | Alto (>300MB) | Alto (pestaña de navegador) | Alto (>250MB) |
| **Bloqueo Automático de Anuncios** | **Sí (Nativo)** | No (Requiere Premium) | No (Requiere Premium) | No (Requiere Premium) |
| **Descarga Física Directa (M4A)** | **Sí (Gratuito/Nativo)** | Solo Caché Encriptado | Solo Móvil / Encriptado | Solo Encriptado |
| **Bypass de Restricciones (PO-Tokens)** | **Sí (Docker Sidecar)** | N/A | No | N/A |
| **Temas Visuales Ilimitados** | **Sí (Ultra Dark, Midnight, etc.)** | No | No (Solo Oscuro) | Limitado |
| **Letras Sincronizadas en Tiempo Real** | **Sí (Integración LrcLib)** | Sí | Sí | Sí |
| **Comunidad y Código Abierto** | **Sí (GPL-3.0)** | No (Propietario) | No (Propietario) | No (Propietario) |
| **Buscador con Navegación por Teclado** | **Sí (Flechas & Tab)** | Sí | Limitado | Sí |

---

## 🎨 Características Principales

* **Reproducción Instantánea y Caché Inteligente**: Proxy TCP integrado en Rust para entregar el stream de audio sin problemas de TLS o bloqueos del navegador.
* **Carrusel de Novedades y Quick Picks**: Un banner animado en la pantalla de inicio con transiciones fluidas de 4 segundos y control gestual para acceder rápidamente a lo destacado del momento.
* **Gestor de Descargas Avanzado**: Descarga tus canciones favoritas directamente a formato M4A. Cancela, monitorea el porcentaje y gestiona el ancho de banda desde una pestaña dedicada con un botón animado en el Header.
* **Letras Dinámicas**: Integración automática con servidores de letras para mostrar textos sincronizados mientras escuchas tus canciones.
* **Navegación Histórica Localizada**: Botones de retroceso y avance dinámicos que aparecen únicamente cuando navegas en sub-secciones (como álbumes o perfiles de artistas).
* **Temas CSS Personalizados**: Cambia al instante la apariencia de la app desde los ajustes a temas como *Ultra Dark* (negro puro), *Light Mode* (claro limpio), *Midnight Blue* (azul medianoche) o *Forest Green* (verde bosque).
* **Perfil de Usuario**: Sube tu propia foto de perfil (se procesa y almacena localmente en Base64 en el almacenamiento seguro de tu sistema) y define tu nombre de usuario personalizado.
* **Buscador Inteligente**: Barra de búsqueda predictiva que admite navegación a través de flechas de dirección y teclado, con limpieza instantánea al clicar la "X".
* **Compartir Enlaces**: Copia directamente al portapapeles el enlace de la canción para compartirlo con un solo clic desde el menú contextual.

---

## 🚀 Requisitos e Instalación

### Requisitos previos
* **Rust & Cargo** (v1.75 o superior)
* **Node.js & npm**
* **Java JDK 21** (GraalVM recomendado para compilar el daemon nativo)
* **Docker** (opcional, para el sidecar de generación de PO-Tokens genuinos)

### Instrucciones de ejecución

1. Clona este repositorio:
   ```bash
   git clone https://github.com/jh2929/Capi.git
   cd Capi
   ```

2. Compila el daemon de Kotlin:
   ```bash
   ./gradlew :capi-core:installDist
   ```

3. Ejecuta la aplicación en modo desarrollo:
   ```bash
   cd capi-desktop
   npm install
   npm run tauri dev
   ```

---

## ⚖️ Licencia

Este proyecto está bajo la Licencia **GNU GPL v3.0**. Consulta el archivo [LICENSE](LICENSE) para obtener más detalles.
