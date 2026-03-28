# Firma de la app Android (link4deal)

## Configuración actual

- **Debug**: Usa `android/app/debug.keystore` (incluido en el proyecto). V1 y V2 signing habilitados.
- **Release**: Por defecto usa el mismo `debug.keystore` para builds locales. Para producción, configura un keystore de release.

## Instalación sin problemas de seguridad

Para **testing / distribución interna** (sideload), el setup actual es válido:

- `debug.keystore` está en `android/app/` → firma consistente en todas las máquinas
- V1 + V2 signing habilitados → compatible con Android 5–14+

Si al instalar ves «App no instalada» o avisos de seguridad:

1. **Desinstala primero** cualquier versión previa de la app (p. ej. otra firma).
2. Comprueba que `android/app/debug.keystore` exista y no esté dañado.

## Keystore de release (producción / Play Store)

1. Genera el keystore:

```bash
keytool -genkeypair -v -storetype PKCS12 -keystore android/app/release.keystore \
  -alias upload -keyalg RSA -keysize 2048 -validity 10000
```

2. Añade en `android/gradle.properties`:

```properties
LINK4DEAL_RELEASE_STORE_FILE=release.keystore
LINK4DEAL_RELEASE_STORE_PASSWORD=tu_password
LINK4DEAL_RELEASE_KEY_ALIAS=upload
LINK4DEAL_RELEASE_KEY_PASSWORD=tu_password
```

3. No subas `gradle.properties` ni el keystore a Git. Añade a `.gitignore`:

```
android/app/release.keystore
android/gradle.properties
```

4. Usa variables de entorno o secretos en CI para las contraseñas.

## Verificar la firma de un APK

```bash
apksigner verify --verbose android/app/build/outputs/apk/release/app-release.apk
```
