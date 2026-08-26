path = "server/models/order.model.js"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = """        rider_name:    { type: String, default: "Mohit kr keshri" },
        rider_contact: { type: String, default: "9229295453" },"""

new = """        // FIX: previously hardcoded to a specific real rider's name + personal
        // phone number as the schema default. Any order that never went through
        // explicit rider-assignment logic (e.g. every food order, before that was
        // fixed in foodOrder.controller.js) silently displayed that person's real
        // contact info to customers, whether or not they were actually assigned.
        rider_name:    { type: String, default: "Unassigned" },
        rider_contact: { type: String, default: "" },"""

assert content.count(old) == 1, f"expected 1 match, found {content.count(old)}"
content = content.replace(old, new)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("patched", path)
