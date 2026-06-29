import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

const s3 = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
});

const uploadImageClodinary = async (image) => {
    const buffer = image?.buffer || Buffer.from(await image.arrayBuffer());
    const mimeType = image?.mimetype || 'image/jpeg';
    const extension = mimeType.split('/')[1] || 'jpg';
    const fileName = `snapit/${randomUUID()}.${extension}`;

    await s3.send(new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: fileName,
        Body: buffer,
        ContentType: mimeType,
    }));

    const publicUrl = `${process.env.R2_PUBLIC_URL}/${fileName}`;

    return {
        secure_url: publicUrl,
        public_id: fileName,
    };
};

export default uploadImageClodinary;