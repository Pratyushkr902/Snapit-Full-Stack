SERVICE_AREA_PATH = "client/src/utils/serviceArea.js"
ADD_ADDRESS_PATH = "client/src/components/AddAddress.jsx"

MAX_ACCEPTABLE_ACCURACY_M = 150

with open(SERVICE_AREA_PATH, "r") as f:
    content = f.read()

old_native = (
    "      const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 8000 })\n"
    "      return { lat: pos.coords.latitude, lng: pos.coords.longitude }"
)
new_native = (
    "      const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 8000 })\n"
    "      return { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy ?? null }"
)
assert content.count(old_native) == 1, "native geolocation anchor not found or not unique"
content = content.replace(old_native, new_native)

old_browser = "      pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),"
new_browser = "      pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy ?? null }),"
assert content.count(old_browser) == 1, "browser geolocation anchor not found or not unique"
content = content.replace(old_browser, new_browser)

with open(SERVICE_AREA_PATH, "w") as f:
    f.write(content)

print(f"Patched {SERVICE_AREA_PATH} — getUserLocation now returns accuracy.")

with open(ADD_ADDRESS_PATH, "r") as f:
    content2 = f.read()

old_handler = (
    "    try {\n"
    "      const { lat, lng } = await getUserLocation()\n"
    "      const result = isInDeliveryZone(lat, lng)\n"
    "      setDetectedLocation({ lat, lng, ...result })\n"
    "      if (result.serviceable) {"
)
new_handler = (
    "    try {\n"
    "      const { lat, lng, accuracy } = await getUserLocation()\n"
    "      if (accuracy != null && accuracy > " + str(MAX_ACCEPTABLE_ACCURACY_M) + ") {\n"
    "        toast.error(`Location signal is weak (±${Math.round(accuracy)}m). Move near a window or outdoors and try again.`)\n"
    "        setLocationStatus('out')\n"
    "        setLocationChecking(false)\n"
    "        return\n"
    "      }\n"
    "      const result = isInDeliveryZone(lat, lng)\n"
    "      setDetectedLocation({ lat, lng, accuracy, ...result })\n"
    "      if (result.serviceable) {"
)
assert content2.count(old_handler) == 1, "AddAddress handler anchor not found or not unique"
content2 = content2.replace(old_handler, new_handler)

with open(ADD_ADDRESS_PATH, "w") as f:
    f.write(content2)

print(f"Patched {ADD_ADDRESS_PATH} — rejects fixes worse than {MAX_ACCEPTABLE_ACCURACY_M}m accuracy.")
