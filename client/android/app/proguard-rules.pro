# Add project specific ProGuard / R8 rules here.

# Preserve Capacitor core, bridge and all plugins
-keep public class com.getcapacitor.** { *; }
-keep class com.getcapacitor.** { *; }
-keep public class * extends com.getcapacitor.Plugin { *; }
-keep public class * extends com.getcapacitor.BridgeActivity { *; }
-keepclassmembers class * extends com.getcapacitor.Plugin {
    @com.getcapacitor.PluginMethod public *;
}

# Keep WebView JavaScript interfaces
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Firebase & Google Play Services
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.firebase.**
-dontwarn com.google.android.gms.**

# Suppress harmless build warnings from third-party libraries
-dontwarn org.apache.cordova.**
-dontwarn com.getcapacitor.**
-dontwarn androidx.**



