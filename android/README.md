# Zoop Android Native SDK & Harness

This directory contains the **standalone native Android Kotlin project** (`network.zoop.app`) for running Zoop's WireGuard core natively on Android devices.

> [!NOTE]
> **Working on the Mobile App UI?**
> If you are contributing to or testing the cross-platform mobile user interface, please see the [**`mobile/`**](../mobile/) directory, which houses the complete **Flutter** mobile application.

---

## 1. Overview & Architecture

This project serves as a reference architecture and standalone Android SDK demonstrating how to embed the compiled Go WireGuard engine directly into a native Android application without Flutter dependencies.

```text
┌────────────────────────────────────────────────────────┐
│              Native Android Application UI             │
└───────────────────────────┬────────────────────────────┘
                            │ (Method Calls & State Events)
┌───────────────────────────▼────────────────────────────┐
│      ZoopNativeModule.kt (Bridge Controller)           │
└───────────────────────────┬────────────────────────────┘
                            │ (Binds TUN file descriptor)
┌───────────────────────────▼────────────────────────────┐
│   ZoopVpnService.kt (Platform VpnService Provider)     │
└───────────────────────────┬────────────────────────────┘
                            │ (Detached FD via gomobile)
┌───────────────────────────▼────────────────────────────┐
│  zoopcore.aar (Go WireGuard Engine / Noise_IK Tunnel)  │
└────────────────────────────────────────────────────────┘
```

---

## 2. Key Components

- **[`ZoopVpnService.kt`](app/src/main/java/network/zoop/app/ZoopVpnService.kt)**:
  - Allocates the virtual network interface via Android's `VpnService.Builder`.
  - Configures MTU (1280–1420), DNS servers (`1.1.1.1`, `8.8.8.8`), and default routing (`0.0.0.0/0`, `::/0`) for internet traffic forwarding.
  - Passes the native Linux TUN file descriptor (`ParcelFileDescriptor.detachFd()`) to the Go core.
  - **Socket Protection**: Protects underlying WireGuard UDP multiplexer sockets (`MuxBind`) via `VpnService.protect(fd)` to prevent routing loop deadlocks.
  - Registers `ConnectivityManager.NetworkCallback` to detect network roaming (Wi-Fi $\leftrightarrow$ 5G).
- **[`ZoopNativeModule.kt`](app/src/main/java/network/zoop/app/ZoopNativeModule.kt)**:
  - Manages VPN permission requests (`VpnService.prepare()`).
  - Emits real-time state changes (`connecting`, `connected`, `recovered`, `roaming`, `relayed`, `error`) and connection telemetry.

---

## 3. Building & Testing

### 1. Build Native Shared Library (`libzoop.so`):
```bash
# Compile native Go WireGuard engine using Android NDK clang:
CGO_ENABLED=1 CC="$ANDROID_HOME/ndk/<version>/toolchains/llvm/prebuilt/linux-x86_64/bin/x86_64-linux-android24-clang" \
  GOOS=android GOARCH=amd64 go build -ldflags="-checklinkname=0" -buildmode=c-shared \
  -o mobile/android/app/src/main/jniLibs/x86_64/libzoop.so ./cmd/zoop-mobile
```

### 2. Build the Android Project:
```bash
cd android
./gradlew assembleDebug && ./gradlew --stop
```

### 3. Run Unit Tests:
```bash
./gradlew testDebugUnitTest && ./gradlew --stop
```

