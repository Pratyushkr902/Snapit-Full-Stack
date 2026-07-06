"""
Replaces hardcoded rider fallback defaults "Nitish Kumar" / "9576467701"
with "Pratyush Kumar" / "9472026580" in:
  1. server/models/order.model.js (schema defaults for rider_name, rider_contact)
  2. client/src/pages/RiderTracking.jsx (initial state + fallback defaults, 2 spots)

Run from repo root:
    python3 patch_rider_default_name.py
"""

# ── Part 1: order.model.js ──────────────────────────────────────────────────
path1 = "server/models/order.model.js"

with open(path1) as f:
    content1 = f.read()

old1 = """        rider_name:    { type: String, default: "Nitish Kumar" },
        rider_contact: { type: String, default: "9576467701" },"""
new1 = """        rider_name:    { type: String, default: "Pratyush Kumar" },
        rider_contact: { type: String, default: "9472026580" },"""

assert content1.count(old1) == 1, f"[Part 1] expected 1 match in {path1}, found {content1.count(old1)}"
content1 = content1.replace(old1, new1)

with open(path1, "w") as f:
    f.write(content1)
print(f"[Part 1] Updated default rider name/contact in {path1}")


# ── Part 2: RiderTracking.jsx ────────────────────────────────────────────────
path2 = "client/src/pages/RiderTracking.jsx"

with open(path2) as f:
    content2 = f.read()

old2a = """    const [riderData, setRiderData] = useState({
        name: 'Nitish Kumar',
        contact: '9576467701',
    });"""
new2a = """    const [riderData, setRiderData] = useState({
        name: 'Pratyush Kumar',
        contact: '9472026580',
    });"""

assert content2.count(old2a) == 1, f"[Part 2a] expected 1 match in {path2}, found {content2.count(old2a)}"
content2 = content2.replace(old2a, new2a)

old2b = """                setRiderData({
                    name:    rider_name    || 'Nitish Kumar',
                    contact: rider_contact || '9576467701',
                });"""
new2b = """                setRiderData({
                    name:    rider_name    || 'Pratyush Kumar',
                    contact: rider_contact || '9472026580',
                });"""

assert content2.count(old2b) == 1, f"[Part 2b] expected 1 match in {path2}, found {content2.count(old2b)}"
content2 = content2.replace(old2b, new2b)

with open(path2, "w") as f:
    f.write(content2)
print(f"[Part 2] Updated fallback rider name/contact (2 spots) in {path2}")

print("\nAll patches applied successfully.")
