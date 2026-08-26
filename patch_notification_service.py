path = "server/utils/notificationService.js"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = """    const doc = await Notification.create({
      recipientId,
      recipientType,
      type,
      title:        payload.title,
      shayari:      payload.shayari,
      body:         payload.body,
      metadata,
      fcmToken:     fcmToken || null,
      fcmMessageId: fcmMessageId || null,
    });"""

new = """    const doc = await Notification.create({
      recipientId,
      recipientType,
      type,
      title:        payload.title,
      // FIX: schema requires `message` — it was never being set, so every
      // notification failed validation and was silently never saved.
      message:      payload.body || payload.shayari || payload.title,
      shayari:      payload.shayari,
      body:         payload.body,
      // FIX: schema field is `data`, not `metadata` — was being silently
      // dropped by Mongoose strict mode (orderId etc. never persisted).
      data:         metadata,
      fcmToken:     fcmToken || null,
      fcmMessageId: fcmMessageId || null,
    });"""

assert content.count(old) == 1, f"expected 1 match, found {content.count(old)}"
content = content.replace(old, new)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("patched", path)
