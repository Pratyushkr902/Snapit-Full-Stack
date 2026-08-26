from pathlib import Path

index_path = Path("index.js")
content = index_path.read_text()

# remove the wrongly-placed line at the end (after export default app)
bad_tail = "export default app\napp.use('/api/admin-management', adminManagementRouter)"
assert content.count(bad_tail) == 1, "bad tail pattern not found/unique — paste index.js tail so I can adjust"
content = content.replace(bad_tail, "export default app")

# insert it correctly in the main route-mount block
anchor = "app.use('/api/admin/accounts',  dailyAccountRouter)       // ✅ NEW"
assert content.count(anchor) == 1, "anchor line not found/unique"
content = content.replace(
    anchor,
    anchor + "\napp.use('/api/admin-management', adminManagementRouter)"
)

index_path.write_text(content)
print("Moved admin-management route mount to correct block")
