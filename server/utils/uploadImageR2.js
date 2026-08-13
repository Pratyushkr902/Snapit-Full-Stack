import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import sharp from 'sharp';

const s3 = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
});

const uploadImageClodinary = async (image) => {
    const rawBuffer = image?.buffer || Buffer.from(await image.arrayBuffer());
    const mimeType = image?.mimetype || 'image/jpeg';
    const extension = mimeType.split('/')[1] || 'jpg';
    const id = randomUUID();
    const fileName = `snapit/${id}.${extension}`;

    // Strip EXIF/GPS metadata from the original before it ever reaches storage.
    // .rotate() bakes in the visual orientation first (since we're about to
    // drop the orientation tag itself); omitting .withMetadata() means no
    // EXIF/GPS/location data survives into the re-encoded output.
    let buffer = rawBuffer;
    try {
        buffer = await sharp(rawBuffer)
            .rotate()
            .toFormat(extension === 'png' ? 'png' : 'jpeg', { quality: 90 })
            .toBuffer();
    } catch (stripErr) {
        console.error('EXIF_STRIP_FAILED (uploading original as-is):', stripErr.message);
    }

    await s3.send(new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: fileName,
        Body: buffer,
        ContentType: mimeType,
    }));

    const publicUrl = `${process.env.R2_PUBLIC_URL}/${fileName}`;

    // Thumbnail — NEW upload only, never touches any existing image.
    // Wrapped in try/catch: if this fails for any reason, we swallow it
    // and return no thumbnail — the original upload above already
    // succeeded and must not be affected by a thumbnail failure.
    let thumbnailUrl = null;
    try {
        const thumbBuffer = await sharp(buffer)
            .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 75 })
            .toBuffer();
        const thumbFileName = `snapit/thumb_${id}.webp`;
        await s3.send(new PutObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: thumbFileName,
            Body: thumbBuffer,
            ContentType: 'image/webp',
        }));
        thumbnailUrl = `${process.env.R2_PUBLIC_URL}/${thumbFileName}`;
    } catch (thumbErr) {
        console.error('THUMBNAIL_GENERATION_FAILED (non-fatal, original upload still succeeded):', thumbErr.message);
    }

    return {
        url: publicUrl,
        secure_url: publicUrl,
        public_id: fileName,
        thumbnail_url: thumbnailUrl,
    };
};

export default uploadImageClodinary;