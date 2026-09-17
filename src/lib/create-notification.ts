/**
 * Hafash — Client-side Notification Creator
 * Call these helpers from any page when an action happens.
 */

import {
    collection,
    addDoc,
    serverTimestamp,
    doc,
    getDoc,
  } from "firebase/firestore";
  import type { NotificationType } from "./notifications";
  
  // ─────────────────────────────────────────────────────────────
  // Core function — creates a notification in Firestore
  // ─────────────────────────────────────────────────────────────
  
  export async function createNotification(
    firestore: any,
    {
      userId,
      type,
      title,
      body,
      link,
      actorId,
      actorName,
    }: {
      userId: string;
      type: NotificationType;
      title: string;
      body: string;
      link: string;
      actorId?: string;
      actorName?: string;
    }
  ): Promise<void> {
    if (!firestore || !userId) return;
  
    try {
      await addDoc(collection(firestore, "notifications"), {
        userId,
        type,
        title,
        body,
        link,
        actorId: actorId || "",
        actorName: actorName || "",
        read: false,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("[CREATE_NOTIFICATION] Error:", err);
    }
  }
  
  // ─────────────────────────────────────────────────────────────
  // CONVENIENCE WRAPPERS
  // ─────────────────────────────────────────────────────────────
  
  /**
   * Jab koi cross request bheji jaye (hirer → professional)
   */
  export async function notifyNewRequest(
    firestore: any,
    {
      professionalId,
      hirerId,
      hirerName,
      eventType,
      requestId,
    }: {
      professionalId: string;
      hirerId: string;
      hirerName: string;
      eventType: string;
      requestId: string;
    }
  ) {
    await createNotification(firestore, {
      userId: professionalId,
      type: "new_request",
      title: "🔔 Naya Cross Request",
      body: `${hirerName} ne aapko ${eventType} ke liye request bheji hai`,
      link: `/network/incoming`,
      actorId: hirerId,
      actorName: hirerName,
    });
  }
  
  /**
   * Jab professional request accept kare
   */
  export async function notifyRequestAccepted(
    firestore: any,
    {
      hirerId,
      professionalId,
      professionalName,
      eventType,
      requestId,
    }: {
      hirerId: string;
      professionalId: string;
      professionalName: string;
      eventType: string;
      requestId: string;
    }
  ) {
    await createNotification(firestore, {
      userId: hirerId,
      type: "request_accepted",
      title: "✅ Request Accept Ho Gayi",
      body: `${professionalName} ne aapki ${eventType} wali request accept kar li hai`,
      link: `/network/chat/${requestId}`,
      actorId: professionalId,
      actorName: professionalName,
    });
  }
  
  /**
   * Jab professional request decline kare
   */
  export async function notifyRequestDeclined(
    firestore: any,
    {
      hirerId,
      professionalId,
      professionalName,
      eventType,
    }: {
      hirerId: string;
      professionalId: string;
      professionalName: string;
      eventType: string;
    }
  ) {
    await createNotification(firestore, {
      userId: hirerId,
      type: "request_declined",
      title: "Request Decline Hui",
      body: `${professionalName} ne aapki ${eventType} wali request decline kar di hai`,
      link: `/network/requests`,
      actorId: professionalId,
      actorName: professionalName,
    });
  }
  
  /**
   * Jab naya chat message aaye (networkChats)
   */
  export async function notifyNewMessage(
    firestore: any,
    {
      recipientId,
      senderId,
      senderName,
      message,
      requestId,
    }: {
      recipientId: string;
      senderId: string;
      senderName: string;
      message: string;
      requestId: string;
    }
  ) {
    const preview = message.length > 80 ? message.slice(0, 80) + "..." : message;
  
    await createNotification(firestore, {
      userId: recipientId,
      type: "new_message",
      title: `💬 ${senderName} ne message bheja`,
      body: preview,
      link: `/network/chat/${requestId}`,
      actorId: senderId,
      actorName: senderName,
    });
  }
  
  /**
   * Jab naya review aaye
   */
  export async function notifyNewReview(
    firestore: any,
    {
      revieweeId,
      reviewerId,
      reviewerName,
      stars,
    }: {
      revieweeId: string;
      reviewerId: string;
      reviewerName: string;
      stars: number;
    }
  ) {
    await createNotification(firestore, {
      userId: revieweeId,
      type: "new_review",
      title: `⭐ ${reviewerName} ne aapko ${stars} star diye`,
      body: "Aapki profile par naya review aaya hai — dekhne ke liye tap karein",
      link: `/network/professional/${revieweeId}`,
      actorId: reviewerId,
      actorName: reviewerName,
    });
  }
  
  /**
   * Jab event complete mark ho
   */
  export async function notifyMarkedComplete(
    firestore: any,
    {
      recipientId,
      actorId,
      actorName,
      eventType,
      requestId,
    }: {
      recipientId: string;
      actorId: string;
      actorName: string;
      eventType: string;
      requestId: string;
    }
  ) {
    await createNotification(firestore, {
      userId: recipientId,
      type: "marked_complete",
      title: "✔️ Event Complete Mark Hua",
      body: `${actorName} ne ${eventType} ko complete mark kiya — ab aap review de sakte hain`,
      link: `/network/requests`,
      actorId: actorId,
      actorName: actorName,
    });
  }
  
  /**
   * Jab location owner ko message aaye
   */
  export async function notifyLocationMessage(
    firestore: any,
    {
      ownerId,
      senderId,
      senderName,
      message,
      locationId,
      locationName,
    }: {
      ownerId: string;
      senderId: string;
      senderName: string;
      message: string;
      locationId: string;
      locationName: string;
    }
  ) {
    const preview = message.length > 80 ? message.slice(0, 80) + "..." : message;
  
    await createNotification(firestore, {
      userId: ownerId,
      type: "location_message",
      title: `📍 ${senderName} ne ${locationName} ke liye message bheja`,
      body: preview,
      link: `/locations/${locationId}`,
      actorId: senderId,
      actorName: senderName,
    });
  }
  
  /**
   * Jab location book ho jaye
   */
  export async function notifyLocationBooked(
    firestore: any,
    {
      ownerId,
      bookerId,
      bookerName,
      locationName,
      date,
    }: {
      ownerId: string;
      bookerId: string;
      bookerName: string;
      locationName: string;
      date: string;
    }
  ) {
    await createNotification(firestore, {
      userId: ownerId,
      type: "location_booked",
      title: `📅 ${locationName} Book Ho Gayi!`,
      body: `${bookerName} ne ${date} ke liye booking confirm ki hai`,
      link: `/locations`,
      actorId: bookerId,
      actorName: bookerName,
    });
  }