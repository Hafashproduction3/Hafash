import { NextRequest, NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const r2 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function POST(req: NextRequest) {
  try {
    const { key, filename } = await req.json();

    if (!key) {
      return NextResponse.json({ error: "Missing key" }, { status: 400 });
    }

    const bucketName = process.env.R2_BUCKET_NAME || "";
    const downloadFilename = filename || key.split('/').pop() || 'photo.jpg';

    // ✅ ResponseContentDisposition forces browser to download (not preview)
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
      ResponseContentDisposition: `attachment; filename="${downloadFilename}"`,
      ResponseContentType: 'application/octet-stream',
    });

    const url = await getSignedUrl(r2, command, { expiresIn: 900 });

    return NextResponse.json({ 
      url, 
      filename: downloadFilename,
      expiresIn: 900 
    });
  } catch (err: any) {
    console.error("[DOWNLOAD_ORIGINAL] Error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}