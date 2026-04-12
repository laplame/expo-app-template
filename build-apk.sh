#!/bin/bash

# Script para generar APK con formato: damecodigo_timestamp.apk
# Uso: ./build-apk.sh

set -e

echo "🔨 Building APK..."

# Generar timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
APK_NAME="damecodigo_${TIMESTAMP}.apk"

# Ir al directorio android y construir
cd android
./gradlew assembleRelease

# Mover APK al root con el nombre correcto
cd ..
mv android/app/build/outputs/apk/release/app-release.apk "$APK_NAME"

# Enlace estable en la raíz para instalar sin copiar el nombre con timestamp
ln -sf "$APK_NAME" damecodigo-latest.apk

echo "✅ APK generado: $APK_NAME"
echo "🔗 Enlace: damecodigo-latest.apk → $APK_NAME"
echo "📦 Tamaño: $(du -h "$APK_NAME" | cut -f1)"

# Limpiar carpetas de build innecesarias
echo "🧹 Limpiando carpetas de build..."

# Limpiar build de Android (mantener solo el APK release si existe)
rm -rf android/app/build/intermediates
rm -rf android/app/build/tmp
rm -rf android/app/build/generated
rm -rf android/app/build/outputs/logs
rm -rf android/app/build/outputs/apk/debug

rm -rf android/build/intermediates
rm -rf android/.gradle/caches
rm -rf android/.cxx

# Limpiar node_modules/.cache si existe
rm -rf node_modules/.cache

echo "✨ Limpieza completada"
echo ""
echo "📱 APK listo: $APK_NAME"

