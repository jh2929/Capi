# OpenTune

<div align="center">
  <img src="https://github.com/user-attachments/assets/0d3db989-fefa-4381-bf0c-8bd5ebdabd7b" alt="Icono de OpenTune" width="200"/>
  
  ### Un cliente elegante de YouTube Music con Material Design 3 para Android
  
  [![Última versión](https://img.shields.io/github/v/release/Arturo254/InnerTune?style=for-the-badge&logo=github&color=blue)](https://github.com/Arturo254/OpenTune/releases)
  [![Licencia](https://img.shields.io/github/license/Arturo254/OpenTune?style=for-the-badge&logo=gnu&color=green)](https://github.com/Arturo254/OpenTune/blob/main/LICENSE)
  [![Crowdin](https://badges.crowdin.net/opentune/localized.svg)](https://crowdin.com/project/opentune)
</div>

## Índice

- [Introducción](#introducción)
- [Tecnologías](#tecnologías)
- [Características](#características-principales)
- [Documentación](#documentación)
- [Instalación](#instalación)
- [Compilación](#guía-de-compilación)
- [Contribuciones](#contribuciones)
- [Financiación](#apoyo-al-proyecto)
- [Licencia](#licencia)

## Introducción

**OpenTune** es un cliente avanzado de YouTube Music diseñado específicamente para dispositivos Android. Ofrece una experiencia fluida y altamente personalizable con una interfaz moderna basada en Material Design 3, permitiéndote explorar, reproducir y gestionar tu música favorita de manera óptima.

> [!NOTE]  
> OpenTune es un proyecto de código abierto y no está afiliado oficialmente con YouTube ni Google.

## Tecnologías

<div align="center">
  <a href="https://kotlinlang.org/">
    <img src="https://img.shields.io/badge/Kotlin-7F52FF?style=for-the-badge&logo=kotlin&logoColor=white" alt="Kotlin"/>
  </a>
  <a href="https://flutter.dev/">
    <img src="https://img.shields.io/badge/Flutter-02569B?style=for-the-badge&logo=flutter&logoColor=white" alt="Flutter"/>
  </a>
  <a href="https://developer.android.com/jetpack/compose">
    <img src="https://img.shields.io/badge/Jetpack%20Compose-03DAC5?style=for-the-badge&logo=jetpack&logoColor=black" alt="Jetpack Compose"/>
  </a>
  <a href="https://www.python.org/">
    <img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python"/>
  </a>
  <a href="https://www.tensorflow.org/">
    <img src="https://img.shields.io/badge/TensorFlow-FF6F00?style=for-the-badge&logo=tensorflow&logoColor=white" alt="TensorFlow"/>
  </a>
</div>

## Características Principales

| Funcionalidad | Descripción |
|:-------------:|:------------|
| **Reproducción sin anuncios** | Disfruta de YouTube y YouTube Music sin interrupciones publicitarias |
| **Reproducción en segundo plano** | Continúa escuchando mientras utilizas otras aplicaciones |
| **Búsqueda avanzada** | Encuentra fácilmente canciones, videos, álbumes y listas de reproducción |
| **Inicio de sesión integrado** | Accede a tu cuenta para sincronizar preferencias y biblioteca |
| **Gestión de biblioteca** | Organiza y administra completamente tu colección musical |
| **Modo sin conexión** | Descarga y almacena música para escucharla sin internet |
| **Letras sincronizadas** | Visualiza la letra de las canciones al ritmo de la música |
| **Omisión de silencios** | Función inteligente para saltar segmentos sin audio |
| **Normalización de audio** | Equilibra el volumen entre diferentes canciones |
| **Control de tempo y tono** | Ajusta la velocidad de reproducción y tono según tus preferencias |
| **Tema dinámico** | Interfaz que se adapta a los colores de las portadas de álbumes |
| **Soporte multiidioma** | Disponible en múltiples idiomas para usuarios globales |
| **Compatibilidad con Android Auto** | Integración con sistemas de infoentretenimiento vehicular |
| **Material Design 3** | Diseño moderno siguiendo las últimas directrices de Google |
| **Descarga de portadas** | Guarda las imágenes de álbumes en alta calidad |

> [!TIP]
> Para una experiencia óptima, te recomendamos activar la normalización de audio y el tema dinámico en los ajustes de la aplicación.

## Documentación

Para obtener información detallada sobre la instalación, configuración y uso de OpenTune, consulta nuestra documentación completa:

[**Guía Oficial (GitBook)**](https://opentune.gitbook.io/)

## Instalación

### Requisitos del Sistema

- Android 6.0 (Marshmallow) o superior
- Mínimo 10 MB de espacio de almacenamiento
- Conexión a Internet (para streaming)

### Métodos de Instalación

#### Desde GitHub Releases

1. Ve a la sección de [Releases](https://github.com/Arturo254/OpenTune/releases) en GitHub
2. Ve a la seccion de Descargas
3. Descarga el apk en su ultima version 
4. Habilita la instalación desde fuentes desconocidas en la configuración de tu dispositivo
5. Instala el APK descargado

#### Desde la pagina Oficial

1. Ve a la web ofical de [OpenTune](https://opentune.netlify.app/) en tu navegador
2. Descarga el archivo APK más reciente
3. Habilita la instalación desde fuentes desconocidas en la configuración de tu dispositivo
4. Instala el APK descargado

#### Desde F-Droid

Próximamente disponible en el repositorio de F-Droid.

> [!IMPORTANT]  
> Por razones de seguridad, descarga la aplicación únicamente desde fuentes oficiales mencionadas anteriormente.

## Guía de Compilación

### Requisitos Previos

Para compilar OpenTune correctamente, necesitarás:

- **Gradle** (versión 7.5+)
- **Kotlin** (versión 1.7+)
- **Android Studio** (2022.1+)
- **JDK** (versión 11 o superior)
- **Android SDK** (API nivel 33 recomendado)

### Preparación del Entorno

```bash
# Clonar el repositorio
git clone https://github.com/Arturo254/OpenTune.git

# Acceder al directorio
cd OpenTune

# Actualizar submódulos (si existen)
git submodule update --init --recursive
```

### Métodos de Compilación

#### Usando Android Studio

1. Abre Android Studio
2. Selecciona "Open an existing Android Studio project"
3. Navega hasta el directorio de OpenTune y selecciónalo
4. Espera a que el proyecto sincronice y los índices se construyan
5. Selecciona Build > Build Bundle(s) / APK(s) > Build APK(s)

#### Usando Línea de Comandos

```bash
# Compilación de versión de producción
./gradlew assembleRelease

# Compilación de versión de depuración
./gradlew assembleDebug

# Compilación completa (incluye pruebas y dependencias)
./gradlew build

# Ejecutar pruebas unitarias
./gradlew test
```

> [!NOTE]  
> Los archivos APK compilados se encontrarán en `app/build/outputs/apk/`.

## Contribuciones

### Código de Conducta

Todos los colaboradores deben adherirse a nuestro código de conducta que promueve un entorno inclusivo, respetuoso y constructivo. Antes de contribuir, por favor lee el [Código de Conducta](https://github.com/Arturo254/OpenTune/blob/master/CODE_OF_CONDUCT.md) completo.

### Traducción

Si deseas ayudar a traducir OpenTune a tu idioma o mejorar las traducciones existentes, puedes:

1. Unirte a nuestro proyecto en [POEditor](https://poeditor.com/join/project/208BwCVazA)
2. 1. Unirte a nuestro proyecto en [Crowdin](https://crowdin.com/project/opentune)
3. Contactar directamente al desarrollador:
   - **Email**: [cervantesarturo254@gmail.com](mailto:cervantesarturo254@gmail.com)

### Desarrollo

Para contribuir al código:

1. Revisa las [issues abiertas](https://github.com/Arturo254/OpenTune/issues) o crea una nueva describiendo el problema o característica
2. Haz un fork del repositorio
3. Crea una rama para tu característica (`git checkout -b feature/nueva-caracteristica`)
4. Implementa tus cambios siguiendo las convenciones de código
5. Asegúrate de que tu código pasa todas las pruebas (`./gradlew test`)
6. Realiza tus commits (`git commit -m 'feat: añadir nueva característica'`)
7. Haz push a la rama (`git push origin feature/nueva-caracteristica`)
8. Abre un Pull Request detallando los cambios realizados

> [!TIP]
> Revisa nuestras [directrices de contribución](https://github.com/Arturo254/OpenTune/blob/master/CONTRIBUTING.md) para obtener información más detallada sobre el proceso de desarrollo.

## Apoyo al Proyecto

Si disfrutas usando **OpenTune** y quieres apoyar su desarrollo continuo, considera hacer una donación. Tu contribución será fundamental para:

- Mejorar la aplicación con nuevas características
- Corregir errores y optimizar el rendimiento
- Mantener la infraestructura del proyecto
- Apoyar la dedicación de los desarrolladores

### Opciones de Donación

Puedes realizar tu aportación a través de:

- **PayPal**: [Arturo Cervantes](https://www.paypal.com/paypalme/ArturoCervantes254)
- **GitHub Sponsors**: [Sponsors](https://github.com/sponsors/Arturo254)

> [!NOTE]  
> Las donaciones son completamente opcionales. OpenTune siempre será gratuito y de código abierto.

## Licencia

**Copyright © 2024**

Este programa es software libre: puedes redistribuirlo y/o modificarlo bajo los términos de la Licencia Pública General GNU publicada por la Free Software Foundation, ya sea la versión 3 de la Licencia o (a tu elección) cualquier versión posterior.

Este programa se distribuye con la esperanza de que sea útil, pero **SIN NINGUNA GARANTÍA**, ni siquiera la garantía implícita de COMERCIABILIDAD o IDONEIDAD PARA UN PROPÓSITO PARTICULAR. Consulta la [Licencia Pública General de GNU](https://github.com/Arturo254/OpenTune/blob/main/LICENSE) para obtener más detalles.

---

<div align="center">
  <p>© 2023-2024 Open Source Projects</p>
  <p>Desarrollado por <a href="https://github.com/Arturo254">Arturo Cervantes</a></p>
</div>
