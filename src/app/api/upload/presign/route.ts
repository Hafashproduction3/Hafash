import { NextRequest, NextResponse } from "next/server";
import { r2Storage } from "@/lib/storage/r2";

export async function POST(req: NextRequest) {
  try {
    const { fileName, contentType, folder } = await req.json();

    if (!fileName || !contentType) {
      return NextResponse.json(
        { error: "fileName and contentType required" },
        { status: 400 }
      );
    }

    // Unique key banao — timestamp + random
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const safeName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
    const key = `${folder || "uploads"}/${timestamp}-${random}-${safeName}`;

    // Presigned URL generate karo (5 min valid)
    const uploadUrl = await r2Storage.getSignedUploadUrl(
      key,
      contentType,
      300
    );

    // Public URL (agar public bucket hai)
    const publicUrl = `${process.env.R2_ENDPOINT}/${process.env.R2_BUCKET_NAME}/${key}`;

    return NextResponse.json({
      uploadUrl,
      key,
      publicUrl,
    });
  } catch (err: any) {
    console.error("[PRESIGN] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to generate URL" },
      { status: 500 }
    );
  }
}