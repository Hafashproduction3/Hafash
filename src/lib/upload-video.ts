import { Upload } from "@aws-sdk/lib-storage";
import { S3Client } from "@aws-sdk/client-s3";

const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.NEXT_PUBLIC_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.NEXT_PUBLIC_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.NEXT_PUBLIC_R2_SECRET_ACCESS_KEY!,
  },
});

export async function uploadVideoInChunks(
  file: File,
  onProgress: (percent: number) => void
) {
  const CHUNK_SIZE = 100 * 1024 * 1024; // 50MB

  const upload = new Upload({
    client: r2Client,
    params: {
      Bucket: process.env.NEXT_PUBLIC_R2_BUCKET_NAME!,
      Key: `videos/${Date.now()}-${file.name.replace(/[^a-z0-9.]/gi, '_')}`,
      Body: file,
      ContentType: file.type,
    },
    queueSize: 8,
    partSize: CHUNK_SIZE,
    leavePartsOnError: false,
  });

  upload.on("httpUploadProgress", (progress) => {
    if (progress.loaded && progress.total) {
      const percent = Math.round((progress.loaded / progress.total) * 100);
      onProgress(percent);
    }
  });

  try {
    const result = await upload.done();
    return result;
  } catch (err) {
    console.error("Upload failed:", err);
    throw err;
  }
}