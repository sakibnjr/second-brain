#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export JAVA_HOME="/home/sakibnjr/.local-android/jdk-17"
export ANDROID_HOME="/home/sakibnjr/.local-android/android-sdk"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:/home/sakibnjr/.local-android/gradle-8.9/bin:$PATH"

echo "⚡ [Second Brain] Building Native Android App locally..."
cd "$DIR/apps/android"
gradle :app:assembleDebug --build-cache

APK_PATH="$DIR/apps/android/app/build/outputs/apk/debug/app-debug.apk"

echo "📲 [Second Brain] Installing on connected device via adb..."
adb install -r "$APK_PATH"

echo "🚀 [Second Brain] Launching app..."
adb shell am start -n com.planner.android/.MainActivity

echo "✅ [Second Brain] Done! Native app is live on your phone."
