# Add project specific ProGuard / R8 rules here.

# Preserve Capacitor bridge entry points and plugins
-keep public class * extends com.getcapacitor.Plugin { *; }
-keep public class * extends com.getcapacitor.BridgeActivity
-keepclassmembers class * extends com.getcapacitor.Plugin {
    @com.getcapacitor.PluginMethod public *;
}
-keep class com.getcapacitor.Bridge { public *; }
-keep class com.getcapacitor.PluginHandle { public *; }
-keep class com.getcapacitor.Plugin { public *; }
-keep class com.getcapacitor.JSObject { *; }
-keep class com.getcapacitor.JSArray { *; }
-keep class com.getcapacitor.PluginResult { *; }

# Keep WebView JavaScript interfaces
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Firebase & Google Play Services (AAR consumer rules handle model keeps)
-dontwarn com.google.firebase.**
-dontwarn com.google.android.gms.**

# Preserve annotations and line numbers for Play Console stack trace symbolization
-keepattributes SourceFile,LineNumberTable
-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod

# Suppress harmless build warnings from third-party libraries
-dontwarn org.apache.cordova.**
-dontwarn com.getcapacitor.**

# ── R8 Performance & Memory Optimization ──────────────────────────────────────
-optimizationpasses 5
-allowaccessmodification
-repackageclasses ''
-overloadaggressively

