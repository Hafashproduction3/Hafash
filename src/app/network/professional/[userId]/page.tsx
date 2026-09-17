"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useUser, useFirestore, useDoc, useCollection } from "@/firebase";
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  query,
  where,
  getDocs,
  serverTimestamp,
  updateDoc,
  limit,
} from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Camera,
  Video,
  Plane,
  Image as ImageIcon,
  Film,
  Wand2,
  Aperture,
  UserCog,
  Brush,
  MapPin,
  Heart,
  Instagram,
  Facebook,
  Youtube,
  CalendarDays,
  Star,
  ShieldCheck,
  Briefcase,
  Sparkles,
  Share2,
  Send,
  X,
  Compass,
  Award,
  Zap,
  Building2,
  ChevronRight,
  Loader2,
  Info,
  TrendingUp,
  Clock,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  RATE_UNIT_LABELS,
  TRAVEL_RANGE_LABELS,
  ROLE_DEFINITIONS,
  TURNAROUND_OPTIONS,
} from "@/lib/equipment";
import { EventTypePicker } from "@/components/event-type-picker";
import {
  calculateTrustScore,
  getAchievements,
  isVerifiedPro,
  getMemberDuration,
} from "@/lib/trust-score";
import { calculateResponseTime, formatResponseTime } from "@/lib/response-time";
import { calculateProfileCompletion, getCompletionColor, getCompletionBg, getCompletionLabel } from "@/lib/profile-completion";
const ROLE_ICONS: Record<string, React.ReactNode> = {
  photographer: <Camera className="w-4 h-4" />,
  videographer: <Video className="w-4 h-4" />,
  drone_operator: <Plane className="w-4 h-4" />,
  album_designer: <ImageIcon className="w-4 h-4" />,
  video_editor: <Film className="w-4 h-4" />,
  photo_editor: <Wand2 className="w-4 h-4" />,
  camera_operator: <Aperture className="w-4 h-4" />,
  helper: <UserCog className="w-4 h-4" />,
  makeup_artist: <Brush className="w-4 h-4" />,
};

const ROLE_LABELS: Record<string, string> = {
  photographer: "Photographer",
  videographer: "Videographer",
  drone_operator: "Drone Operator",
  album_designer: "Album Designer",
  video_editor: "Video Editor",
  photo_editor: "Photo Editor",
  camera_operator: "Camera Operator",
  helper: "Helper / Assistant",
  makeup_artist: "Makeup Artist",
};

const REMOTE_ROLES = ['video_editor', 'photo_editor', 'album_designer'];

interface ReviewData {
  id: string;
  reviewerId: string;
  reviewerName: string;
  ratings: {
    punctuality: number;
    behavior: number;
    workQuality: number;
    communication: number;
  };
  overallRating: number;
  text?: string;
  createdAt: any;
  role: string;
}

