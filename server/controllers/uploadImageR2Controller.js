import uploadImageR2 from "../utils/uploadImageR2.js"

const uploadImageR2Controller = async (request, response) => {
    try {
        const file = request.file

        if (!file) {
            return response.status(400).json({
                message: "No file provided for upload",
                error: true,
                success: false
            })
        }

        const upload = await uploadImageR2(file)

        if (!upload?.url && !upload?.secure_url) {
            throw new Error("R2 upload failed or returned invalid data")
        }

        return response.json({
            message: "Upload done",
            data: upload,
            success: true,
            error: false
        })

    } catch (error) {
        console.error("UPLOAD_R2_CONTROLLER_ERROR:", error.message)
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}

export default uploadImageR2Controller