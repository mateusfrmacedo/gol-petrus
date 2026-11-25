#!/bin/sh
# Gera APK de teste instalável; a chave de desenvolvimento não é chave de publicação.
set -eu
ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
if [ -z "${JAVA_HOME:-}" ] && [ -d /opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home ]; then
  export JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home
fi
if [ -z "${ANDROID_HOME:-}" ] && [ -d "$HOME/Library/Android/sdk" ]; then
  export ANDROID_HOME="$HOME/Library/Android/sdk"
fi
cd "$ROOT_DIR"
node scripts/android/prepare.mjs "$@"
cd android
./gradlew --no-daemon assembleDebug
mkdir -p "$ROOT_DIR/dist/android"
cp app/build/outputs/apk/debug/app-debug.apk "$ROOT_DIR/dist/android/GTA-NA-0.2.0.apk"
printf 'APK: %s\n' "$ROOT_DIR/dist/android/GTA-NA-0.2.0.apk"
