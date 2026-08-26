path = "server/controllers/order.controller.js"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = "async function assignAvailableRider() {"
new = "export async function assignAvailableRider() {"

assert content.count(old) == 1, f"expected 1 match, found {content.count(old)}"
content = content.replace(old, new)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("patched", path)
