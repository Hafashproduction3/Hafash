import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/lib/storage/storage";

export async function POST(req: NextRequest) {
  try {
    const { key } = await req.json();

    if (!key) {
      return NextResponse.json({ error: "Missing key" }, { status: 400 });
    }

    const exists = await storage.fileExists(key);
    if (!exists) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Short-lived signed URL (15 minutes)
    const url = await storage.getSignedUrl(key, 900);

    return NextResponse.json({ url, expiresIn: 900 });
  } catch (err: any) {
    console.error("[DOWNLOAD_ORIGINAL] Error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
