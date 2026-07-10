path = "src/utils/firebase.js"
with open(path, "r") as f:
    src = f.read()

old = """        const swRegistration = await navigator.serviceWorker.register(
            '/sw.js'
        )"""

new = """        const swRegistration = await navigator.serviceWorker.register(
            '/firebase-messaging-sw.js'
        )"""

if old not in src:
    print("❌ block not found verbatim")
else:
    src = src.replace(old, new)
    print("✅ service worker registration fixed to use firebase-messaging-sw.js")

with open(path, "w") as f:
    f.write(src)
