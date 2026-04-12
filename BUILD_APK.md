# APK local (release)

Genera un **APK firmado con el keystore de debug/release del proyecto Android** en la **raíz del repositorio**, con nombre:

`damecodigo_YYYYMMDD_HHMMSS.apk`

## Requisitos

- **Node.js** y dependencias instaladas (`npm install`).
- **JDK 17** (recomendado para Android Gradle Plugin actual).
- **Android SDK** instalado y variable **`ANDROID_HOME`** (o `ANDROID_SDK_ROOT`) definida.
- En macOS/Linux, permisos de ejecución: `chmod +x build-apk.sh` (solo la primera vez).

## Comando

Desde la raíz del proyecto:

```bash
npm run apk:local
```

Equivalente:

```bash
./build-apk.sh
```

El script ejecuta:

1. `cd android && ./gradlew assembleRelease`
2. Copia `android/app/build/outputs/apk/release/app-release.apk` a la raíz con el nombre con timestamp.
3. Ejecuta una limpieza ligera de carpetas intermedias de build (opcional).

## Instalación en dispositivo

Con el nombre con timestamp:

```bash
adb install -r damecodigo_YYYYMMDD_HHMMSS.apk
```

O usando el **enlace simbólico** que deja cada build en la raíz:

```bash
adb install -r damecodigo-latest.apk
```

## Alternativa: EAS Build local

Si usas **EAS** y tienes el CLI configurado:

```bash
npm run eas:build:android:local
```

(Perfil `production-apk` en `eas.json`; requiere Docker o entorno EAS local.)

## Notas

- El APK más reciente en esta carpeta seguirá el patrón `damecodigo_*.apk`.
- Los archivos `*.apk` con ese patrón suelen ignorarse en Git (ver `.gitignore`) para no subir binarios al repo.
