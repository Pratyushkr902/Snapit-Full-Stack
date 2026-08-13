path = "android/app/build.gradle"
with open(path, "r") as f:
    src = f.read()

old = '''        versionCode 43
        versionName "2.6.4"'''

new = '''        versionCode 44
        versionName "2.6.5"'''

if old not in src:
    print("❌ version block not found verbatim")
else:
    src = src.replace(old, new)
    with open(path, "w") as f:
        f.write(src)
    print("✅ version bumped: 43 -> 44, 2.6.4 -> 2.6.5")
