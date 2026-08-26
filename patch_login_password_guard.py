import pathlib

controller_path = pathlib.Path("server/controllers/user.controller.js")
controller_content = controller_path.read_text()

already_patched_marker = "This account was created via OTP login"
if already_patched_marker in controller_content:
    print("Already patched — nothing to do.")
else:
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

    assert controller_content.count(old_login_check) == 1, "login password-check block not found or not unique in user.controller.js — paste the file so I can adjust the patch"
    controller_content = controller_content.replace(old_login_check, new_login_check)
    controller_path.write_text(controller_content)
    print(f"Patched {controller_path}")
