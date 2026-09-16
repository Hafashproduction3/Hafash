"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useUser, useFirestore, useDoc } from "@/firebase";
import {
  doc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  setDoc,
  serverTimestamp,
  limit,
} from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Star,
  Loader2,
  CheckCircle2,
  Sparkles,
  Clock,
  Heart,
  Camera,
  MessageSquare,
  User as UserIcon,
  Info,
  Send,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const CATEGORIES = [
  {
    id: "punctuality",
    label: "Punctuality",
    description: "Was he/she on time?",
    icon: <Clock className="w-5 h-5" />,
  },
  {
    id: "behavior",
    label: "Behavior",
    description: "Was he/she professional & polite?",
    icon: <Heart className="w-5 h-5" />,
  },
  {
    id: "workQuality",
    label: "Work Quality",
    description: "Did the work meet expectations?",
    icon: <Camera className="w-5 h-5" />,
  },
  {
    id: "communication",
    label: "Communication",
    description: "Was communication clear & timely?",
    icon: <MessageSquare className="w-5 h-5" />,
  },
];

type RatingValues = {
  punctuality: number;
  behavior: number;
  workQuality: number;
  communication: number;
};

export default function ReviewPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const requestId = Array.isArray(params?.requestId)
    ? params.requestId[0]
    : params?.requestId;

  const [ratings, setRatings] = useState<RatingValues>({
    punctuality: 0,
    behavior: 0,
    workQuality: 0,
    communication: 0,
  });
  const [hoverRatings, setHoverRatings] = useState<RatingValues>({
    punctuality: 0,
    behavior: 0,
    workQuality: 0,
    communication: 0,
  });
  const [text, setText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);

  const requestRef = useMemo(() => {
    if (!firestore || !requestId) return null;
    return doc(firestore, "networkRequests", requestId);
  }, [firestore, requestId]);

  const { data: request, loading: requestLoading } = useDoc(requestRef);

  const isHirer = useMemo(() => {
    if (!request || !user) return false;
    return request.hirerId === user.uid;
  }, [request, user]);

  const otherUserId = useMemo(() => {
    if (!request || !user) return null;
    return isHirer ? request.professionalId : request.hirerId;
  }, [request, user, isHirer]);

  const otherUserName = useMemo(() => {
    if (!request) return "Hafash User";
    return isHirer ? request.professionalName : request.hirerName;
  }, [request, isHirer]);

  useEffect(() => {
    async function checkExistingReview() {
      if (!firestore || !requestId || !user) return;
      try {
        const q = query(
          collection(firestore, "networkReviews"),
          where("requestId", "==", requestId),
          where("reviewerId", "==", user.uid),
          limit(1)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          setAlreadyReviewed(true);
        }
      } catch (e) {
        // Silent
      }
    }
    checkExistingReview();
  }, [firestore, requestId, user]);

  const averageRating = useMemo(() => {
    const values = Object.values(ratings).filter((r) => r > 0);
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }, [ratings]);

  const allRated = useMemo(() => {
    return Object.values(ratings).every((r) => r > 0);
  }, [ratings]);

  const handleSubmit = useCallback(async () => {
    if (!firestore || !user || !request || !requestId || isSubmitting) return;

    if (!allRated) {
      toast({
        variant: "destructive",
        title: "All ratings required",
        description: "Please rate all 4 categories.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Add review document
      await addDoc(collection(firestore, "networkReviews"), {
        requestId,
        reviewerId: user.uid,
        reviewerName: isHirer ? request.hirerName : request.professionalName,
        revieweeId: otherUserId,
        revieweeName: otherUserName,
        role: isHirer ? "hirer" : "professional",
        ratings: {
          punctuality: ratings.punctuality,
          behavior: ratings.behavior,
          workQuality: ratings.workQuality,
          communication: ratings.communication,
        },
        overallRating: Number(averageRating.toFixed(2)),
        text: text.trim(),
        createdAt: serverTimestamp(),
        isRevealed: false,
      });

      // 2. Mark review status on request
      await updateDoc(doc(firestore, "networkRequests", requestId), {
        [isHirer ? "hirerReviewed" : "professionalReviewed"]: true,
        updatedAt: serverTimestamp(),
      });

      // 3. Update reviewee's aggregate rating on their network profile
      await updateAggregateRating(firestore, otherUserId!);

      toast({
        title: "Review Submitted",
        description: "Thank you for your feedback!",
      });

      router.push(isHirer ? "/network/requests" : "/network/incoming");
    } catch (err: any) {
      console.error("[REVIEW] Error:", err);
      toast({
        variant: "destructive",
        title: "Submission Failed",
        description: err.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [
    firestore,
    user,
    request,
    requestId,
    isSubmitting,
    allRated,
    ratings,
    averageRating,
    text,
    isHirer,
    otherUserId,
    otherUserName,
    toast,
    router,
  ]);

  if (requestLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !request || request.status !== "completed") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md rounded-[2rem]">
          <CardContent className="p-10 text-center space-y-4">
            <Info className="w-12 h-12 text-muted-foreground/40 mx-auto" />
            <div>
              <h2 className="font-headline font-bold text-xl">Review not available</h2>
              <p className="text-sm text-muted-foreground mt-2">
                Reviews can only be submitted after both parties mark the event as complete.
              </p>
            </div>
            <Button variant="outline" className="rounded-xl" onClick={() => router.back()}>
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (alreadyReviewed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md rounded-[2rem]">
          <CardContent className="p-10 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-green-500/10 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7 text-green-500" />
            </div>
            <div>
              <h2 className="font-headline font-bold text-xl">Already Reviewed</h2>
              <p className="text-sm text-muted-foreground mt-2">
                You have already submitted a review for this event.
              </p>
            </div>
            <Button variant="outline" className="rounded-xl" onClick={() => router.back()}>
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6 lg:p-12 animate-in fade-in duration-500">
      <div className="max-w-2xl mx-auto space-y-6">

        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="rounded-full" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 mb-2">
              <Star className="w-3 h-3 text-primary" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                Leave Review
              </span>
            </div>
            <h1 className="text-3xl lg:text-4xl font-headline font-bold tracking-tight">
              How was your experience?
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Your honest feedback helps build trust in the Hafash community.
            </p>
          </div>
        </div>

        <Card className="rounded-2xl border-border/40 bg-gradient-to-br from-primary/5 to-background">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <UserIcon className="w-6 h-6 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                Reviewing
              </p>
              <p className="font-headline font-bold text-lg truncate">{otherUserName}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {request.eventType} • {isHirer ? "Professional" : "Hirer"}
              </p>
            </div>
          </CardContent>
        </Card>

        {averageRating > 0 && (
          <Card className="rounded-2xl border-primary/20 bg-primary/5">
            <CardContent className="p-6 text-center">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-2">
                Overall Rating
              </p>
              <p className="text-5xl font-headline font-bold text-primary">
                {averageRating.toFixed(1)}
              </p>
              <div className="flex items-center justify-center gap-1 mt-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={cn(
                      "w-5 h-5",
                      star <= Math.round(averageRating)
                        ? "fill-primary text-primary"
                        : "text-muted-foreground/30"
                    )}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="rounded-2xl border-border/40 bg-card/60">
          <CardContent className="p-6 space-y-6">
            {CATEGORIES.map((cat) => {
              const currentRating = ratings[cat.id as keyof RatingValues];
              const hoverRating = hoverRatings[cat.id as keyof RatingValues];
              const displayRating = hoverRating || currentRating;

              return (
                <div key={cat.id} className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 text-primary">
                      {cat.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm">{cat.label}</p>
                      <p className="text-xs text-muted-foreground">{cat.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-13">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onMouseEnter={() =>
                          setHoverRatings({ ...hoverRatings, [cat.id]: star })
                        }
                        onMouseLeave={() =>
                          setHoverRatings({ ...hoverRatings, [cat.id]: 0 })
                        }
                        onClick={() =>
                          setRatings({ ...ratings, [cat.id]: star })
                        }
                        className="transition-transform hover:scale-110 active:scale-95"
                      >
                        <Star
                          className={cn(
                            "w-9 h-9 transition-colors",
                            star <= displayRating
                              ? "fill-primary text-primary"
                              : "text-muted-foreground/20"
                          )}
                        />
                      </button>
                    ))}
                    {currentRating > 0 && (
                      <span className="ml-2 text-sm font-bold text-primary">
                        {currentRating}.0
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/40 bg-card/60">
          <CardContent className="p-6 space-y-3">
            <div>
              <p className="font-bold text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Written Review
                <span className="text-[10px] font-medium text-muted-foreground normal-case">
                  (optional)
                </span>
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Share your experience to help others make better decisions.
              </p>
            </div>
            <Textarea
              placeholder="Tell others about your experience — what went well, what could improve..."
              className="min-h-[120px] rounded-xl resize-none"
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={500}
            />
            <p className="text-[10px] text-muted-foreground text-right">
              {text.length} / 500
            </p>
          </CardContent>
        </Card>

        <div className="flex items-start gap-2 p-4 rounded-xl bg-primary/5 border border-primary/20">
          <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            Reviews are revealed after both parties submit, or 7 days after the event — whichever comes first.
          </p>
        </div>

        <Button
          className="w-full h-14 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-base shadow-2xl shadow-primary/20 gap-2"
          onClick={handleSubmit}
          disabled={!allRated || isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              Submit Review
            </>
          )}
        </Button>

      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Aggregate rating updater
// Fetches all reviews for a user and recalculates their average
// ─────────────────────────────────────────────────────────────
async function updateAggregateRating(firestore: any, revieweeId: string) {
  if (!firestore || !revieweeId) return;

  try {
    // Fetch all reviews for this user
    const q = query(
      collection(firestore, "networkReviews"),
      where("revieweeId", "==", revieweeId)
    );
    const snap = await getDocs(q);

    if (snap.empty) {
      // No reviews — reset aggregate
      await setDoc(
        doc(firestore, "networkProfiles", revieweeId),
        {
          rating: {
            average: 0,
            count: 0,
            punctuality: 0,
            behavior: 0,
            workQuality: 0,
            communication: 0,
          },
        },
        { merge: true }
      );
      return;
    }

    let totalOverall = 0;
    let totalPunctuality = 0;
    let totalBehavior = 0;
    let totalWorkQuality = 0;
    let totalCommunication = 0;
    let count = 0;

    snap.forEach((d: any) => {
      const data = d.data();
      const r = data.ratings || {};
      totalOverall += Number(data.overallRating || 0);
      totalPunctuality += Number(r.punctuality || 0);
      totalBehavior += Number(r.behavior || 0);
      totalWorkQuality += Number(r.workQuality || 0);
      totalCommunication += Number(r.communication || 0);
      count++;
    });

    if (count === 0) return;

    await setDoc(
      doc(firestore, "networkProfiles", revieweeId),
      {
        rating: {
          average: Number((totalOverall / count).toFixed(2)),
          count,
          punctuality: Number((totalPunctuality / count).toFixed(2)),
          behavior: Number((totalBehavior / count).toFixed(2)),
          workQuality: Number((totalWorkQuality / count).toFixed(2)),
          communication: Number((totalCommunication / count).toFixed(2)),
        },
        completedJobs: count,
      },
      { merge: true }
    );
  } catch (err) {
    console.error("[AGGREGATE] Error:", err);
  }
}