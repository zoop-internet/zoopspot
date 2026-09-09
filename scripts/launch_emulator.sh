#!/usr/bin/env bash
set -euo pipefail

# Zoop Android Emulator Launcher (Resource Safeguarded + Realistic Pixel 7 Skin)
# CPU: 2 Cores | RAM: 1.5 GiB | GPU: Host Acceleration | Skin: Google Pixel 7
# Auto-scales to real physical phone size (320x678) and hides the side button bar.

export ANDROID_HOME="/home/a-n/Android/Sdk"
export PATH="$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools:$PATH"

AVD_NAME="MyPhone"
SKIN_DIR="$ANDROID_HOME/skins"
SKIN_NAME="pixel_7"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=== Launching Zoop Phone Emulator ($AVD_NAME) ==="
echo "Skin: $SKIN_NAME (Official Google Pixel 7 Frame)"
echo "Scale: Real physical size (320x678) with side toolbar hidden"
echo "Resource limits: 2 CPU cores, 1.5 GiB guest RAM"
echo "Acceleration: Host GPU (Intel HD Graphics 630)"
echo "================================================"

# Run window styler in background to auto-scale and hide toolbar once window opens
python3 "$SCRIPT_DIR/style_emulator_window.py" &

exec "$ANDROID_HOME/emulator/emulator"     -avd "$AVD_NAME"     -skin "$SKIN_NAME"     -skindir "$SKIN_DIR"     -gpu host     -accel on     -no-boot-anim     "$@"
