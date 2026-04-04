import uploadImageClodinary from "../utils/uploadImageClodinary.js"

const uploadImageController = async(request,response)=>{
    try {
        const file = request.file

        // SAFETY CHECK: Prevent 500 error if no file is provided in the request
        if (!file) {
            return response.status(400).json({
                message: "No file provided for upload",
                error: true,
                success: false
            });
        }

        // FIXED: Changed variable name to 'upload' to avoid name collision 
        // with the imported 'uploadImageClodinary' function
        const upload = await uploadImageClodinary(file)

        // VALIDATION: Ensure Cloudinary actually returned a URL
        if (!upload || !upload.url) {
            throw new Error("Cloudinary upload failed or returned invalid data");
        }

        return response.json({
            message : "Upload done",
            data : upload, // Now contains secure_url, public_id, etc.
            success : true,
            error : false
        })
    } catch (error) {
        // LOGGING: Helps you see the exact error in Render Logs
        console.error("UPLOAD_CONTROLLER_ERROR:", error.message);
        
        return response.status(500).json({
            message : error.message || error,
            error : true,
            success : false
        })
    }
}

export default uploadImageController