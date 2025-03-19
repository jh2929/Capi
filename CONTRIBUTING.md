# Guía de Contribución

¡Gracias por tu interés en contribuir a OpenTune! Este documento proporciona las directrices y mejores prácticas para contribuir al proyecto. Siguiendo estas pautas, nos ayudas a mantener un código de alta calidad y una comunidad constructiva.

> [!NOTE]  
> Antes de comenzar, asegúrate de haber leído y comprendido nuestro [Código de Conducta](CODE_OF_CONDUCT.md).

## Índice

- [Cómo Contribuir](#cómo-contribuir)
  - [Reportar Bugs](#reportar-bugs)
  - [Sugerir Mejoras](#sugerir-mejoras)
  - [Pull Requests](#pull-requests)
- [Guía de Estilo](#guía-de-estilo)
  - [Estilo de Código](#estilo-de-código)
  - [Mensajes de Commit](#mensajes-de-commit)
  - [Documentación](#documentación)
- [Proceso de Desarrollo](#proceso-de-desarrollo)
  - [Flujo de Trabajo con Git](#flujo-de-trabajo-con-git)
  - [Ciclo de Vida de un Pull Request](#ciclo-de-vida-de-un-pull-request)
- [Configuración del Entorno](#configuración-del-entorno)
- [Contribuciones de Traducción](#contribuciones-de-traducción)
- [Contribuciones de Diseño](#contribuciones-de-diseño)

## Cómo Contribuir

### Reportar Bugs

Los bugs son rastreados como [issues de GitHub](https://github.com/Arturo254/OpenTune/issues). Antes de crear un nuevo issue, verifica si el problema ya ha sido reportado. Si encuentras un issue abierto que aborda el mismo problema, añade tu información adicional como comentario.

Al crear un nuevo issue, por favor proporciona:

- **Título descriptivo**: Un título claro que identifique el problema
- **Pasos para reproducir**: Pasos detallados para reproducir el problema
- **Comportamiento esperado**: Descripción de lo que esperabas que ocurriera
- **Comportamiento actual**: Descripción de lo que realmente ocurrió
- **Contexto**: Información relevante como versión de la aplicación, dispositivo, versión de Android, etc.
- **Capturas de pantalla**: Si es posible, añade capturas de pantalla para ilustrar el problema
- **Logs**: Si es aplicable, incluye logs relevantes de la aplicación

> [!TIP]
> Usa las plantillas proporcionadas al crear un issue para asegurarte de incluir toda la información necesaria.

### Sugerir Mejoras

Las sugerencias de mejora también se gestionan a través de [issues de GitHub](https://github.com/Arturo254/OpenTune/issues). Al proponer una nueva característica:

- **Describe el problema**: Explica qué problema resolvería esta característica
- **Explica la solución**: Describe cómo debería funcionar la característica
- **Proporciona ejemplos**: Si es posible, ofrece ejemplos de cómo se implementaría o utilizaría esta característica
- **Considera el alcance**: Evalúa si la característica es pequeña, mediana o grande en términos de esfuerzo de implementación

> [!IMPORTANT]  
> Antes de trabajar en una nueva característica, asegúrate de que ha sido discutida y aprobada por los mantenedores del proyecto.

### Pull Requests

Sigue estos pasos para enviar un pull request:

1. **Fork el repositorio** y crea tu rama desde `main`
2. **Implementa tus cambios** siguiendo nuestra guía de estilo
3. **Añade o actualiza tests** para reflejar tus cambios cuando sea necesario
4. **Asegúrate de que todos los tests pasen**
5. **Actualiza la documentación** si es necesario
6. **Envía el pull request** con una descripción clara de los cambios y referencias a los issues relacionados

## Guía de Estilo

### Estilo de Código

- **Kotlin**: Sigue la [guía de estilo oficial de Kotlin](https://kotlinlang.org/docs/coding-conventions.html)
- **XML**: Usa 4 espacios para la indentación
- **Nombres de variables y funciones**: Usa camelCase (p.ej., `playerController`)
- **Nombres de clases**: Usa PascalCase (p.ej., `MusicPlayer`)
- **Constantes**: Usa SNAKE_CASE en mayúsculas (p.ej., `MAX_RETRY_COUNT`)

### Mensajes de Commit

Seguimos el estándar de [Conventional Commits](https://www.conventionalcommits.org/):

```
<tipo>(<ámbito opcional>): <descripción>

[cuerpo opcional]

[pie opcional]
```

Tipos comunes:
- `feat`: Nueva característica
- `fix`: Corrección de bug
- `docs`: Cambios en la documentación
- `style`: Cambios que no afectan al significado del código (espacios, formato, etc.)
- `refactor`: Cambio de código que no corrige un bug ni añade una característica
- `perf`: Cambio de código que mejora el rendimiento
- `test`: Añadir tests o corregir tests existentes
- `chore`: Cambios en el proceso de construcción o herramientas auxiliares

Ejemplos:
```
feat(player): añadir soporte para reproducción de audio sin conexión
fix(ui): corregir problema de renderizado en la lista de canciones
docs(readme): actualizar instrucciones de instalación
```

### Documentación

- Usa Markdown para la documentación
- Documenta todas las funciones y clases públicas
- Incluye ejemplos de uso cuando sea posible
- Mantén la documentación actualizada con los cambios de código

## Proceso de Desarrollo

### Flujo de Trabajo con Git

Utilizamos un flujo de trabajo basado en ramas:

1. `main`: Rama principal, siempre estable
2. `develop`: Rama de desarrollo, donde se integran las características
3. `feature/xxx`: Ramas para nuevas características
4. `fix/xxx`: Ramas para correcciones de bugs
5. `release/xxx`: Ramas para preparar versiones

### Ciclo de Vida de un Pull Request

1. **Creación**: El desarrollador crea un PR desde su rama feature/fix
2. **Review**: Los mantenedores revisan el código y proporcionan feedback
3. **CI**: Los tests automatizados se ejecutan
4. **Discusión**: Se resuelven problemas o se solicitan cambios
5. **Aprobación**: Los mantenedores aprueban el PR
6. **Merge**: Se integra el PR en la rama de destino

## Configuración del Entorno

Para contribuir al código de OpenTune, configura tu entorno de desarrollo siguiendo estos pasos:

1. **Instala Android Studio** (versión 2022.1+)
2. **Configura el SDK de Android** (API nivel 33 recomendado)
3. **Instala el JDK** (versión 11 o superior)
4. **Clona el repositorio**:
   ```bash
   git clone https://github.com/Arturo254/OpenTune.git
   cd OpenTune
   ```
5. **Sincroniza el proyecto con Gradle**:
   ```bash
   ./gradlew build
   ```

## Contribuciones de Traducción

Para contribuir con traducciones:

1. Regístrate en [Crowdin](https://crowdin.com/project/opentune)
2. Selecciona el idioma al que quieres contribuir
3. Traduce las cadenas de texto faltantes o mejora las existentes
4. El equipo de mantenimiento revisará y aprobará las traducciones

Si tu idioma no está disponible en Crowdin, contacta con el equipo de desarrollo en [cervantesarturo254@gmail.com](mailto:cervantesarturo254@gmail.com).

## Contribuciones de Diseño

Para contribuir con diseños:

1. Familiarízate con las directrices de [Material Design 3](https://m3.material.io/)
2. Crea mockups o prototipos de tus ideas
3. Envía tus diseños como un issue con la etiqueta "design"
4. Incluye explicaciones sobre cómo tus diseños mejorarían la experiencia del usuario

---

¡Gracias por contribuir a OpenTune! Tus esfuerzos ayudan a mejorar la aplicación para todos los usuarios.

Si tienes alguna pregunta sobre cómo contribuir, no dudes en abrir un issue con la etiqueta "question" o contactar directamente con el equipo de desarrollo.
