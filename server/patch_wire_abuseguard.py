from pathlib import Path

controller_path = Path("controllers/adminManagement.controller.js")
content = controller_path.read_text()

if "listFrozenIPsController" not in content:
    content = content.replace(
        "import bcryptjs from 'bcryptjs'",
        "import bcryptjs from 'bcryptjs'\nimport { listFrozenIps, unfreezeIpByAddress } from '../middleware/abuseGuard.js'",
        1
    )
    content += '''

export async function listFrozenIPsController(request, response) {
    try {
        const frozenIps = await listFrozenIps()
        return response.json({
            message: "Frozen IPs fetched",
            error: false,
            success: true,
            data: frozenIps
        })
    } catch (error) {
        return response.status(500).json({
            message: error.message || "Failed to fetch frozen IPs",
            error: true,
            success: false
        })
    }
}

export async function unfreezeIPController(request, response) {
    try {
        const { ip } = request.params
        await unfreezeIpByAddress(ip)
        return response.json({
            message: `IP ${ip} unfrozen`,
            error: false,
            success: true
        })
    } catch (error) {
        return response.status(500).json({
            message: error.message || "Failed to unfreeze IP",
            error: true,
            success: false
        })
    }
}
'''
    controller_path.write_text(content)
    print("Patched adminManagement.controller.js")
else:
    print("adminManagement.controller.js already has frozen-IP controllers, skipped")

route_path = Path("route/adminManagement.route.js")
route_content = route_path.read_text()

if "frozen-ips" not in route_content:
    route_content = route_content.replace(
        "    removeAdminController\n} from '../controllers/adminManagement.controller.js'",
        "    removeAdminController,\n    listFrozenIPsController,\n    unfreezeIPController\n} from '../controllers/adminManagement.controller.js'"
    )
    route_content = route_content.replace(
        "export default router",
        "router.get('/frozen-ips', auth, superAdmin, listFrozenIPsController)\n"
        "router.delete('/frozen-ips/:ip', auth, superAdmin, unfreezeIPController)\n\n"
        "export default router"
    )
    route_path.write_text(route_content)
    print("Patched adminManagement.route.js")
else:
    print("adminManagement.route.js already has frozen-ips routes, skipped")

index_path = Path("index.js")
index_content = index_path.read_text()

assert "adminManagementRouter" not in index_content or "app.use('/api/admin-management'" in index_content, \
    "adminManagement import exists but mount line not found — paste index.js so I can adjust"

if "adminManagementRouter" not in index_content:
    assert "const app = express()" in index_content, "couldn't find 'const app = express()' anchor in index.js"
    index_content = index_content.replace(
        "const app = express()",
        "import adminManagementRouter from './route/adminManagement.route.js'\n"
        "import { abuseGuard } from './middleware/abuseGuard.js'\n\n"
        "const app = express()"
    )
    print("Added imports to index.js")

if "app.use('/api/admin-management'" not in index_content:
    assert "app.use(express.json" in index_content, "couldn't find express.json() line to anchor mount after"
    index_content = index_content.replace(
        "app.use(express.json",
        "app.use(abuseGuard('general'))\n\napp.use(express.json",
        1
    )
    index_content += "\napp.use('/api/admin-management', adminManagementRouter)\n"
    index_path.write_text(index_content)
    print("Mounted abuseGuard + adminManagement router in index.js")
else:
    print("index.js already mounts admin-management router, skipped")
