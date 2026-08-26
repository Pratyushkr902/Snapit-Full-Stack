#!/usr/bin/env python3
"""
Fixes: delivery fee / zone / min-order checks were using client-sent lat/lng
instead of the verified, saved address coordinates in all three order-creation
paths (COD, Wallet, Razorpay) in server/controllers/order.controller.js.

Run from repo root:
    python3 patch_delivery_fee.py
"""
import re
import sys

PATH = "server/controllers/order.controller.js"

with open(PATH, "r") as f:
    content = f.read()

original_content = content

# Function boundary markers — each of the 3 order-creation paths starts with
# one of these signatures. We isolate each function body so replacements are
# scoped and can't accidentally touch unrelated code elsewhere in the file.
FUNC_MARKERS = [
    "export async function CashOnDeliveryOrderController",
    "export async function WalletPaymentOrderController",
    "export async function verifyPaymentController",
]

# Locate start indices of each function, in file order
starts = []
for marker in FUNC_MARKERS:
    idx = content.find(marker)
    if idx == -1:
        print(f"ERROR: could not find function marker: {marker!r}")
        sys.exit(1)
    starts.append((idx, marker))
starts.sort(key=lambda pair: pair[0])

# Determine each function's body span: from its start to the start of the
# next function in file order (or end of file for the last one)
spans = []
for i, (idx, marker) in enumerate(starts):
    end = starts[i + 1][0] if i + 1 < len(starts) else len(content)
    spans.append((idx, end, marker))

ADDRESS_ANCHOR = (
    "const address = await AddressModel.findOne({ _id: addressId, userId })\n"
    "        if (!address) return response.status(404).json({ message: 'Address not found.', error: true, success: false })"
)

VERIFY_SNIPPET = (
    ADDRESS_ANCHOR
    + "\n\n"
    + "        // Use the address's own saved, geocoded coordinates for delivery fee /\n"
    + "        // zone / minimum-order logic. Client-sent lat/lng must never drive pricing\n"
    + "        // (device GPS can be stale, cached, or spoofed).\n"
    + "        const verifiedLat = address.lat\n"
    + "        const verifiedLng = address.lng\n"
    + "        if (!isValidCoord(Number(verifiedLat), Number(verifiedLng))) {\n"
    + "            return response.status(400).json({ message: 'Saved address is missing valid coordinates. Please re-save your address.', error: true, success: false })\n"
    + "        }"
)

new_content = content
patched_spans = []

for start, end, marker in spans:
    body = new_content[start:end]
    orig_body = body

    # 1. Insert verified-coordinate resolution right after the address fetch.
    count = body.count(ADDRESS_ANCHOR)
    assert count == 1, f"{marker}: expected 1 address anchor, found {count}"
    body = body.replace(ADDRESS_ANCHOR, VERIFY_SNIPPET)

    # 2. Swap lat/lng -> verifiedLat/verifiedLng in the 4 pricing/zone call sites.
    #    Match regardless of exact whitespace so formatting differences don't
    #    break the anchor.
    replacements = [
        (r"isOutOfDeliveryRange\(\s*lat\s*,\s*lng\s*\)",
         "isOutOfDeliveryRange(verifiedLat, verifiedLng)"),
        (r"getMinOrderAmount\(\s*lat\s*,\s*lng\s*,\s*isPlusForMinOrder\s*\)",
         "getMinOrderAmount(verifiedLat, verifiedLng, isPlusForMinOrder)"),
        (r"calcDeliveryFee\(\s*subTotalAmt\s*,\s*lat\s*,\s*lng\s*,\s*(currentUser|user)\s*\)",
         r"calcDeliveryFee(subTotalAmt, verifiedLat, verifiedLng, \1)"),
        (r"resolveStore\(\s*lat\s*,\s*lng\s*\)",
         "resolveStore(verifiedLat, verifiedLng)"),
    ]

    for pattern, repl in replacements:
        matches = re.findall(pattern, body)
        assert len(matches) == 1, (
            f"{marker}: expected exactly 1 match for pattern {pattern!r}, "
            f"found {len(matches)}"
        )
        body = re.sub(pattern, repl, body, count=1)

    patched_spans.append((start, end, body))

# Reassemble file: replace each function span with its patched body, working
# back-to-front so earlier offsets stay valid.
for start, end, body in sorted(patched_spans, key=lambda x: -x[0]):
    new_content = new_content[:start] + body + new_content[end:]

assert new_content != original_content, "No changes were made — aborting write."

with open(PATH, "w") as f:
    f.write(new_content)

print(f"Patched {PATH} successfully.")
print("Run `node --check server/controllers/order.controller.js` next, then `git --no-pager diff`.")