export default function ProfessionalProfilePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const userId = Array.isArray(params?.userId)
    ? params.userId[0]
    : params?.userId;

  const profileRef = useMemo(() => {
    if (!firestore || !userId) return null;
    return doc(firestore, "networkProfiles", userId);
  }, [firestore, userId]);

  const { data: profile, loading } = useDoc(profileRef);

  const currentUserRef = useMemo(() => {
    if (!firestore || !user) return null;
    return doc(firestore, "users", user.uid);
  }, [firestore, user]);

  const { data: currentUserProfile } = useDoc(currentUserRef);

  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [requestOpen, setRequestOpen] = useState(searchParams.get('request') === '1');
  const [eventDate, setEventDate] = useState("");
  const [eventType, setEventType] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [budget, setBudget] = useState("");
  const [requestMessage, setRequestMessage] = useState("");
  const [isSendingRequest, setIsSendingRequest] = useState(false);

  const [reviews, setReviews] = useState<ReviewData[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);

  const savedProfiles = currentUserProfile?.savedNetworkProfiles || [];
  const isSaved = !!userId && savedProfiles.includes(userId);
  const isOwnProfile = !!user && user.uid === userId;
  // Profile completion (only for own profile)
  const completion = useMemo(() => {
    if (!profile) return null;
    return calculateProfileCompletion({
      gender: profile.gender,
      roles: profile.roles,
      bio: profile.bio,
      baseCity: profile.baseCity || profile.baseLocation,
      serviceAreas: profile.serviceAreas,
      equipment: profile.equipment,
      rates: profile.rates,
      rates_legacy: profile.rate,
      portfolioType: profile.portfolioType,
      portfolioGalleryIds: profile.portfolioGalleryIds,
      instagramLink: profile.instagramLink,
      facebookLink: profile.facebookLink,
      youtubeLink: profile.youtubeLink,
      turnarounds: profile.turnarounds,
      availability: profile.availability,
    });
  }, [profile]);
  useEffect(() => {
    async function fetchReviews() {
      if (!firestore || !userId) return;
      setReviewsLoading(true);
      try {
        const q = query(
          collection(firestore, "networkReviews"),
          where("revieweeId", "==", userId),
          limit(20)
        );
        const snap = await getDocs(q);
        const revs: ReviewData[] = [];
        snap.forEach((d) => {
          revs.push({ id: d.id, ...d.data() } as ReviewData);
        });
        revs.sort((a, b) => {
          const aT = a.createdAt?.seconds || 0;
          const bT = b.createdAt?.seconds || 0;
          return bT - aT;
        });
        setReviews(revs);
      } catch (e) {
        console.error("[REVIEWS] Fetch error:", e);
      } finally {
        setReviewsLoading(false);
      }
    }
    fetchReviews();
  }, [firestore, userId]);

  // Fetch requests where this user is the professional, to calculate response time
  const allRequestsQuery = useMemo(() => {
    if (!firestore || !userId) return null;
    return query(
      collection(firestore, "networkRequests"),
      where("professionalId", "==", userId),
      limit(50)
    );
  }, [firestore, userId]);

  const { data: allRequests } = useCollection(allRequestsQuery);

  const responseTime = useMemo(() => {
    const result = calculateResponseTime(allRequests || []);
    return {
      text: formatResponseTime(result.avgMinutes, result.count),
      count: result.count,
    };
  }, [allRequests]);

  const toggleSaveProfile = useCallback(async () => {
    if (!user || !firestore || !userId || isSavingProfile) return;
    setIsSavingProfile(true);
    try {
      await updateDoc(doc(firestore, "users", user.uid), {
        savedNetworkProfiles: isSaved ? arrayRemove(userId) : arrayUnion(userId),
      });
      toast({ title: isSaved ? "Removed from saved" : "Saved to your list" });
    } catch (error) {
      console.error("[NETWORK_PROFILE] Save error:", error);
    } finally {
      setIsSavingProfile(false);
    }
  }, [user, firestore, userId, isSavingProfile, isSaved, toast]);

  const sendWorkRequest = useCallback(async () => {
    if (!user || !firestore || !userId || !eventDate || !eventType || isSendingRequest) return;
    setIsSendingRequest(true);
    try {
      await addDoc(collection(firestore, "networkRequests"), {
        hirerId: user.uid,
        hirerName: currentUserProfile?.studioName || currentUserProfile?.photographerName || "Hafash User",
        professionalId: userId,
        professionalName: profile?.studioName || profile?.photographerName || "",
        status: "pending",
        eventDate,
        eventType,
        eventLocation: eventLocation.trim(),
        budget: budget.trim() ? Number(budget) : null,
        message: requestMessage.trim(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      toast({ title: "Request Sent", description: "You'll be notified when they respond." });
      setRequestOpen(false);
      setEventDate("");
      setEventType("");
      setEventLocation("");
      setBudget("");
      setRequestMessage("");
    } catch (error: any) {
      console.error("[NETWORK_REQUEST] Send error:", error);
      toast({ variant: "destructive", title: "Failed to send request" });
    } finally {
      setIsSendingRequest(false);
    }
  }, [user, firestore, userId, eventDate, eventType, eventLocation, budget, requestMessage, isSendingRequest, profile, currentUserProfile, toast]);

  const handleShare = useCallback(() => {
    navigator.clipboard.writeText(window.location.href);
    toast({ title: "Link copied!" });
  }, [toast]);

  const calculatedRating = useMemo(() => {
    if (!reviews || reviews.length === 0) {
      return {
        average: profile?.rating?.average || 0,
        count: profile?.rating?.count || 0,
        punctuality: profile?.rating?.punctuality || 0,
        behavior: profile?.rating?.behavior || 0,
        workQuality: profile?.rating?.workQuality || 0,
        communication: profile?.rating?.communication || 0,
      };
    }
    let totalOverall = 0, totalPunc = 0, totalBeh = 0, totalWork = 0, totalComm = 0;
    reviews.forEach((r) => {
      totalOverall += Number(r.overallRating || 0);
      totalPunc += Number(r.ratings?.punctuality || 0);
      totalBeh += Number(r.ratings?.behavior || 0);
      totalWork += Number(r.ratings?.workQuality || 0);
      totalComm += Number(r.ratings?.communication || 0);
    });
    const c = reviews.length;
    return {
      average: Number((totalOverall / c).toFixed(2)),
      count: c,
      punctuality: Number((totalPunc / c).toFixed(2)),
      behavior: Number((totalBeh / c).toFixed(2)),
      workQuality: Number((totalWork / c).toFixed(2)),
      communication: Number((totalComm / c).toFixed(2)),
    };
  }, [reviews, profile?.rating]);

  const ratingAvg = calculatedRating.average;
  const ratingCount = calculatedRating.count;
  const completedJobs = reviews.length || profile?.completedJobs || 0;

  const trustScore = useMemo(() => {
    return calculateTrustScore({
      ratingAverage: ratingAvg,
      ratingCount,
      completedJobs,
      isVerified: !!profile?.isVerified,
    });
  }, [ratingAvg, ratingCount, completedJobs, profile?.isVerified]);

  const isVerified = isVerifiedPro(ratingAvg, ratingCount, trustScore.score);

  const achievements = useMemo(() => {
    return getAchievements({
      ratingAverage: ratingAvg,
      ratingCount,
      completedJobs,
      isVerified,
      trustScore: trustScore.score,
    });
  }, [ratingAvg, ratingCount, completedJobs, isVerified, trustScore.score]);

  const memberDuration = useMemo(() => {
    return getMemberDuration(profile?.createdAt);
  }, [profile?.createdAt]);

  const remoteRoles = useMemo(() => {
    const roles = profile?.roles || [];
    return roles.filter((r: string) => REMOTE_ROLES.includes(r));
  }, [profile?.roles]);

  const onSiteRoles = useMemo(() => {
    const roles = profile?.roles || [];
    return roles.filter((r: string) => !REMOTE_ROLES.includes(r));
  }, [profile?.roles]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6 lg:p-12">
        <div className="max-w-5xl mx-auto space-y-6 animate-pulse">
          <div className="h-8 w-32 rounded-xl bg-muted/30" />
          <div className="h-72 rounded-[2rem] bg-muted/20" />
        </div>
      </div>
    );
  }

  if (!profile || profile.isActive === false) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full rounded-[2rem] border-border/40 bg-card/80">
          <CardContent className="p-10 text-center space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <Camera className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-headline font-bold">Professional not available</h1>
              <p className="text-sm text-muted-foreground mt-2">
                This Network profile is no longer available.
              </p>
            </div>
            <Button variant="outline" className="rounded-xl" onClick={() => router.push("/network")}>
              Back to Network
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const displayName = profile?.studioName || profile?.photographerName || "Hafash Professional";
  const photographerName = profile?.photographerName && profile?.photographerName !== displayName ? profile.photographerName : "";
  const city = profile?.baseCity || profile?.baseLocation || "";
  const areas = profile?.serviceAreas || [];
  const travelRange = profile?.travelRange || "anywhere_in_city";
  const rates = profile?.rates || (profile?.rate ? [{ eventType: "Standard", amount: profile.rate.amount, unit: profile.rate.unit }] : []);
  const turnarounds = profile?.turnarounds || {};
  const services = profile?.services || {};

  const next7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const key = d.toISOString().split("T")[0];
    const status = profile?.availability?.[key] || "available";
    return { date: d, status, key };
  });

  const hasOnSite = onSiteRoles.length > 0;
  const hasRemote = remoteRoles.length > 0;

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-5xl mx-auto p-5 lg:p-10 space-y-6">

        <Button
          variant="ghost"
          className="rounded-xl gap-2 text-muted-foreground hover:text-foreground"
          onClick={() => router.back()}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Network
        </Button>

        {/* HERO */}
        <Card className="relative overflow-hidden rounded-[2.5rem] border-border/40 bg-card/60 shadow-xl">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-background to-background" />
          <div className="absolute -top-32 -right-32 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />

          <div className="relative p-7 lg:p-10">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-7">
              <div className="flex flex-col sm:flex-row items-start gap-6 flex-1">
                <div className="relative shrink-0">
                  <div className="w-24 h-24 lg:w-28 lg:h-28 rounded-[2rem] bg-gradient-to-br from-primary/30 to-primary/10 border-2 border-primary/30 flex items-center justify-center shadow-2xl">
                    <Camera className="w-12 h-12 lg:w-14 lg:h-14 text-primary" />
                  </div>
                  {isVerified && (
                    <div className="absolute -bottom-2 -right-2 w-9 h-9 rounded-xl bg-primary border-4 border-background flex items-center justify-center shadow-lg">
                      <ShieldCheck className="w-4 h-4 text-primary-foreground" />
                    </div>
                  )}
                </div>

                <div className="space-y-4 flex-1 min-w-0">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 mb-3">
                      <Sparkles className="w-3 h-3 text-primary" />
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                        Hafash Network
                      </span>
                    </div>

                    <h1 className="text-3xl lg:text-4xl font-headline font-bold tracking-tight">
                      {displayName}
                    </h1>

                    {photographerName && (
                      <p className="text-sm text-muted-foreground mt-1">{photographerName}</p>
                    )}
                  </div>

                  {ratingCount > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={cn(
                              "w-4 h-4",
                              s <= Math.round(ratingAvg)
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-muted-foreground/30"
                            )}
                          />
                        ))}
                      </div>
                      <span className="text-sm font-bold">{ratingAvg.toFixed(1)}</span>
                      <span className="text-xs text-muted-foreground">
                        ({ratingCount} {ratingCount === 1 ? "review" : "reviews"})
                      </span>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {(profile.roles || []).map((role: string) => (
                      <Badge
                        key={role}
                        variant="outline"
                        className="rounded-xl border-primary/30 bg-primary/10 text-primary px-3 py-1.5 text-xs font-bold gap-1.5"
                      >
                        {ROLE_ICONS[role]}
                        {ROLE_LABELS[role] || role}
                      </Badge>
                    ))}
                  </div>

                  {city && (
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-background/50 border border-border/30">
                        <MapPin className="w-4 h-4 text-primary" />
                        <span className="font-medium">{city}</span>
                      </div>
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-background/50 border border-border/30">
                        <Compass className="w-4 h-4 text-primary" />
                        <span className="font-medium text-xs">
                          {TRAVEL_RANGE_LABELS[travelRange as keyof typeof TRAVEL_RANGE_LABELS] || travelRange}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0 lg:w-44">
                {!isOwnProfile && user && (
                  <Button
                    className="rounded-2xl h-12 font-bold gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
                    onClick={() => setRequestOpen(true)}
                  >
                    <Send className="w-4 h-4" />
                    Send Request
                  </Button>
                )}

                {!isOwnProfile && user && (
                  <Button
                    variant="outline"
                    className={cn(
                      "rounded-2xl h-12 font-bold gap-2 border-border/40 hover:bg-primary/5",
                      isSaved && "border-red-400/30 bg-red-400/5"
                    )}
                    onClick={toggleSaveProfile}
                    disabled={isSavingProfile}
                  >
                    <Heart className={cn("w-4 h-4", isSaved && "fill-red-400 text-red-400")} />
                    {isSaved ? "Saved" : "Save"}
                  </Button>
                )}

                {isOwnProfile && (
                  <Button
                    variant="outline"
                    className="rounded-2xl h-12 font-bold gap-2 border-border/40 hover:bg-primary/5"
                    onClick={() => router.push("/network/join")}
                  >
                    <Sparkles className="w-4 h-4" />
                    Edit Profile
                  </Button>
                )}

                <Button
                  variant="outline"
                  className="rounded-2xl h-12 font-bold gap-2 border-border/40 hover:bg-primary/5"
                  onClick={handleShare}
                >
                  <Share2 className="w-4 h-4" />
                  Share
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* TRUST SCORE */}
        {ratingCount > 0 && (
          <Card className="relative overflow-hidden rounded-[2rem] border-border/40 bg-gradient-to-br from-card/80 to-background shadow-xl">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/60 via-primary/20 to-transparent" />
            <CardContent className="p-6 lg:p-8">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="relative shrink-0">
                  <svg className="w-32 h-32 -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="6" className="text-muted-foreground/10" />
                    <circle cx="50" cy="50" r="42" fill="none" stroke="url(#trustGradient)" strokeWidth="6" strokeLinecap="round" strokeDasharray={`${(trustScore.score / 100) * 264} 264`} className="transition-all duration-1000" />
                    <defs>
                      <linearGradient id="trustGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#d4af37" />
                        <stop offset="100%" stopColor="#f4d97a" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-3xl font-headline font-bold text-primary">{trustScore.score}</p>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">/ 100</p>
                  </div>
                </div>

                <div className="flex-1 text-center md:text-left space-y-3">
                  <div className="flex items-center justify-center md:justify-start gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    <h3 className="font-headline font-bold text-lg">Trust Score</h3>
                    <Badge className={cn(
                      "rounded-lg border",
                      trustScore.level === 'elite' && "bg-purple-500/15 text-purple-400 border-purple-500/30",
                      trustScore.level === 'excellent' && "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
                      trustScore.level === 'trusted' && "bg-blue-500/15 text-blue-400 border-blue-500/30",
                      trustScore.level === 'rising' && "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
                      trustScore.level === 'new' && "bg-muted text-muted-foreground border-border/40"
                    )}>
                      {trustScore.label}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground max-w-md">
                    Calculated from ratings, reviews, completed events, and verification. Higher scores rank better in search results.
                  </p>
                  <div className="flex flex-wrap gap-4 text-xs">
                    <div className="flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                      <span className="font-bold">{ratingAvg.toFixed(1)}</span>
                      <span className="text-muted-foreground">rating</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-primary" />
                      <span className="font-bold">{completedJobs}</span>
                      <span className="text-muted-foreground">events</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className={cn("w-3.5 h-3.5", isVerified ? "text-primary" : "text-muted-foreground")} />
                      <span className={cn("font-bold", isVerified ? "text-primary" : "text-muted-foreground")}>
                        {isVerified ? "Verified" : "Not Verified"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        {/* PROFILE COMPLETION (only for own profile) */}
        {isOwnProfile && completion && completion.percent < 100 && (
          <Card className="relative overflow-hidden rounded-[2rem] border-border/40 bg-gradient-to-br from-card/80 to-background shadow-xl">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/60 via-primary/20 to-transparent" />
            <CardContent className="p-6 lg:p-8 space-y-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-headline font-bold text-base text-white flex items-center gap-2">
                      Profile Completion
                      <span className={cn(
                        "text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md border",
                        "bg-primary/10 text-primary border-primary/30"
                      )}>
                        {getCompletionLabel(completion.percent)}
                      </span>
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {completion.missingHigh.length > 0
                        ? `${completion.missingHigh.length} important cheezein baaki hain`
                        : 'Profile almost complete hai'}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className={cn(
                    "text-3xl font-headline font-bold tracking-tight",
                    getCompletionColor(completion.percent)
                  )}>
                    {completion.percent}%
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="relative w-full h-2.5 bg-background/60 rounded-full overflow-hidden border border-white/5">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-1000 ease-out bg-gradient-to-r",
                    getCompletionBg(completion.percent)
                  )}
                  style={{ width: `${completion.percent}%` }}
                />
              </div>

              {/* Missing items */}
              {completion.missingHigh.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Complete these to boost your profile:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {completion.missingHigh.slice(0, 4).map((item) => (
                      <Badge
                        key={item.id}
                        className="rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30 gap-1.5 px-2.5 py-1.5 text-[11px] font-medium"
                      >
                        {item.label}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <Link href="/network/join">
                <Button className="w-full rounded-xl h-11 font-bold gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
                  Complete Profile
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
        {/* STATS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatBox icon={<Star className="w-4 h-4" />} label="Rating" value={ratingCount > 0 ? ratingAvg.toFixed(1) : "New"} sub={ratingCount > 0 ? `${ratingCount} reviews` : "No reviews yet"} color="yellow" />
          <StatBox icon={<Briefcase className="w-4 h-4" />} label="Events" value={String(completedJobs)} sub="completed" color="primary" />
          <StatBox icon={<Zap className="w-4 h-4" />} label="Response" value={responseTime.text} sub={responseTime.count > 0 ? `${responseTime.count} responses` : "New"} color="green" />
          <StatBox icon={<Award className="w-4 h-4" />} label="Member" value={memberDuration} sub="on Hafash" color="blue" />
        </div>

        {/* ACHIEVEMENTS */}
        {achievements.length > 0 && (
          <Card className="rounded-[2rem] border-border/40 bg-card/70 overflow-hidden">
            <div className="px-6 pt-5 pb-3 flex items-center gap-2 border-b border-border/20">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <Award className="w-4 h-4" />
              </div>
              <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground">
                Achievements ({achievements.length})
              </h3>
            </div>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {achievements.map((ach) => (
                  <div key={ach.id} className={cn("p-4 rounded-2xl border bg-gradient-to-br transition-all hover:scale-[1.02]", ach.color)}>
                    <div className="text-3xl mb-2">{ach.icon}</div>
                    <p className="font-headline font-bold text-sm">{ach.label}</p>
                    <p className="text-[10px] text-muted-foreground mt-1 leading-tight">{ach.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* DELIVERY TIME */}
        {hasRemote && (
          <Card className="rounded-[2rem] border-border/40 bg-gradient-to-br from-purple-500/5 via-card/60 to-background overflow-hidden">
            <div className="px-6 pt-5 pb-3 flex items-center gap-2 border-b border-border/20">
              <div className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
                <Clock className="w-4 h-4" />
              </div>
              <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground">
                Delivery Time
              </h3>
            </div>
            <CardContent className="p-6 space-y-4">
              {remoteRoles.map((roleId: string) => {
                const role = ROLE_DEFINITIONS[roleId as keyof typeof ROLE_DEFINITIONS];
                const turnId = turnarounds[roleId];
                const turnOpt = TURNAROUND_OPTIONS.find(t => t.id === turnId);
                const roleServices = services[roleId] || [];

                if (!turnOpt) return null;

                return (
                  <div key={roleId} className="p-5 rounded-2xl bg-background/40 border border-purple-500/20 space-y-3">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                          {ROLE_ICONS[roleId]}
                        </div>
                        <div>
                          <p className="font-bold text-sm">{role?.label}</p>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Remote Service</p>
                        </div>
                      </div>

                      <Badge className="rounded-xl bg-purple-500/15 text-purple-400 border-purple-500/30 px-3 py-1.5 font-bold gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {turnOpt.short}
                      </Badge>
                    </div>

                    {roleServices.length > 0 && (
                      <div className="pt-3 border-t border-border/20">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Services Offered</p>
                        <div className="flex flex-wrap gap-1.5">
                          {roleServices.map((s: string) => (
                            <Badge key={s} variant="outline" className="rounded-lg bg-purple-500/5 border-purple-500/20 text-purple-400 text-[11px] font-medium">
                              {s}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* MAIN GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
          <div className="space-y-6">

            {profile.bio && (
              <SectionCard title="About" icon={<Info className="w-4 h-4" />}>
                <p className="text-sm leading-7 text-muted-foreground whitespace-pre-wrap">{profile.bio}</p>
              </SectionCard>
            )}

            {rates.length > 0 && (
              <SectionCard title="Rate Card" icon={<Briefcase className="w-4 h-4" />}>
                <div className="space-y-2">
                  {rates.map((rate: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-background/40 border border-border/30 hover:border-primary/30 transition-all">
                      <div>
                        <p className="font-bold text-sm">{rate.eventType || "Standard"}</p>
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">
                          {RATE_UNIT_LABELS[rate.unit as keyof typeof RATE_UNIT_LABELS] || rate.unit}
                        </p>
                      </div>
                      <p className="font-headline font-bold text-primary text-lg">
                        Rs. {rate.amount?.toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            {(profile.equipment || []).length > 0 && (
              <SectionCard title="Equipment" icon={<Camera className="w-4 h-4" />}>
                <div className="flex flex-wrap gap-2">
                  {profile.equipment.map((eq: any) => (
                    <Badge key={eq.id} variant="outline" className="rounded-xl bg-background/40 border-border/40 px-3 py-2 text-xs font-medium">
                      {eq.name}
                    </Badge>
                  ))}
                </div>
              </SectionCard>
            )}

            {city && (
              <SectionCard title="Service Areas" icon={<MapPin className="w-4 h-4" />}>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Building2 className="w-4 h-4 text-primary" />
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Base City</p>
                      <p className="font-bold text-sm">{city}</p>
                    </div>
                  </div>

                  {areas.length > 0 && (
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-2">Works in</p>
                      <div className="flex flex-wrap gap-1.5">
                        {areas.map((area: string) => (
                          <Badge key={area} variant="outline" className="rounded-lg bg-primary/5 border-primary/20 text-primary text-[11px] font-medium">
                            {area}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-2 border-t border-border/20">
                    <Compass className="w-4 h-4 text-primary" />
                    <p className="text-sm">
                      <span className="text-muted-foreground">Travel: </span>
                      <span className="font-bold">
                        {TRAVEL_RANGE_LABELS[travelRange as keyof typeof TRAVEL_RANGE_LABELS] || travelRange}
                      </span>
                    </p>
                  </div>
                </div>
              </SectionCard>
            )}

            <SectionCard title="Portfolio" icon={<ImageIcon className="w-4 h-4" />}>
              {profile.portfolioType === "hafash_gallery" ? (
                <div className="space-y-4">
                  {profile.portfolioGalleryIds && profile.portfolioGalleryIds.length > 0 ? (
                    <>
                      <div className="flex items-center gap-2 pb-2">
                        <Badge className="rounded-lg bg-primary/15 text-primary border border-primary/30 gap-1.5 text-[10px] font-bold uppercase tracking-widest">
                          <Sparkles className="w-3 h-3" />
                          Hafash Gallery
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {profile.portfolioGalleryIds.length} {profile.portfolioGalleryIds.length === 1 ? "gallery" : "galleries"}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {profile.portfolioGalleryIds.map((gId: string) => (
                          <a
                            key={gId}
                            href={`/gallery/${gId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="aspect-[4/3] rounded-2xl overflow-hidden border border-border/40 bg-gradient-to-br from-primary/10 to-background hover:border-primary/50 transition-all group relative cursor-pointer"
                          >
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                              <ImageIcon className="w-8 h-8 text-primary/50 group-hover:text-primary transition-colors" />
                              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground group-hover:text-primary transition-colors">
                                View Gallery
                              </span>
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />
                          </a>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8 rounded-2xl bg-background/30 border border-dashed border-border/40">
                      <ImageIcon className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground font-medium">No galleries selected</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {profile.instagramLink && (
                      <SocialCard icon={<Instagram className="w-5 h-5" />} label="Instagram" url={profile.instagramLink} gradient="from-pink-500/20 to-purple-500/20" textColor="text-pink-400" />
                    )}
                    {profile.facebookLink && (
                      <SocialCard icon={<Facebook className="w-5 h-5" />} label="Facebook" url={profile.facebookLink} gradient="from-blue-500/20 to-blue-600/20" textColor="text-blue-400" />
                    )}
                    {profile.youtubeLink && (
                      <SocialCard icon={<Youtube className="w-5 h-5" />} label="YouTube" url={profile.youtubeLink} gradient="from-red-500/20 to-red-600/20" textColor="text-red-400" />
                    )}
                    {!profile.instagramLink && !profile.facebookLink && !profile.youtubeLink && (
                      <p className="text-sm text-muted-foreground italic col-span-full text-center py-6">
                        No portfolio links added.
                      </p>
                    )}
                  </div>

                  {isOwnProfile && (
                    <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card/60 to-background p-5">
                      <div className="absolute -top-16 -right-16 h-32 w-32 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
                      <div className="relative flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center shrink-0">
                          <Sparkles className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-headline font-bold text-sm text-white">
                            Showcase Your Work on Hafash
                          </h4>
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                            Activate a storage plan to display your photo galleries directly on your profile — no need for external links.
                          </p>
                          <Link href="/storage">
                            <Button size="sm" className="mt-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold gap-1.5">
                              Upgrade Plan
                              <ArrowRight className="w-3.5 h-3.5" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}

                  {!isOwnProfile && (
                    <div className="flex items-start gap-2 p-3 rounded-xl bg-background/40 border border-border/30">
                      <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                      <p className="text-[11px] text-muted-foreground italic">
                        This professional showcases their work through external links.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </SectionCard>

            {/* REVIEWS */}
            <SectionCard title={`Reviews (${reviews.length})`} icon={<Star className="w-4 h-4" />}>
              {reviewsLoading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="p-4 rounded-2xl bg-background/40 border border-border/30 animate-pulse">
                      <div className="h-4 w-32 bg-muted/30 rounded mb-2" />
                      <div className="h-3 w-full bg-muted/20 rounded" />
                    </div>
                  ))}
                </div>
              ) : reviews.length === 0 ? (
                <div className="text-center py-8 rounded-2xl bg-background/30 border border-dashed border-border/40">
                  <Star className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground font-medium">No reviews yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Reviews appear after completed bookings</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {ratingCount > 0 && (
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-primary/5 to-background border border-primary/15 space-y-3">
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <p className="text-4xl font-headline font-bold text-primary">{ratingAvg.toFixed(1)}</p>
                          <div className="flex items-center gap-0.5 mt-1">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star key={s} className={cn("w-3 h-3", s <= Math.round(ratingAvg) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30")} />
                            ))}
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-1">{ratingCount} reviews</p>
                        </div>

                        <div className="flex-1 space-y-2">
                          <CategoryBar label="Punctuality" value={calculatedRating.punctuality} />
                          <CategoryBar label="Behavior" value={calculatedRating.behavior} />
                          <CategoryBar label="Work Quality" value={calculatedRating.workQuality} />
                          <CategoryBar label="Communication" value={calculatedRating.communication} />
                        </div>
                      </div>
                    </div>
                  )}

                  {reviews.map((review) => (
                    <ReviewItem key={review.id} review={review} />
                  ))}
                </div>
              )}
            </SectionCard>

          </div>

          {/* SIDEBAR */}
          <div className="space-y-6">

            {hasOnSite && (
              <SectionCard title="Next 7 Days" icon={<CalendarDays className="w-4 h-4" />}>
                <div className="space-y-2">
                  {next7Days.map((day) => (
                    <div key={day.key} className="flex items-center justify-between p-3 rounded-xl bg-background/40 border border-border/30">
                      <div>
                        <p className="text-xs font-bold">{day.date.toLocaleDateString("en-US", { weekday: "short" })}</p>
                        <p className="text-[10px] text-muted-foreground">{day.date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
                      </div>
                      <div className={cn(
                        "px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest",
                        day.status === "available" && "bg-green-500/15 text-green-400 border border-green-500/30",
                        day.status === "partial" && "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30",
                        day.status === "busy" && "bg-red-500/15 text-red-400 border border-red-500/30"
                      )}>
                        {day.status}
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            <SectionCard title="Quick Info" icon={<Sparkles className="w-4 h-4" />}>
              <div className="space-y-3">
                <QuickInfoRow icon={<Briefcase className="w-4 h-4" />} label="Completed Events" value={String(completedJobs)} />
                <QuickInfoRow icon={<Star className="w-4 h-4" />} label="Rating" value={ratingCount > 0 ? `${ratingAvg.toFixed(1)} / 5.0` : "New"} />
                <QuickInfoRow icon={<TrendingUp className="w-4 h-4" />} label="Trust Score" value={`${trustScore.score} / 100`} />
                <QuickInfoRow icon={<Zap className="w-4 h-4" />} label="Response Time" value={responseTime.text} />
                <QuickInfoRow icon={<ShieldCheck className="w-4 h-4" />} label="Verified" value={isVerified ? "Yes" : "No"} />
                {city && (
                  <QuickInfoRow icon={<MapPin className="w-4 h-4" />} label="Based in" value={city} />
                )}
                <QuickInfoRow icon={<Award className="w-4 h-4" />} label="Member Since" value={memberDuration} />
              </div>
            </SectionCard>

            {isOwnProfile && hasOnSite && (
              <Button variant="outline" className="w-full rounded-2xl h-12 gap-2" onClick={() => router.push("/network/availability")}>
                <CalendarDays className="w-4 h-4" />
                Manage Availability
              </Button>
            )}

            {isOwnProfile && (
              <Button variant="outline" className="w-full rounded-2xl h-12 gap-2" onClick={() => router.push("/network/join")}>
                <Sparkles className="w-4 h-4" />
                Edit Profile
              </Button>
            )}

          </div>
        </div>
      </div>

      {/* WORK REQUEST MODAL */}
      {requestOpen && !isOwnProfile && user && (
        <div
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-300"
          onClick={() => !isSendingRequest && setRequestOpen(false)}
        >
          <Card
            className="w-full max-w-lg rounded-[2rem] border-border/40 bg-card/95 shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-7 lg:p-8 space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-headline font-bold">Send Work Request</h2>
                  <p className="text-sm text-muted-foreground mt-1">Tell {displayName} about your event.</p>
                </div>
                <Button variant="ghost" size="icon" className="rounded-full shrink-0" onClick={() => !isSendingRequest && setRequestOpen(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Event Type *</label>
                  <EventTypePicker value={eventType} onChange={setEventType} placeholder="Select event type..." />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Event Date *</label>
                  <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="h-12 rounded-xl" />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Location</label>
                  <Input placeholder="e.g. DHA Phase 5, Karachi" value={eventLocation} onChange={(e) => setEventLocation(e.target.value)} className="h-12 rounded-xl" />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Your Budget (PKR)</label>
                  <Input type="number" placeholder="e.g. 15000" value={budget} onChange={(e) => setBudget(e.target.value)} className="h-12 rounded-xl" />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Message</label>
                  <Textarea placeholder="Tell them what you need..." value={requestMessage} onChange={(e) => setRequestMessage(e.target.value)} className="min-h-[110px] rounded-xl resize-none" />
                </div>
              </div>

              <div className="flex items-start gap-2 p-3 rounded-xl bg-primary/5 border border-primary/20">
                <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  Your exact location and contact will only be shared after they accept your request.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1 rounded-xl h-12" onClick={() => setRequestOpen(false)} disabled={isSendingRequest}>
                  Cancel
                </Button>
                <Button className="flex-1 rounded-xl h-12 font-bold gap-2" onClick={sendWorkRequest} disabled={!eventDate || !eventType || isSendingRequest}>
                  {isSendingRequest ? (
                    <><Loader2 className="w-4 h-4 animate-spin" />Sending...</>
                  ) : (
                    <><Send className="w-4 h-4" />Send Request</>
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

// Helper Components
function SectionCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card className="rounded-[2rem] border-border/40 bg-card/70 overflow-hidden">
      <div className="px-6 pt-5 pb-3 flex items-center gap-2 border-b border-border/20">
        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">{icon}</div>
        <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground">{title}</h3>
      </div>
      <div className="p-6">{children}</div>
    </Card>
  );
}

function StatBox({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string; sub: string; color: "yellow" | "primary" | "green" | "blue"; }) {
  const colorClasses = {
    yellow: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
    primary: "text-primary bg-primary/10 border-primary/20",
    green: "text-green-400 bg-green-500/10 border-green-500/20",
    blue: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  }[color];

  return (
    <Card className="rounded-2xl border-border/40 bg-card/60 overflow-hidden">
      <CardContent className="p-4 lg:p-5">
        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center mb-3 border", colorClasses)}>{icon}</div>
        <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">{label}</p>
        <p className="text-xl lg:text-2xl font-headline font-bold mt-1">{value}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>
      </CardContent>
    </Card>
  );
}

function QuickInfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string; }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/20 last:border-0">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="text-primary">{icon}</span>
        {label}
      </div>
      <p className="text-xs font-bold">{value}</p>
    </div>
  );
}

function SocialCard({ icon, label, url, gradient, textColor }: { icon: React.ReactNode; label: string; url: string; gradient: string; textColor: string; }) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className={cn("flex flex-col items-center justify-center gap-2 p-5 rounded-2xl border border-border/40 bg-gradient-to-br transition-all hover:scale-[1.03] hover:border-primary/30", gradient)}>
      <div className={textColor}>{icon}</div>
      <span className="text-xs font-bold">{label}</span>
      <ChevronRight className="w-3 h-3 text-muted-foreground" />
    </a>
  );
}

function CategoryBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-muted-foreground w-24 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-background/60 rounded-full overflow-hidden">
        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(value / 5) * 100}%` }} />
      </div>
      <span className="text-[10px] font-bold w-6 text-right">{value.toFixed(1)}</span>
    </div>
  );
}

function ReviewItem({ review }: { review: ReviewData }) {
  let dateStr = "";
  try {
    const d = review.createdAt?.toDate?.() || new Date(review.createdAt);
    dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {}

  const roleLabel = review.role === "hirer" ? "Hirer" : "Professional";

  return (
    <div className="p-5 rounded-2xl bg-background/40 border border-border/30 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <Star className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm truncate">{review.reviewerName || "Anonymous"}</p>
            <p className="text-[10px] text-muted-foreground">{roleLabel} • {dateStr}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
          <span className="text-sm font-bold">{review.overallRating.toFixed(1)}</span>
        </div>
      </div>

      {review.text && (
        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
          &ldquo;{review.text}&rdquo;
        </p>
      )}

      <div className="flex flex-wrap gap-2 pt-2 border-t border-border/20">
        <MiniRating label="Punctuality" value={review.ratings?.punctuality || 0} />
        <MiniRating label="Behavior" value={review.ratings?.behavior || 0} />
        <MiniRating label="Work" value={review.ratings?.workQuality || 0} />
        <MiniRating label="Comm." value={review.ratings?.communication || 0} />
      </div>
    </div>
  );
}

function MiniRating({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-background/60 border border-border/30">
      <span className="text-[9px] text-muted-foreground uppercase tracking-wider">{label}</span>
      <div className="flex items-center gap-0.5">
        <Star className="w-2.5 h-2.5 fill-primary text-primary" />
        <span className="text-[10px] font-bold">{value}</span>
      </div>
    </div>
  );
}