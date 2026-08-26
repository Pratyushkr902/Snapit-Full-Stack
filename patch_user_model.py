import re

path = "server/models/user.model.js"
with open(path, "r") as f:
    content = f.read()

old = """    usedPromoCodes: {
        type: [String],
        default: []
    },"""

new = """    usedPromoCodes: {
        // Each entry: { code: 'SNAPIT', usedAt: <Date> } — one use per calendar month per code
        type: [{
            code: { type: String },
            usedAt: { type: Date }
        }],
        default: []
    },"""

assert content.count(old) == 1, f"expected 1 match, found {content.count(old)}"
content = content.replace(old, new)

with open(path, "w") as f:
    f.write(content)

print("patched", path)
