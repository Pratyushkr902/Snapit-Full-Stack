path = "server/index.js"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = """const registerLimiter = rateLimit({
    windowMs:         60 * 60 * 1000,
    max:              3,
    standardHeaders:  true,
    legacyHeaders:    false,
    message: { message: 'Too many accounts created from this IP. Please try again later.', error: true, success: false },
})"""

new = """const registerLimiter = rateLimit({
    windowMs:         60 * 60 * 1000,
    // FIX: raised from 3 -> 10. Indian mobile carriers heavily use CGNAT, so many
    // genuinely different users (e.g. Campus Ambassador referrals signing up
    // together on the same campus WiFi or mobile network) were sharing one public
    // IP and getting falsely blocked after the 3rd signup. Still bounded to guard
    // against abuse, just less likely to hit real users signing up in groups.
    max:              10,
    standardHeaders:  true,
    legacyHeaders:    false,
    message: { message: 'Too many accounts created from this IP. Please try again later.', error: true, success: false },
})"""

assert content.count(old) == 1, f"expected 1 match, found {content.count(old)}"
content = content.replace(old, new)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("patched", path)
