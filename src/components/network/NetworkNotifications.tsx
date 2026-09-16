"use client";

import { useEffect, useRef, useMemo } from "react";
import { useUser, useFirestore, useCollection } from "@/firebase";
import {
  collection,
  query,
  where,
  limit,
  doc,
  onSnapshot,
} from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { usePathname } from "next/navigation";

/**
 * Global Network Notifications Listener
 * Shows toast notifications for network activity
 */
export function NetworkNotifications() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const pathname = usePathname();

  const notifiedRequests = useRef<Set<string>>(new Set());
  const notifiedMessages = useRef<Set<string>>(new Set());
  const isFirstLoad = useRef(true);

  // ─── Incoming requests (professional side) ───
  const incomingQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, "networkRequests"),
      where("professionalId", "==", user.uid),
      where("status", "==", "pending"),
      limit(20)
    );
  }, [firestore, user?.uid]);

  const { data: incomingRequests } = useCollection(incomingQuery);

  // ─── Outgoing requests (hirer side) ───
  const outgoingQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, "networkRequests"),
      where("hirerId", "==", user.uid),
      limit(20)
    );
  }, [firestore, user?.uid]);

  const { data: outgoingRequests } = useCollection(outgoingQuery);

  // ─── Accepted requests (to watch for messages) ───
  const acceptedAsHirerQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, "networkRequests"),
      where("hirerId", "==", user.uid),
      where("status", "in", ["accepted", "completed"])
    );
  }, [firestore, user?.uid]);

  const acceptedAsProQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, "networkRequests"),
      where("professionalId", "==", user.uid),
      where("status", "in", ["accepted", "completed"])
    );
  }, [firestore, user?.uid]);

  const { data: acceptedAsHirer } = useCollection(acceptedAsHirerQuery);
  const { data: acceptedAsPro } = useCollection(acceptedAsProQuery);

  const allAcceptedRequests = useMemo(() => {
    const map = new Map<string, any>();
    [...(acceptedAsHirer || []), ...(acceptedAsPro || [])].forEach((r: any) => {
      if (r?.id) map.set(r.id, r);
    });
    return Array.from(map.values());
  }, [acceptedAsHirer, acceptedAsPro]);

  // ─── Notify: New incoming request ───
  useEffect(() => {
    if (!user || !incomingRequests) return;

    if (isFirstLoad.current) {
      incomingRequests.forEach((r: any) => notifiedRequests.current.add(`new_${r.id}`));
      return;
    }

    incomingRequests.forEach((r: any) => {
      const key = `new_${r.id}`;
      if (notifiedRequests.current.has(key)) return;
      notifiedRequests.current.add(key);

      if (pathname.includes('/network/incoming')) return;

      toast({
        title: "🔔 Naya Cross Request",
        description: `${r.hirerName || "Kisi professional"} ne aapko ${r.eventType} ke liye request bheji hai`,
        duration: 6000,
      });
    });
  }, [incomingRequests, user, toast, pathname]);

  // ─── Notify: Accepted/Declined ───
  useEffect(() => {
    if (!user || !outgoingRequests) return;

    outgoingRequests.forEach((r: any) => {
      if (r.status === "accepted" || r.status === "declined") {
        const key = `status_${r.id}_${r.status}`;
        if (notifiedRequests.current.has(key)) return;
        notifiedRequests.current.add(key);

        const updatedSec = r.updatedAt?.seconds || 0;
        const now = Math.floor(Date.now() / 1000);
        if (updatedSec && now - updatedSec > 86400) return;

        if (pathname.includes('/network/requests')) return;

        if (r.status === "accepted") {
          toast({
            title: "✅ Request Accept Ho Gayi!",
            description: `${r.professionalName || "Professional"} ne aapki request accept kar li`,
            duration: 6000,
          });
        } else {
          toast({
            title: "Request Decline Hui",
            description: `${r.professionalName || "Professional"} ne request decline kar di`,
            duration: 5000,
          });
        }
      }
    });
  }, [outgoingRequests, user, toast, pathname]);

  // ─── Notify: New chat messages ───
  useEffect(() => {
    if (!firestore || !user || allAcceptedRequests.length === 0) return;

    const unsubscribes: Array<() => void> = [];

    allAcceptedRequests.forEach((req: any) => {
      const chatId = req.id;
      const chatRef = doc(firestore, "networkChats", chatId);

      const unsub = onSnapshot(
        chatRef,
        (snap: any) => {
          if (!snap.exists()) return;
          const data = snap.data();

          const lastMessageBy = data.lastMessageBy;
          const lastMessageAt = data.lastMessageAt?.seconds || 0;

          if (lastMessageBy === user.uid) return;

          const now = Math.floor(Date.now() / 1000);
          if (lastMessageAt && now - lastMessageAt > 300) return;

          const key = `msg_${chatId}_${lastMessageAt}`;
          if (notifiedMessages.current.has(key)) return;
          notifiedMessages.current.add(key);

          if (pathname.includes(`/network/chat/${chatId}`)) return;
          if (pathname.includes('/network/messages')) return;

          const otherName = req.hirerId === user.uid ? req.professionalName : req.hirerName;

          toast({
            title: `💬 ${otherName || "Message"} ne message bheja`,
            description: data.lastMessage?.slice(0, 80) || "Naya message",
            duration: 5000,
          });
        },
        (err: any) => {
          console.error("[NOTIFICATIONS] Chat listen error:", err);
        }
      );

      unsubscribes.push(unsub);
    });

    return () => {
      unsubscribes.forEach(u => u());
    };
  }, [firestore, user, allAcceptedRequests, toast, pathname]);

  // Set first load off after 3 sec
  useEffect(() => {
    const timer = setTimeout(() => {
      isFirstLoad.current = false;
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  return null;
}