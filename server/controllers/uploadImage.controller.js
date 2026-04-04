import uploadImageClodinary from "../utils/uploadImageClodinary.js"

const uploadImageController = async(request,response)=>{
    try {
        const file = request.file

        // SAFETY CHECK: Prevent server crash if no file is sent
        if (!file) {
            return response.status(400).json({
                message: "No file provided for upload",
                error: true,
                success: false
            });
        }

        // FIXED: Using 'upload' to avoid collision with the imported function name
        const upload = await uploadImageClodinary(file)

        // VALIDATION: Ensure Cloudinary returned a valid response
        if (!upload || !upload.url) {
            throw new Error("Cloudinary upload failed or returned invalid data");
        }

        return response.json({
            message : "Upload done",
            data : upload, // Contains secure_url, public_id, etc.
            success : true,
            error : false
        })

    } catch (error) {
        // LOGGING: Critical for debugging 500 errors in Render Logs
        console.error("UPLOAD_CONTROLLER_ERROR:", error.message);
        
        return response.status(500).json({
            message : error.message || error,
            error : true,
            success : false
        })
    }
}

export default uploadImageController