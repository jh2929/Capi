# Capi Android

Versión móvil nativa de Capi para Android.

## Requisitos

- Android 8.0 (API 26) o superior
- Android Studio Hedgehog+
- JDK 17

## Estructura

```
app/
├── src/main/
│   ├── java/          # Código fuente Kotlin/Java
│   ├── res/           # Recursos (layouts, drawables, etc.)
│   └── AndroidManifest.xml
├── build.gradle.kts
```

## Compilación

```bash
# Build de debug
./gradlew assembleDebug

# Build de release (requiere keystore configurado)
./gradlew assembleRelease
```

## Releases

Los APK y AAB se publican en las [Releases](https://github.com/jh2929/Capi/releases) del repositorio principal.
