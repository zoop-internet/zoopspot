#!/usr/bin/env bash
# ==============================================================================
# Zoop Android Build & Deploy Script
#
# Builds libzoop.so (if needed), builds the debug APK, installs it onto the
# target Android device via ADB, and launches the app.
#
# Usage:
#   ./build_and_deploy.sh [-s <device_serial>] [--rebuild-core] [--quick]
#
# Flags:
#   -s, --serial <serial>    Target specific ADB device serial
#   --rebuild-core           Force rebuild of libzoop.so native C-shared library
#   --quick                  Skip APK build if an APK is already present
#   -h, --help               Show this help message
# ==============================================================================

set -euo pipefail

export HOME="${HOME:-/tmp}"
export ANDROID_USER_HOME="${ANDROID_USER_HOME:-/tmp/.android}"

DEVICE_SERIAL=""
REBUILD_CORE=false
QUICK_MODE=false

while [[ $# -gt 0 ]]; do
  case $1 in
    -s|--serial)
      DEVICE_SERIAL="$2"
      shift 2
      ;;
    --rebuild-core)
      REBUILD_CORE=true
      shift
      ;;
    --quick)
      QUICK_MODE=true
      shift
      ;;
    -h|--help)
      sed -ne '/^#/!q;s/^# //;p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown argument: $1"
      exit 1
      ;;
  esac
done

adb_cmd() {
  if [ -n "$DEVICE_SERIAL" ]; then
    adb -s "$DEVICE_SERIAL" "$@"
  else
    adb "$@"
  fi
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

echo "=== Zoop Android Build & Deploy ==="

# 1. Detect target device
DEV_LIST=$(adb devices | grep -v "List of devices attached" | grep -v "^$" || true)
if [ -z "$DEV_LIST" ]; then
  echo "Error: No ADB devices detected. Connect phone via USB or start emulator."
  exit 1
fi

if [ -z "$DEVICE_SERIAL" ]; then
  DEVICE_SERIAL=$(echo "$DEV_LIST" | head -n 1 | awk '{print $1}')
fi

DEV_MODEL=$(adb_cmd shell getprop ro.product.model 2>/dev/null | tr -d '\r\n' || echo "Device")
DEV_ABI=$(adb_cmd shell getprop ro.product.cpu.abi 2>/dev/null | tr -d '\r\n' || echo "arm64-v8a")

echo "Target Device: ${DEV_MODEL} (${DEVICE_SERIAL})"
echo "Target ABI:    ${DEV_ABI}"

# 2. Check / Build Native Core (libzoop.so)
JNI_DIR="${REPO_ROOT}/mobile/android/app/src/main/jniLibs/${DEV_ABI}"
LIB_PATH="${JNI_DIR}/libzoop.so"

if [ "$REBUILD_CORE" = true ] || [ ! -f "$LIB_PATH" ]; then
  echo "[1/3] Building native core (libzoop.so) for ${DEV_ABI}..."
  mkdir -p "$JNI_DIR"

  GOARCH="arm64"
  if [ "$DEV_ABI" = "x86_64" ]; then
    GOARCH="amd64"
  elif [ "$DEV_ABI" = "armeabi-v7a" ]; then
    GOARCH="arm"
  fi

  # Check if NDK clang is available for target ABI
  CLANG_PREFIX="aarch64-linux-android"
  if [ "$DEV_ABI" = "x86_64" ]; then
    CLANG_PREFIX="x86_64-linux-android"
  elif [ "$DEV_ABI" = "armeabi-v7a" ]; then
    CLANG_PREFIX="armv7a-linux-androideabi"
  fi

  NDK_CLANG=$(find "${ANDROID_HOME:-/home/a-n/Android/Sdk}" -name "${CLANG_PREFIX}*clang" 2>/dev/null | grep -E "(24|26|28|30|33)-clang" | head -n 1 || true)
  if [ -z "$NDK_CLANG" ]; then
    NDK_CLANG=$(find "${ANDROID_HOME:-/home/a-n/Android/Sdk}" -name "${CLANG_PREFIX}*clang" 2>/dev/null | head -n 1 || true)
  fi

  if [ -n "$NDK_CLANG" ]; then
    echo "Using NDK Clang: $NDK_CLANG"
    (cd "$REPO_ROOT" && CGO_ENABLED=1 CC="$NDK_CLANG" GOOS=android GOARCH="$GOARCH" \
      go build -v -buildmode=c-shared -ldflags="-checklinkname=0" -o "$LIB_PATH" ./cmd/zoop-mobile)
  elif [ -f "$LIB_PATH" ]; then
    echo "NDK toolchain not detected in PATH; using existing pre-built ${LIB_PATH} ($(ls -lh "$LIB_PATH" | awk '{print $5}'))"
  else
    echo "Warning: NDK toolchain not found and no pre-built libzoop.so for ${DEV_ABI}. Please install NDK or compile libzoop.so."
  fi
else
  echo "[1/3] Native library libzoop.so present: ${LIB_PATH} ($(ls -lh "$LIB_PATH" | awk '{print $5}'))"
fi

# 3. Build APK
APK_PATH=""
for candidate in \
  "${REPO_ROOT}/mobile/build/app/outputs/flutter-apk/app-debug.apk" \
  "${REPO_ROOT}/mobile/android/app/build/outputs/apk/debug/app-debug.apk" \
  "${REPO_ROOT}/android/app/build/outputs/apk/debug/app-debug.apk"; do
  if [ -f "$candidate" ]; then
    APK_PATH="$candidate"
    break
  fi
done

if [ "$QUICK_MODE" = false ] || [ -z "$APK_PATH" ]; then
  echo "[2/3] Building Android APK..."
  if command -v flutter >/dev/null 2>&1 && [ -d "${REPO_ROOT}/mobile" ]; then
    echo "Building via Flutter in mobile/..."
    (cd "${REPO_ROOT}/mobile" && flutter build apk --debug)
    APK_PATH="${REPO_ROOT}/mobile/build/app/outputs/flutter-apk/app-debug.apk"
  elif [ -x "${REPO_ROOT}/mobile/android/gradlew" ]; then
    echo "Building via Gradle in mobile/android/..."
    (cd "${REPO_ROOT}/mobile/android" && ./gradlew assembleDebug && ./gradlew --stop)
    APK_PATH="${REPO_ROOT}/mobile/android/app/build/outputs/apk/debug/app-debug.apk"
  elif [ -x "${REPO_ROOT}/android/gradlew" ]; then
    echo "Building via Gradle in android/..."
    (cd "${REPO_ROOT}/android" && ./gradlew assembleDebug && ./gradlew --stop)
    APK_PATH="${REPO_ROOT}/android/app/build/outputs/apk/debug/app-debug.apk"
  else
    echo "Error: Neither Flutter nor Gradle wrapper found to build APK."
    exit 1
  fi
fi

echo "APK ready: $APK_PATH"

# 4. Install & Launch APK on Device
echo "[3/3] Installing and launching app on device..."
adb_cmd install -r "$APK_PATH"

# Clear logcat before start
adb_cmd logcat -c

# Launch main activity
adb_cmd shell am start -n network.zoop.app/.MainActivity

echo "✓ Zoop app launched on ${DEV_MODEL} (${DEVICE_SERIAL})"
echo "Next: Run ./test/android-harness/diagnose_chain.sh to test connectivity."
