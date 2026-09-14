# Flutter Wrapper Rules
-keep class io.flutter.app.** { *; }
-keep class io.flutter.plugin.**  { *; }
-keep class io.flutter.util.**  { *; }
-keep class io.flutter.view.**  { *; }
-keep class io.flutter.** { *; }
-keep class io.flutter.plugins.** { *; }

# Flutter Play Core / Deferred Components
-dontwarn com.google.android.play.core.**
-dontwarn io.flutter.embedding.engine.deferredcomponents.**

# Preserve Zoop Native JNI Bridge and Callbacks
-keep class network.zoop.app.vpn.ZoopMobileBridge { *; }
-keep interface network.zoop.app.vpn.ZoopStateCallback { *; }
-keep class network.zoop.app.vpn.ZoopVpnService { *; }
-keepclassmembers class network.zoop.app.vpn.** {
    native <methods>;
}

# Preserve WireGuard / Go Runtime Symbols
-keepclasseswithmembernames class * {
    native <methods>;
}

# Kotlin Coroutines and Reflection
-keepattributes *Annotation*,InnerClasses,EnclosingMethod,Signature,SourceFile,LineNumberTable
-dontwarn java.lang.invoke.**
-dontwarn javax.annotation.**
