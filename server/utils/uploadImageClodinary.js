import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
    cloud_name : process.env.CLOUDINARY_CLOUD_NAME,
    api_key : process.env.CLOUDINARY_API_KEY,
    api_secret : process.env.CLOUDINARY_API_SECRET
})

const uploadImageClodinary = async(image)=>{
    // FIXED: Improved buffer conversion to handle different multer storage engines
    const buffer = image?.buffer || Buffer.from(await image.arrayBuffer())

    const uploadImage = await new Promise((resolve,reject)=>{
        cloudinary.uploader.upload_stream({ folder : "snapit" }, (error, uploadResult) => {
            // FIXED: Explicitly handle the error case to prevent the server from hanging
            if (error) {
                console.error("Cloudinary Upload Error:", error);
                return reject(error);
            }
            // FIXED: Returns the full result object (including secure_url)
            return resolve(uploadResult);
        }).end(buffer)
    })

    return uploadImage
}

export default uploadImageClodinary