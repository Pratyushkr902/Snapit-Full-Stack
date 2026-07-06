"""
Bumps versionCode 39 -> 40 and versionName "2.6.0" -> "2.6.1"
in client/android/app/build.gradle

Run from repo root:
    python3 bump_android_version.py
"""

path = "client/android/app/build.gradle"

with open(path) as f:
    content = f.read()

old = """        versionCode 39
        versionName "2.6.0\""""

new = """        versionCode 40
        versionName "2.6.1\""""

assert content.count(old) == 1, f"expected 1 match, found {content.count(old)}"
content = content.replace(old, new)

with open(path, "w") as f:
    f.write(content)

print("✅ Bumped to versionCode 40 / versionName 2.6.1")
