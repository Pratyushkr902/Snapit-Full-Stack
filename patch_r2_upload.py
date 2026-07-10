# ── 1. Add uploadImageR2 entry to SummaryApi.js ──
path1 = "client/src/common/SummaryApi.js"
with open(path1, "r") as f:
    content1 = f.read()

anchor1 = """    uploadImage : {
        url : '/api/file/upload',
        method : 'post'
    },"""

new1 = anchor1 + """
    uploadImageR2 : {
        url : '/api/file/upload-r2',
        method : 'post'
    },"""

if "uploadImageR2" in content1:
    print("ℹ️ SummaryApi.js already patched, skipping.")
elif anchor1 not in content1:
    print("❌ SummaryApi.js anchor not found. Aborting.")
    exit(1)
else:
    assert content1.count(anchor1) == 1
    content1 = content1.replace(anchor1, new1, 1)
    with open(path1, "w") as f:
        f.write(content1)
    print("✅ SummaryApi.js patched with uploadImageR2.")

# ── 2. Point handlePhotoCapture at uploadImageR2 ──
path2 = "client/src/components/CollectPayment.jsx"
with open(path2, "r") as f:
    content2 = f.read()

anchor2 = "...SummaryApi.uploadImage,\n                data: formData,"
new2 = "...SummaryApi.uploadImageR2,\n                data: formData,"

if "SummaryApi.uploadImageR2" in content2:
    print("ℹ️ CollectPayment.jsx already patched, skipping.")
elif anchor2 not in content2:
    print("❌ CollectPayment.jsx anchor not found. Aborting.")
    exit(1)
else:
    assert content2.count(anchor2) == 1
    content2 = content2.replace(anchor2, new2, 1)
    with open(path2, "w") as f:
        f.write(content2)
    print("✅ CollectPayment.jsx now uses uploadImageR2 for delivery proof photos.")
