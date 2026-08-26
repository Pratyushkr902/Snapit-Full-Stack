path = "server/controllers/foodOrder.controller.js"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

marker = "await deductWallet(req.userId, fields.walletAmountUsed"
idx = content.find(marker)
if idx == -1:
    print("MARKER NOT FOUND")
else:
    print(repr(content[idx-20:idx+520]))
