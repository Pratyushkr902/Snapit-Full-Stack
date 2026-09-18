# Add project specific ProGuard / R8 rules here.

# Allow R8 to optimize aggressively across packages
-repackageclasses ''
-allowaccessmodification

# Capacitor core and bridge reflection
-keep class com.getcapacitor.Bridge { *; }
-keep class com.getcapacitor.BridgeActivity { *; }
-keep class com.getcapacitor.Plugin { *; }

# Keep Capacitor plugin classes and their annotated methods
-keep @com.getcapacitor.annotation.CapacitorPlugin public class * {
    @com.getcapacitor.PluginMethod public <methods>;
}
-keep public class * extends com.getcapacitor.Plugin {
    @com.getcapacitor.PluginMethod public <methods>;
}
-keepclassmembers class * extends com.getcapacitor.Plugin {
    @com.getcapacitor.PluginMethod public *;
}

# Keep WebView JavaScript interfaces
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Preserve stack trace line numbers and annotations for Play Console de-obfuscation
-keepattributes SourceFile,LineNumberTable
-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod

# Suppress harmless build warnings from third-party libraries
-dontwarn org.apache.cordova.**
-dontwarn com.getcapacitor.**
-dontwarn com.google.firebase.**
-dontwarn com.google.android.gms.**
-dontwarn androidx.**


