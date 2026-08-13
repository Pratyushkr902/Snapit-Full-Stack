"""
Fixes: "This release no longer supports 8 devices that were supported in
your previous release."

Root cause: installing @capacitor/geolocation merges in a manifest that
declares android.hardware.location.gps as android:required="true" by
default. That makes GPS hardware mandatory to install the app at all,
silently excluding devices without a GPS chip (budget tablets, Wi-Fi-only
devices, some low-end phones) -- these are almost certainly the 8 devices
Play Console is warning about. This app already has a store-coordinates
fallback for denied/missing location, so GPS should never have been a hard
requirement in the first place.

Fix: explicitly declare the location hardware features as NOT required in
our own manifest. During manifest merging this overrides the plugin's
stricter default, restoring support for non-GPS devices while keeping full
GPS functionality on devices that do have it.

Run from repo root:  cd ~/Snapit-Full-Stack && python3 fix_device_support.py
"""

path = "client/android/app/src/main/AndroidManifest.xml"

old = """    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />"""

new = """    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />

    <!-- GPS hardware is NOT required to install/use the app -- we already
         fall back to store coordinates when location is unavailable or
         denied. Without this override, the @capacitor/geolocation plugin's
         merged manifest marks GPS as required="true" by default, which
         excludes devices without a GPS chip from installing the app. -->
    <uses-feature android:name="android.hardware.location.gps" android:required="false" />
    <uses-feature android:name="android.hardware.location.network" android:required="false" />
    <uses-feature android:name="android.hardware.location" android:required="false" />"""

with open(path) as f:
    content = f.read()
assert content.count(old) == 1, f"expected 1 match in {path}, found {content.count(old)}"
content = content.replace(old, new)
with open(path, "w") as f:
    f.write(content)

print(f"Patched {path}: GPS/location hardware features marked as not required")