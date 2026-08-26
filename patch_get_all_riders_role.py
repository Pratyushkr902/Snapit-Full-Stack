path = "server/controllers/user.controller.js"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = """export async function getAllRiders(request, response) {
    try {
        const riders = await UserModel.find({ role: 'rider' }).select('name email mobile status')"""

new = """export async function getAllRiders(request, response) {
    try {
        // FIX: role is stored as 'RIDER' (uppercase) — this was querying lowercase
        // 'rider' and matching nothing, so the admin rider list was always empty.
        const riders = await UserModel.find({ role: 'RIDER' }).select('name email mobile status')"""

assert content.count(old) == 1, f"expected 1 match, found {content.count(old)}"
content = content.replace(old, new)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("patched", path)
