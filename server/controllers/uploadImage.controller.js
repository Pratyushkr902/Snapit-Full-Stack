import uploadImageClodinary from "../utils/uploadImageClodinary.js"

const uploadImageController = async(request,response)=>{
    try {
        const file = request.file

        // FIXED: Changed variable name from 'uploadImage' to 'upload' 
        // to avoid conflict with the imported 'uploadImageClodinary' function
        const upload = await uploadImageClodinary(file)

        return response.json({
            message : "Upload done",
            data : upload, // This now correctly contains the Cloudinary response (url, public_id, etc.)
            success : true,
            error : false
        })
    } catch (error) {
        return response.status(500).json({
            message : error.message || error,
            error : true,
            success : false
        })
    }
}

export default uploadImageController