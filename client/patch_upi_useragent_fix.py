import json

path = "capacitor.config.json"
with open(path, "r") as f:
    config = json.load(f)

config["android"]["overrideUserAgent"] = "Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36"

with open(path, "w") as f:
    json.dump(config, f, indent=8)

print("✅ overrideUserAgent added via JSON parse")
