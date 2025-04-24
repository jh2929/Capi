# OpenTune

<div align="center">
  <img src="https://github.com/Arturo254/OpenTune/blob/master/fastlane/metadata/android/en-US/images/featureGraphic.png" alt="Banner de OpenTune" width="100%"/>
  
  ### Cliente avanzado de YouTube Music con Material Design 3 para Android
  
  [![Última versión](https://img.shields.io/github/v/release/Arturo254/InnerTune?style=flat-square&logo=github&color=0D1117&labelColor=161B22)](https://github.com/Arturo254/OpenTune/releases)
  [![Licencia](https://img.shields.io/github/license/Arturo254/OpenTune?style=flat-square&logo=gnu&color=2B3137&labelColor=161B22)](https://github.com/Arturo254/OpenTune/blob/main/LICENSE)
  [![Estado de traducción](https://badges.crowdin.net/opentune/localized.svg)](https://crowdin.com/project/opentune)
  [![Android](https://img.shields.io/badge/Platform-Android%206.0+-3DDC84.svg?style=flat-square&logo=android&logoColor=white&labelColor=161B22)](https://www.android.com)
</div>

<br>

## Índice de contenidos

- [Visión general](#visión-general)
- [Stack tecnológico](#stack-tecnológico)
- [Características principales](#características-principales)
- [Documentación](#documentación)
- [Instalación](#instalación)
- [Compilación](#compilación-desde-código-fuente)
- [Contribuciones](#contribuciones)
- [Financiación](#apoyo-al-desarrollo)
- [Licencia](#licencia)

<br>

## Visión general

**OpenTune** es un cliente de YouTube Music de código abierto diseñado específicamente para dispositivos Android. Proporciona una experiencia de usuario superior con una interfaz moderna que implementa Material Design 3, ofreciendo funcionalidades avanzadas para explorar, reproducir y gestionar contenido musical sin las limitaciones de la aplicación oficial.

> [!NOTE]  
> OpenTune es un proyecto independiente y no está afiliado, patrocinado ni respaldado por YouTube o Google.

<br>

## Stack tecnológico

<div align="center">
  <a href="https://kotlinlang.org/">
    <img src="https://img.shields.io/badge/Kotlin-7F52FF?style=for-the-badge&logo=kotlin&logoColor=white" alt="Kotlin"/>
  </a>
  <a href="https://developer.android.com/jetpack/compose">
    <img src="https://img.shields.io/badge/Jetpack%20Compose-4285F4?style=for-the-badge&logo=jetpackcompose&logoColor=white" alt="Jetpack Compose"/>
  </a>
  <a href="https://material.io/design/material-you">
    <img src="https://img.shields.io/badge/Material%20Design%203-757575?style=for-the-badge&logo=materialdesign&logoColor=white" alt="Material Design 3"/>
  </a>
  <a href="https://www.python.org/">
    <img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python"/>
  </a>
  <a href="https://www.tensorflow.org/">
    <img src="https://img.shields.io/badge/TensorFlow-FF6F00?style=for-the-badge&logo=tensorflow&logoColor=white" alt="TensorFlow"/>
  </a>
</div>

<br>

## Características principales

| Categoría | Funcionalidad | Descripción |
|:----------|:--------------|:------------|
| **Experiencia básica** | Reproducción sin anuncios | Disfruta de música sin interrupciones publicitarias |
| | Reproducción en segundo plano | Continúa escuchando mientras usas otras aplicaciones |
| | Búsqueda avanzada | Encuentra rápidamente canciones, vídeos, álbumes y listas de reproducción |
| **Cuenta y biblioteca** | Inicio de sesión integrado | Accede a tu cuenta para sincronizar preferencias y colecciones |
| | Gestión de biblioteca | Organiza y administra completamente tu colección musical |
| | Modo sin conexión | Descarga contenido para escuchar sin conexión a internet |
| **Características de audio** | Letras sincronizadas | Visualiza letra de canciones perfectamente sincronizada |
| | Omisión inteligente de silencios | Salta automáticamente segmentos sin audio |
| | Normalización de volumen | Equilibra el nivel sonoro entre diferentes pistas |
| | Control de tempo y tono | Ajusta velocidad y tono de reproducción según preferencias |
| **Personalización** | Tema dinámico | Interfaz que se adapta a los colores de portadas de álbumes |
| | Soporte multiidioma | Disponible en numerosos idiomas para usuarios globales |
| **Integración** | Compatibilidad con Android Auto | Integración con sistemas de infoentretenimiento vehicular |
| | Material Design 3 | Diseño alineado con las últimas directrices de diseño de Google |
| | Exportación de portadas | Guarda imágenes de álbumes en alta resolución |

> [!TIP]
> Para maximizar tu experiencia con OpenTune, activa la normalización de audio en los ajustes y prueba el tema dinámico que adapta la interfaz a los colores de tus álbumes favoritos.

<br>

## Documentación

Para información detallada sobre configuración, funcionalidades avanzadas y guías de uso, consulta nuestra documentación oficial:

[<img src="https://img.shields.io/badge/Documentación-GitBook-4285F4?style=for-the-badge&logo=gitbook&logoColor=white">](https://opentune.gitbook.io/)

<br>

## Instalación

### Requisitos del sistema

| Componente | Requisito mínimo |
|:-----------|:-----------------|
| Sistema operativo | Android 6.0 (Marshmallow) o superior |
| Espacio de almacenamiento | 10 MB disponibles |
| Conectividad | Conexión a Internet para streaming |

### Métodos de instalación

#### Desde GitHub Releases

1. Navega a la sección de [Releases](https://github.com/Arturo254/OpenTune/releases) en GitHub
2. Localiza la sección de Descargas
3. Descarga el archivo APK de la última versión estable
4. Habilita "Instalación desde fuentes desconocidas" en la configuración de seguridad de tu dispositivo
5. Abre el archivo APK descargado para completar la instalación

#### Desde la página oficial

1. Visita el sitio web oficial de [OpenTune](https://opentune.netlify.app/)
2. Selecciona la opción de descarga para Android
3. Habilita "Instalación desde fuentes desconocidas" en la configuración de seguridad de tu dispositivo
4. Instala el archivo APK descargado

#### Desde F-Droid (Próximamente)

La aplicación estará disponible en el repositorio de F-Droid en el futuro cercano.

> [!IMPORTANT]  
> Por motivos de seguridad, se recomienda obtener la aplicación exclusivamente a través de los canales oficiales mencionados anteriormente. Evita descargar APKs de fuentes no verificadas.

<br>

## Compilación desde código fuente

### Requisitos previos

| Herramienta | Versión recomendada |
|:------------|:--------------------|
| Gradle | 7.5 o superior |
| Kotlin | 1.7 o superior |
| Android Studio | 2022.1 o superior |
| JDK | 11 o superior |
| Android SDK | API nivel 33 (Android 13) |

### Preparación del entorno

```bash
# Clonar el repositorio
git clone https://github.com/Arturo254/OpenTune.git

# Acceder al directorio del proyecto
cd OpenTune

# Actualizar submódulos (si existen)
git submodule update --init --recursive
```

### Métodos de compilación

<details>
<summary><b>Compilación con Android Studio</b></summary>

1. Abre Android Studio
2. Selecciona "Open an existing Android Studio project"
3. Navega y selecciona el directorio OpenTune
4. Espera a que el proyecto sincronice y los índices se construyan
5. Selecciona Build > Build Bundle(s) / APK(s) > Build APK(s)
</details>

<details>
<summary><b>Compilación por línea de comandos</b></summary>

```bash
# Compilar versión de producción
./gradlew assembleRelease

# Compilar versión de depuración
./gradlew assembleDebug

# Compilación completa con pruebas
./gradlew build

# Ejecutar pruebas unitarias
./gradlew test
```
</details>

> [!NOTE]  
> Los archivos APK compilados se encontrarán en el directorio `app/build/outputs/apk/`.

<br>

## Contribuciones

### Código de conducta

Todos los participantes en este proyecto deben adherirse a nuestro código de conducta que promueve un entorno inclusivo, respetuoso y constructivo. Consulta el [Código de Conducta completo](https://github.com/Arturo254/OpenTune/blob/master/CODE_OF_CONDUCT.md) antes de contribuir.

### Traducción

Si deseas ayudar a traducir OpenTune a tu idioma o mejorar las traducciones existentes, puedes participar de las siguientes formas:

1. [POEditor](https://poeditor.com/join/project/208BwCVazA) (Recomendado)
2. [Crowdin](https://crowdin.com/project/opentune)
3. Contacto directo con el desarrollador:
   - Email: [cervantesarturo254@gmail.com](mailto:cervantesarturo254@gmail.com)

### Canales oficiales de comunicación

| Canal | Enlace |
|:------|:-------|
| Chat de Telegram | [OpenTune Chat](https://t.me/OpenTune_chat) |
| Canal de actualizaciones | [OpenTune Updates](https://t.me/opentune_updates) |

### Flujo de trabajo para desarrollo

<details>
<summary><b>Proceso para contribuir al código</b></summary>

1. Revisa las [issues abiertas](https://github.com/Arturo254/OpenTune/issues) o crea una nueva describiendo el problema o característica
2. Realiza un fork del repositorio
3. Crea una rama para tu característica (`git checkout -b feature/nueva-caracteristica`)
4. Implementa tus cambios siguiendo las convenciones de código del proyecto
5. Verifica que el código pasa todas las pruebas (`./gradlew test`)
6. Realiza commits con mensajes descriptivos (`git commit -m 'feat: añadir nueva característica'`)
7. Sube los cambios a tu fork (`git push origin feature/nueva-caracteristica`)
8. Abre un Pull Request detallando los cambios realizados y referenciando la issue correspondiente
</details>

> [!TIP]
> Revisa nuestras [directrices de contribución](https://github.com/Arturo254/OpenTune/blob/master/CONTRIBUTING.md) para obtener información más detallada sobre el proceso de desarrollo, estándares de código y flujo de trabajo.

<br>

## Apoyo al desarrollo

Si encuentras valor en **OpenTune** y deseas contribuir a su desarrollo continuo, considera realizar una donación. Tu apoyo financiero nos permite:

- Implementar nuevas características y mejoras
- Resolver problemas y optimizar el rendimiento
- Mantener la infraestructura del proyecto
- Dedicar más tiempo al desarrollo y mantenimiento

### Métodos de donación

<div align="center">
  <a href="https://github.com/sponsors/Arturo254">
    <img src="https://img.shields.io/badge/GitHub_Sponsors-181717?style=for-the-badge&logo=github&logoColor=white" alt="GitHub Sponsors">
  </a>
</div>

> [!NOTE]  
> Las donaciones son completamente opcionales. OpenTune siempre será gratuito y de código abierto, independientemente del apoyo financiero recibido.

<br>

## Licencia

**Copyright © 2025**

Este programa es software libre: puedes redistribuirlo y/o modificarlo bajo los términos de la Licencia Pública General GNU publicada por la Free Software Foundation, ya sea la versión 3 de la Licencia o (a tu elección) cualquier versión posterior.

Este programa se distribuye con la esperanza de que sea útil, pero **SIN NINGUNA GARANTÍA**, ni siquiera la garantía implícita de COMERCIABILIDAD o IDONEIDAD PARA UN PROPÓSITO PARTICULAR. Consulta la [Licencia Pública General de GNU](https://github.com/Arturo254/OpenTune/blob/main/LICENSE) para obtener más detalles.

> [!CAUTION]
> Cualquier uso comercial no autorizado de este software o sus derivados constituye una violación de los términos de licencia.

---

<div align="center">
  <p>© 2023-2024 Open Source Projects</p>
  <p>Desarrollado con pasión por <a href="https://github.com/Arturo254">Arturo Cervantes</a></p>
</div>
