path = "server/utils/firebaseNotify.js"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = """        const riders = await UserModel.find({
            role: 'rider',
            fcmToken: { $exists: true, $ne: null, $ne: '' }
        }).select('fcmToken name')"""

new = """        // FIX: role is stored as 'RIDER' (uppercase) in the User model — this was
        // querying lowercase 'rider', matching zero documents (MongoDB string
        // equality is case-sensitive), so rider push notifications silently never
        // fired for any order, ever.
        const riders = await UserModel.find({
            role: 'RIDER',
            fcmToken: { $exists: true, $ne: null, $ne: '' }
        }).select('fcmToken name')"""

assert content.count(old) == 1, f"expected 1 match, found {content.count(old)}"
content = content.replace(old, new)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("patched", path)
