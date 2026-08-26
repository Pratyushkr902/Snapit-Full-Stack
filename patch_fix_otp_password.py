import pathlib

model_path = pathlib.Path("server/models/user.model.js")
model_content = model_path.read_text()

old_password_field = '''    password : {
        type : String,
        required : [true, "provide password"]
    },'''
new_password_field = '''    password : {
        type : String,
        default : null
    },'''

assert model_content.count(old_password_field) == 1, "password field block not found or not unique in user.model.js"
model_content = model_content.replace(old_password_field, new_password_field)
model_path.write_text(model_content)
print(f"Patched {model_path}")

controller_path = pathlib.Path("server/controllers/user.controller.js")
controller_content = controller_path.read_text()

old_login_check = '''        const checkPassword = await bcryptjs.compare(password, user.password)

        if (!checkPassword) {
            return response.status(400).json({
                message: "Check your password",
                error: true,
                success: false
            })
        }'''
new_login_check = '''        if (!user.password) {
            return response.status(400).json({
                message: "This account was created via OTP login. Please log in with OTP instead of a password.",
                error: true,
                success: false
            })
        }

        const checkPassword = await bcryptjs.compare(password, user.password)

        if (!checkPassword) {
            return response.status(400).json({
                message: "Check your password",
                error: true,
                success: false
            })
        }'''

assert controller_content.count(old_login_check) == 1, "login password-check block not found or not unique in user.controller.js"
controller_content = controller_content.replace(old_login_check, new_login_check)
controller_path.write_text(controller_content)
print(f"Patched {controller_path}")
print("Done.")
