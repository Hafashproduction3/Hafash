import { NextRequest, NextResponse } from "next/server";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import { getFirestore } from "firebase-admin/firestore";

function getAdmin() {
  if (getApps().length > 0) return getApps()[0];

  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey,
    }),
  });
}

export async function POST(req: NextRequest) {
  try {
    const { userId, title, body, link } = await req.json();

    if (!userId || !title) {
      return NextResponse.json(
        { error: "userId and title required" },
        { status: 400 }
      );
    }

    const app = getAdmin();
    const db = getFirestore(app);

    const userSnap = await db.collection("users").doc(userId).get();
    if (!userSnap.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const tokens: string[] = userSnap.data()?.fcmTokens || [];
    if (tokens.length === 0) {
      return NextResponse.json({ ok: true, sent: 0, message: "No tokens" });
    }

    const messaging = getMessaging(app);

    const response = await messaging.sendEachForMulticast({
      tokens,
      notification: {
        title,
        body: body || "",
      },
      data: {
        title: title || "",
        body: body || "",
        link: link || "/notifications",
      },
      webpush: {
        notification: {
          icon: "/hafash-logo.png",
          badge: "/hafash-logo.png",
        },
        fcmOptions: {
          link: link || "/notifications",
        },
      },
    });

    // Remove invalid tokens
    const invalidTokens: string[] = [];
    response.responses.forEach((r, i) => {
      if (!r.success) {
        const code = r.error?.code;
        if (
          code === "messaging/invalid-registration-token" ||
          code === "messaging/registration-token-not-registered"
        ) {
          invalidTokens.push(tokens[i]);
        }
      }
    });

    if (invalidTokens.length > 0) {
      await db
        .collection("users")
        .doc(userId)
        .update({
          fcmTokens: tokens.filter((t) => !invalidTokens.includes(t)),
        });
    }

    return NextResponse.json({
      ok: true,
      sent: response.successCount,
      failed: response.failureCount,
    });
  } catch (err: any) {
    console.error("[SEND_NOTIFICATION] Error:", err);
    return NextResponse.json(
      { error: err.message || "Unknown error" },
      { status: 500 }
    );
  }
}