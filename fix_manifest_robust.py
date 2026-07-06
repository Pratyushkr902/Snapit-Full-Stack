"""
Robust cleanup for AndroidManifest.xml.

Unlike the previous script (which needed an exact whitespace match and kept
silently failing), this uses regex so it works regardless of how many
duplicate copies exist or how the whitespace/line-endings look.

What it does:
  1. Finds and deletes every existing "GPS hardware ..." comment + its
     uses-feature lines (there may be 1, 2, or more mangled copies by now).
  2. Deletes any stray/duplicate <uses-feature ...location.../> lines
     anywhere else in the file.
  3. Inserts exactly ONE clean, valid copy right after the
     ACCESS_COARSE_LOCATION permission line.
  4. Validates the result is well-formed XML before saving. If validation
     fails, NOTHING is written to disk and you'll see the parse error here
     instead of discovering it in Gradle.

Run from repo root:  cd ~/Snapit-Full-Stack && python3 fix_manifest_robust.py
"""
import re
import xml.etree.ElementTree as ET

path = "client/android/app/src/main/AndroidManifest.xml"

with open(path, "r", newline="") as f:
    content = f.read()

original_content = content

# 1. Remove every existing "GPS hardware" comment block (handles the illegal
#    "--" inside the old comment too, since we're deleting the whole thing).
content = re.sub(
    r"[ \t]*<!--\s*GPS hardware.*?-->\s*\n?",
    "",
    content,
    flags=re.DOTALL,
)

# 2. Remove every stray uses-feature line for location/gps, wherever it is.
content = re.sub(
    r'[ \t]*<uses-feature android:name="android\.hardware\.location[^"]*"[^>]*/>\s*\n?',
    "",
    content,
)

# 3. Insert one clean copy right after ACCESS_COARSE_LOCATION.
clean_block = (
    '    <!-- GPS hardware is not required to install or use the app; we already\n'
    '         fall back to store coordinates when location is unavailable or\n'
    '         denied. Without this override, the @capacitor/geolocation plugin\'s\n'
    '         merged manifest marks GPS as required="true" by default, which\n'
    '         excludes devices without a GPS chip from installing the app. -->\n'
    '    <uses-feature android:name="android.hardware.location.gps" android:required="false" />\n'
    '    <uses-feature android:name="android.hardware.location.network" android:required="false" />\n'
    '    <uses-feature android:name="android.hardware.location" android:required="false" />\n'
)

pattern = re.compile(
    r'(<uses-permission android:name="android\.permission\.ACCESS_COARSE_LOCATION"\s*/>\s*\n)'
)
matches = pattern.findall(content)
assert len(matches) == 1, f"Expected exactly 1 ACCESS_COARSE_LOCATION line, found {len(matches)}. Aborting -- no changes written."

content = pattern.sub(lambda m: m.group(1) + "\n" + clean_block + "\n", content, count=1)

# 4. Validate before writing anything to disk.
try:
    ET.fromstring(content)
except ET.ParseError as e:
    print(f"VALIDATION FAILED, no changes written: {e}")
    print("----- Resulting content (for debugging) -----")
    print(content)
    raise SystemExit(1)

if content == original_content:
    print("No changes were necessary -- file already clean.")
else:
    with open(path, "w", newline="") as f:
        f.write(content)
    print(f"Fixed and validated {path}. XML is well-formed.")