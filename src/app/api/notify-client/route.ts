// src/app/api/notify-client/route.ts

import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { bookingId, statusId, message } = await req.json();

    // TODO: WhatsApp / Email integration
    // Abhi ke liye console log
    console.log("[NOTIFY CLIENT]", { bookingId, statusId, message });

    // Future: WhatsApp Cloud API ya email bhejein

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[NOTIFY]", err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}