#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export PATH="/home/sakibnjr/.local-android/android-sdk/platform-tools:/home/sakibnjr/.local-android/scrcpy-bin:$PATH"

echo "📱 [scrcpy] Mirroring your Android screen to Linux PC..."
exec /home/sakibnjr/.local-android/scrcpy-bin/scrcpy \
    --window-title="Second Brain · Phone Screen" \
    --stay-awake \
    "$@"
