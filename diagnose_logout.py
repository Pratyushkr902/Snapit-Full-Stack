path = "server/controllers/user.controller.js"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

marker = "await UserModel.findByIdAndUpdate(userid, { refresh_token"
idx = content.find(marker)
if idx == -1:
    print("MARKER NOT FOUND")
else:
    print(repr(content[idx-220:idx+80]))
