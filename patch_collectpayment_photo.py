path = "client/src/components/CollectPayment.jsx"
with open(path, "r") as f:
    content = f.read()

# ── 1. Add state ──
state_anchor = "const [pendingCash, setPendingCash] = useState(null)"
state_new = state_anchor + """

    // ── Delivery proof photo ────────────────────────
    const [proofPhoto, setProofPhoto] = useState(null)
    const [uploadingPhoto, setUploadingPhoto] = useState(false)"""

if "proofPhoto" in content:
    print("ℹ️ State already patched, skipping state insert.")
elif state_anchor not in content:
    print("❌ State anchor not found. Aborting.")
    exit(1)
else:
    assert content.count(state_anchor) == 1
    content = content.replace(state_anchor, state_new, 1)
    print("✅ State added.")

# ── 2. Add handlePhotoCapture, before handleVerifyOtp ──
handler_anchor = "    // Step 2: verify OTP, only this marks Delivered\n    const handleVerifyOtp = async () => {"
handler_new = """    // Capture and upload delivery proof photo
    const handlePhotoCapture = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        try {
            setUploadingPhoto(true)
            const formData = new FormData()
            formData.append('image', file)
            const response = await Axios({
                ...SummaryApi.uploadImage,
                data: formData,
                headers: { 'Content-Type': 'multipart/form-data' }
            })
            if (response.data.success) {
                setProofPhoto(response.data.data.url || response.data.data.secure_url)
            } else {
                toast.error('Photo upload failed. Try again.')
            }
        } catch (error) {
            toast.error('Photo upload failed. Try again.')
        } finally {
            setUploadingPhoto(false)
        }
    }

    // Step 2: verify OTP, only this marks Delivered
    const handleVerifyOtp = async () => {
        if (!proofPhoto) {
            setOtpError('Take a delivery photo first.')
            return
        }"""

if "handlePhotoCapture" in content:
    print("ℹ️ Handler already patched, skipping.")
elif handler_anchor not in content:
    print("❌ Handler anchor not found. Aborting.")
    exit(1)
else:
    assert content.count(handler_anchor) == 1
    content = content.replace(handler_anchor, handler_new, 1)
    print("✅ handlePhotoCapture added, guard added to handleVerifyOtp.")

# ── 3. Send photo in the verify API call ──
api_anchor = "data: { orderId: order.orderId, otp: otp.trim() }"
api_new = "data: { orderId: order.orderId, otp: otp.trim(), deliveryProofPhoto: proofPhoto }"

if "deliveryProofPhoto: proofPhoto" in content:
    print("ℹ️ API call already patched, skipping.")
elif api_anchor not in content:
    print("❌ API anchor not found. Aborting.")
    exit(1)
else:
    assert content.count(api_anchor) == 1
    content = content.replace(api_anchor, api_new, 1)
    print("✅ API call now sends deliveryProofPhoto.")

with open(path, "w") as f:
    f.write(content)

print("✅ CollectPayment.jsx fully patched.")
