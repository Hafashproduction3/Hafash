import { NextRequest, NextResponse } from "next/server";
import { S3Client, DeleteObjectsCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function POST(req: NextRequest) {
  try {
    const { keys } = await req.json();

    // Validation
    if (!keys || !Array.isArray(keys) || keys.length === 0) {
      return NextResponse.json({ success: true, deleted: 0 });
    }

    // Sirf valid string keys filter karein
    const validKeys = keys.filter(
      (k: any) => typeof k === "string" && k.trim().length > 0
    );

    if (validKeys.length === 0) {
      return NextResponse.json({ success: true, deleted: 0 });
    }

    // R2 se delete karein
    const command = new DeleteObjectsCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Delete: {
        Objects: validKeys.map((key: string) => ({ Key: key })),
        Quiet: true,
      },
    });

    const result = await s3.send(command);

    return NextResponse.json({
      success: true,
      deleted: result.Deleted?.length || 0,
      errors: result.Errors || [],
    });
  } catch (error: any) {
    console.error("R2 delete error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Delete failed" },
      { status: 500 }
    );
  }
}