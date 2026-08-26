#!/usr/bin/env python3
import re

PATH = "server/utils/serviceArea.js"

with open(PATH, "r") as f:
    content = f.read()

anchor1 = "const STORE_LOCATION = { lat: 25.33121156659458, lng: 84.8006737574818 }"
assert content.count(anchor1) == 1, "STORE_LOCATION anchor not found or not unique"

insert1 = anchor1 + (
    "\n\n"
    "// Must match MAX_DELIVERY_RADIUS_KM in server/utils/deliveryFee.js — this is\n"
    "// the real deliverable range. Village circles below are ONLY used to guess a\n"
    "// friendly display name; they must never be the pass/fail gate, or customers\n"
    "// who fall between two circles get wrongly rejected even though we can\n"
    "// actually deliver to them.\n"
    "const MAX_DELIVERY_RADIUS_KM = 14"
)
content = content.replace(anchor1, insert1)

pattern = re.compile(
    r"export function isInDeliveryZone\(lat, lng\) \{.*?\n\}\n",
    re.DOTALL
)
matches = pattern.findall(content)
assert len(matches) == 1, f"expected exactly 1 isInDeliveryZone function, found {len(matches)}"

new_function = (
    "export function isInDeliveryZone(lat, lng) {\n"
    "  if (lat == null || lng == null) return { serviceable: false, zone: null }\n"
    "\n"
    "  const storeDistanceKm = getDistanceKm(lat, lng, STORE_LOCATION.lat, STORE_LOCATION.lng)\n"
    "  const serviceable = storeDistanceKm <= MAX_DELIVERY_RADIUS_KM\n"
    "\n"
    "  let nearest = null\n"
    "  for (const zone of DELIVERY_ZONES) {\n"
    "    const dist = getDistanceKm(lat, lng, zone.lat, zone.lng)\n"
    "    if (!nearest || dist < nearest.dist) {\n"
    "      nearest = { zone: zone.name, dist }\n"
    "    }\n"
    "  }\n"
    "\n"
    "  return {\n"
    "    serviceable,\n"
    "    zone: nearest ? nearest.zone : 'your area',\n"
    "    distanceKm: Number(storeDistanceKm.toFixed(1)),\n"
    "  }\n"
    "}\n"
)

content = pattern.sub(new_function, content, count=1)

with open(PATH, "w") as f:
    f.write(content)

print(f"Patched {PATH} successfully.")
