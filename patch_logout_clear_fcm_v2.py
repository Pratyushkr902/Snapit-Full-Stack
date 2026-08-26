path = "server/controllers/user.controller.js"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = """        await UserModel.findByIdAndUpdate(userid, { refresh_token: "" })"""

new = """        // FIX: also clear fcmToken on logout. Previously a device's FCM token
        // stayed on the account forever once saved — if the same physical device
        // was ever used to log into a different role (e.g. testing the Rider
        // Dashboard from an admin's phone), that device's token would silently
        // keep receiving that role's push notifications indefinitely, even after
        // switching back to a different account on the same device.
        await UserModel.findByIdAndUpdate(userid, { refresh_token: "", fcmToken: "" })"""

assert content.count(old) == 1, f"expected 1 match, found {content.count(old)}"
content = content.replace(old, new)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("patched", path)
