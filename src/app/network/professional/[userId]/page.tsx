"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useUser, useFirestore, useDoc } from "@/firebase";
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
  MessageSquare,
  ThumbsUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { RATE_UNIT_LABELS, TRAVEL_RANGE_LABELS } from "@/lib/equipment";
import { EventTypePicker } from "@/components/event-type-picker";

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
  const [requestOpen, setRequestOpen] = useState(false);
  const [eventDate, setEventDate] = useState("");
  const [eventType, setEventType] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [budget, setBudget] = useState("");
  const [requestMessage, setRequestMessage] = useState("");
  const [isSendingRequest, setIsSendingRequest] = useState(false);

  // Reviews state
  const [reviews, setReviews] = useState<ReviewData[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);

  const savedProfiles = currentUserProfile?.savedNetworkProfiles || [];
  const isSaved = !!userId && savedProfiles.includes(userId);
  const isOwnProfile = !!user && user.uid === userId;

  // Fetch reviews
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
        // Sort newest first
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

  const toggleSaveProfile = useCallback(async () => {
    if (!user || !firestore || !userId || isSavingProfile) return;
    setIsSavingProfile(true);
    try {
      await updateDoc(doc(firestore, "users", user.uid), {
        savedNetworkProfiles: isSaved ? arrayRemove(userId) : arrayUnion(userId),
      });
      toast({
        title: isSaved ? "Removed from saved" : "Saved to your list",
      });
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
  const ratingAvg = profile?.rating?.average || 0;
  const ratingCount = profile?.rating?.count || 0;
  const completedJobs = profile?.completedJobs || 0;
  const isVerified = profile?.isVerified || false;

  const next7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const key = d.toISOString().split("T")[0];
    const status = profile?.availability?.[key] || "available";
    return { date: d, status, key };
  });
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

                  {/* Rating summary in hero */}
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

        {/* STATS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatBox
            icon={<Star className="w-4 h-4" />}
            label="Rating"
            value={ratingCount > 0 ? ratingAvg.toFixed(1) : "New"}
            sub={ratingCount > 0 ? `${ratingCount} reviews` : "No reviews yet"}
            color="yellow"
          />
          <StatBox
            icon={<Briefcase className="w-4 h-4" />}
            label="Events"
            value={String(completedJobs)}
            sub="completed"
            color="primary"
          />
          <StatBox
            icon={<Zap className="w-4 h-4" />}
            label="Response"
            value="~2h"
            sub="typically"
            color="green"
          />
          <StatBox
            icon={<Award className="w-4 h-4" />}
            label="Member"
            value="2 yr"
            sub="on Hafash"
            color="blue"
          />
        </div>

        {/* MAIN GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
          <div className="space-y-6">

            {profile.bio && (
              <SectionCard title="About" icon={<Info className="w-4 h-4" />}>
                <p className="text-sm leading-7 text-muted-foreground whitespace-pre-wrap">
                  {profile.bio}
                </p>
              </SectionCard>
            )}

            {rates.length > 0 && (
              <SectionCard title="Rate Card" icon={<Briefcase className="w-4 h-4" />}>
                <div className="space-y-2">
                  {rates.map((rate: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-4 rounded-2xl bg-background/40 border border-border/30 hover:border-primary/30 transition-all"
                    >
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
                    <Badge
                      key={eq.id}
                      variant="outline"
                      className="rounded-xl bg-background/40 border-border/40 px-3 py-2 text-xs font-medium"
                    >
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
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-2">
                        Works in
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {areas.map((area: string) => (
                          <Badge
                            key={area}
                            variant="outline"
                            className="rounded-lg bg-primary/5 border-primary/20 text-primary text-[11px] font-medium"
                          >
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
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {profile.portfolioGalleryIds.map((gId: string) => (
                        <div
                          key={gId}
                          className="aspect-[4/3] rounded-2xl overflow-hidden border border-border/40 bg-background/50 flex items-center justify-center"
                        >
                          <ImageIcon className="w-6 h-6 text-muted-foreground/30" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      Gallery portfolio coming soon.
                    </p>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {profile.instagramLink && (
                    <SocialCard
                      icon={<Instagram className="w-5 h-5" />}
                      label="Instagram"
                      url={profile.instagramLink}
                      gradient="from-pink-500/20 to-purple-500/20"
                      textColor="text-pink-400"
                    />
                  )}
                  {profile.facebookLink && (
                    <SocialCard
                      icon={<Facebook className="w-5 h-5" />}
                      label="Facebook"
                      url={profile.facebookLink}
                      gradient="from-blue-500/20 to-blue-600/20"
                      textColor="text-blue-400"
                    />
                  )}
                  {profile.youtubeLink && (
                    <SocialCard
                      icon={<Youtube className="w-5 h-5" />}
                      label="YouTube"
                      url={profile.youtubeLink}
                      gradient="from-red-500/20 to-red-600/20"
                      textColor="text-red-400"
                    />
                  )}
                  {!profile.instagramLink && !profile.facebookLink && !profile.youtubeLink && (
                    <p className="text-sm text-muted-foreground italic col-span-full">
                      No portfolio links added.
                    </p>
                  )}
                </div>
              )}
            </SectionCard>

            {/* ⭐ REVIEWS SECTION */}
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
                  <p className="text-sm text-muted-foreground font-medium">
                    No reviews yet
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Reviews appear after completed bookings
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Rating breakdown */}
                  {ratingCount > 0 && (
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-primary/5 to-background border border-primary/15 space-y-3">
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <p className="text-4xl font-headline font-bold text-primary">
                            {ratingAvg.toFixed(1)}
                          </p>
                          <div className="flex items-center gap-0.5 mt-1">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                className={cn(
                                  "w-3 h-3",
                                  s <= Math.round(ratingAvg)
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "text-muted-foreground/30"
                                )}
                              />
                            ))}
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {ratingCount} reviews
                          </p>
                        </div>

                        <div className="flex-1 space-y-2">
                          <CategoryBar
                            label="Punctuality"
                            value={profile?.rating?.punctuality || 0}
                          />
                          <CategoryBar
                            label="Behavior"
                            value={profile?.rating?.behavior || 0}
                          />
                          <CategoryBar
                            label="Work Quality"
                            value={profile?.rating?.workQuality || 0}
                          />
                          <CategoryBar
                            label="Communication"
                            value={profile?.rating?.communication || 0}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Individual reviews */}
                  {reviews.map((review) => (
                    <ReviewItem key={review.id} review={review} />
                  ))}
                </div>
              )}
            </SectionCard>

          </div>

          {/* SIDEBAR */}
          <div className="space-y-6">

            <SectionCard title="Next 7 Days" icon={<CalendarDays className="w-4 h-4" />}>
              <div className="space-y-2">
                {next7Days.map((day) => (
                  <div
                    key={day.key}
                    className="flex items-center justify-between p-3 rounded-xl bg-background/40 border border-border/30"
                  >
                    <div>
                      <p className="text-xs font-bold">
                        {day.date.toLocaleDateString("en-US", { weekday: "short" })}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {day.date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </p>
                    </div>
                    <div
                      className={cn(
                        "px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest",
                        day.status === "available" && "bg-green-500/15 text-green-400 border border-green-500/30",
                        day.status === "partial" && "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30",
                        day.status === "busy" && "bg-red-500/15 text-red-400 border border-red-500/30"
                      )}
                    >
                      {day.status}
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Quick Info" icon={<Sparkles className="w-4 h-4" />}>
              <div className="space-y-3">
                <QuickInfoRow
                  icon={<Briefcase className="w-4 h-4" />}
                  label="Completed Events"
                  value={String(completedJobs)}
                />
                <QuickInfoRow
                  icon={<Star className="w-4 h-4" />}
                  label="Rating"
                  value={ratingCount > 0 ? `${ratingAvg.toFixed(1)} / 5.0` : "New"}
                />
                <QuickInfoRow
                  icon={<ShieldCheck className="w-4 h-4" />}
                  label="Verified"
                  value={isVerified ? "Yes" : "No"}
                />
                <QuickInfoRow
                  icon={<MapPin className="w-4 h-4" />}
                  label="Based in"
                  value={city || "—"}
                />
              </div>
            </SectionCard>

            {isOwnProfile && (
              <Button
                variant="outline"
                className="w-full rounded-2xl h-12 gap-2"
                onClick={() => router.push("/network/availability")}
              >
                <CalendarDays className="w-4 h-4" />
                Manage Availability
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
                  <p className="text-sm text-muted-foreground mt-1">
                    Tell {displayName} about your event.
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full shrink-0"
                  onClick={() => !isSendingRequest && setRequestOpen(false)}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    Event Type *
                  </label>
                  <EventTypePicker
                    value={eventType}
                    onChange={setEventType}
                    placeholder="Select event type..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    Event Date *
                  </label>
                  <Input
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="h-12 rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    Location
                  </label>
                  <Input
                    placeholder="e.g. DHA Phase 5, Karachi"
                    value={eventLocation}
                    onChange={(e) => setEventLocation(e.target.value)}
                    className="h-12 rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    Your Budget (PKR)
                  </label>
                  <Input
                    type="number"
                    placeholder="e.g. 15000"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    className="h-12 rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    Message
                  </label>
                  <Textarea
                    placeholder="Tell them what you need..."
                    value={requestMessage}
                    onChange={(e) => setRequestMessage(e.target.value)}
                    className="min-h-[110px] rounded-xl resize-none"
                  />
                </div>
              </div>

              <div className="flex items-start gap-2 p-3 rounded-xl bg-primary/5 border border-primary/20">
                <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  Your exact location and contact will only be shared after they accept your request.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1 rounded-xl h-12"
                  onClick={() => setRequestOpen(false)}
                  disabled={isSendingRequest}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 rounded-xl h-12 font-bold gap-2"
                  onClick={sendWorkRequest}
                  disabled={!eventDate || !eventType || isSendingRequest}
                >
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
// ─────────────────────────────────────────────────────────────
// Helper Components
// ─────────────────────────────────────────────────────────────

function SectionCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="rounded-[2rem] border-border/40 bg-card/70 overflow-hidden">
      <div className="px-6 pt-5 pb-3 flex items-center gap-2 border-b border-border/20">
        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          {icon}
        </div>
        <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground">
          {title}
        </h3>
      </div>
      <div className="p-6">{children}</div>
    </Card>
  );
}

function StatBox({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  color: "yellow" | "primary" | "green" | "blue";
}) {
  const colorClasses = {
    yellow: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
    primary: "text-primary bg-primary/10 border-primary/20",
    green: "text-green-400 bg-green-500/10 border-green-500/20",
    blue: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  }[color];

  return (
    <Card className="rounded-2xl border-border/40 bg-card/60 overflow-hidden">
      <CardContent className="p-4 lg:p-5">
        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center mb-3 border", colorClasses)}>
          {icon}
        </div>
        <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">{label}</p>
        <p className="text-xl lg:text-2xl font-headline font-bold mt-1">{value}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>
      </CardContent>
    </Card>
  );
}

function QuickInfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
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

function SocialCard({
  icon,
  label,
  url,
  gradient,
  textColor,
}: {
  icon: React.ReactNode;
  label: string;
  url: string;
  gradient: string;
  textColor: string;
}) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "flex flex-col items-center justify-center gap-2 p-5 rounded-2xl border border-border/40 bg-gradient-to-br transition-all hover:scale-[1.03] hover:border-primary/30",
        gradient
      )}
    >
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
        <div
          className="h-full bg-primary rounded-full transition-all"
          style={{ width: `${(value / 5) * 100}%` }}
        />
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
            <p className="text-[10px] text-muted-foreground">
              {roleLabel} • {dateStr}
            </p>
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