"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser, useFirestore, useCollection, useDoc } from "@/firebase";
import { collection, query, where, doc } from "firebase/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  UserCircle,
  CalendarDays,
  Send,
  Inbox,
  MessageSquare,
  Sparkles,
  ArrowRight,
  Users,
  Star,
  Zap,
  Handshake,
  CheckCircle2,
  TrendingUp,
  Shield,
  Heart,
  MapPin,
  Camera,
  Video,
  Plane,
  Image as ImageIcon,
  Film,
  Wand2,
  Aperture,
  UserCog,
  Brush,
  Crown,
  Flame,
  Award,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { calculateTrustScore } from "@/lib/trust-score";

const ROLE_ICONS: Record<string, React.ReactNode> = {
  photographer: <Camera className="w-3 h-3" />,
  videographer: <Video className="w-3 h-3" />,
  drone_operator: <Plane className="w-3 h-3" />,
  album_designer: <ImageIcon className="w-3 h-3" />,
  video_editor: <Film className="w-3 h-3" />,
  photo_editor: <Wand2 className="w-3 h-3" />,
  camera_operator: <Aperture className="w-3 h-3" />,
  helper: <UserCog className="w-3 h-3" />,
  makeup_artist: <Brush className="w-3 h-3" />,
};

const ROLE_LABELS: Record<string, string> = {
  photographer: 'Photographer',
  videographer: 'Videographer',
  drone_operator: 'Drone Operator',
  album_designer: 'Album Designer',
  video_editor: 'Video Editor',
  photo_editor: 'Photo Editor',
  camera_operator: 'Camera Operator',
  helper: 'Helper',
  makeup_artist: 'Makeup Artist',
};

const NETWORK_ACTIONS = [
  {
    id: "find",
    icon: Search,
    title: "Find Cross",
    description: "Browse photographers, videographers, editors, and crew across Pakistan — send cross request to book.",
    href: "/network",
    color: "from-blue-500/15 to-blue-600/5 border-blue-500/30",
    iconBg: "bg-blue-500/15 text-blue-400",
    cta: "Start Finding",
    highlight: true,
  },
  {
    id: "profile",
    icon: UserCircle,
    title: "My Profile",
    description: "Showcase your work, skills, and portfolio to attract cross requests.",
    href: "/network/profile",
    color: "from-primary/15 to-primary/5 border-primary/30",
    iconBg: "bg-primary/15 text-primary",
    cta: "Open Profile",
  },
  {
    id: "availability",
    icon: CalendarDays,
    title: "My Availability",
    description: "Mark your busy days — other professionals can cross you for their events.",
    href: "/network/availability",
    color: "from-green-500/15 to-green-600/5 border-green-500/30",
    iconBg: "bg-green-500/15 text-green-400",
    cta: "Set Dates",
  },
  {
    id: "requests",
    icon: Send,
    title: "My Cross Requests",
    description: "Track the cross requests you've sent to other professionals.",
    href: "/network/requests",
    color: "from-purple-500/15 to-purple-600/5 border-purple-500/30",
    iconBg: "bg-purple-500/15 text-purple-400",
    cta: "View Requests",
  },
  {
    id: "incoming",
    icon: Inbox,
    title: "Incoming Cross",
    description: "Respond to cross requests sent to you by other professionals.",
    href: "/network/incoming",
    color: "from-amber-500/15 to-amber-600/5 border-amber-500/30",
    iconBg: "bg-amber-500/15 text-amber-400",
    cta: "Open Inbox",
  },
  {
    id: "messages",
    icon: MessageSquare,
    title: "Messages",
    description: "Chat with other professionals about event details and coordination.",
    href: "/network/messages",
    color: "from-pink-500/15 to-pink-600/5 border-pink-500/30",
    iconBg: "bg-pink-500/15 text-pink-400",
    cta: "Open Chats",
  },
  {
    id: "saved",
    icon: Heart,
    title: "Saved Cross",
    description: "Professionals aapne pasand kiye — jab zaroorat ho, foran contact karein.",
    href: "/network/saved",
    color: "from-red-500/15 to-red-600/5 border-red-500/30",
    iconBg: "bg-red-500/15 text-red-400",
    cta: "View Saved",
  },
];

export default function NetworkHubPage() {
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();

  // Network profile
  const networkProfileRef = useMemo(() => {
    if (!firestore || !user) return null;
    return doc(firestore, "networkProfiles", user.uid);
  }, [firestore, user?.uid]);

  const { data: myProfile } = useDoc(networkProfileRef);
  const hasProfile = !!myProfile;

  // User profile (saved count)
  const userProfileRef = useMemo(() => {
    if (!firestore || !user) return null;
    return doc(firestore, "users", user.uid);
  }, [firestore, user?.uid]);

  const { data: userProfile } = useDoc(userProfileRef);
  const savedCount = userProfile?.savedNetworkProfiles?.length || 0;

  // Incoming requests
  const incomingQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, "networkRequests"),
      where("professionalId", "==", user.uid),
      where("status", "==", "pending")
    );
  }, [firestore, user?.uid]);

  const { data: incoming } = useCollection(incomingQuery);
  const pendingCount = incoming?.length || 0;

  // Completed
  const completedQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, "networkRequests"),
      where("professionalId", "==", user.uid),
      where("status", "==", "completed")
    );
  }, [firestore, user?.uid]);

  const { data: completed } = useCollection(completedQuery);
  const completedCount = completed?.length || 0;

  // All profiles (for stats + top)
  const allProfilesQuery = useMemo(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, "networkProfiles"),
      where("isActive", "==", true)
    );
  }, [firestore]);

  const { data: allProfiles } = useCollection(allProfilesQuery);
  const totalProfessionals = allProfiles?.length || 0;

  // ⭐ TOP PROFESSIONALS — Sort by trust score
  const topProfessionals = useMemo(() => {
    if (!allProfiles || allProfiles.length === 0) return [];

    const scored = allProfiles
      .filter((p: any) => {
        // Exclude self
        if (user && p.userId === user.uid) return false;
        // Must have at least 1 review to be "top"
        const rCount = p.rating?.count || 0;
        return rCount > 0;
      })
      .map((p: any) => {
        const ratingAvg = p.rating?.average || 0;
        const ratingCount = p.rating?.count || 0;
        const completedJobs = p.completedJobs || 0;
        const isVerified = p.isVerified || (ratingCount >= 5 && ratingAvg >= 4.0);

        const trust = calculateTrustScore({
          ratingAverage: ratingAvg,
          ratingCount,
          completedJobs,
          isVerified,
        });

        return { ...p, _trustScore: trust.score, _ratingAvg: ratingAvg, _ratingCount: ratingCount };
      })
      .sort((a: any, b: any) => b._trustScore - a._trustScore)
      .slice(0, 3);

    return scored;
  }, [allProfiles, user?.uid]);

  const actions = useMemo(() => {
    return NETWORK_ACTIONS.map((action) => {
      if (action.id === "profile") {
        return {
          ...action,
          href: hasProfile ? `/network/professional/${user?.uid}` : "/network/join",
          title: hasProfile ? "My Profile" : "Create Profile",
          description: hasProfile
            ? "Showcase your work, skills, and portfolio to attract cross requests."
            : "Create your profile to start receiving cross requests from others.",
        };
      }
      return action;
    });
  }, [hasProfile, user?.uid]);

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-6xl mx-auto p-6 lg:p-12 space-y-8 animate-in fade-in duration-500">

        {/* HERO */}
        <div className="relative overflow-hidden rounded-[2rem] border border-primary/20 bg-gradient-to-br from-primary/10 via-card/60 to-background shadow-2xl">
          <div className="absolute -top-32 -right-32 h-64 w-64 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-32 -left-32 h-64 w-64 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

          <div className="relative p-7 lg:p-10">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary">
                    Hafash Network
                  </span>
                </div>

                <h1 className="text-3xl lg:text-5xl font-headline font-bold tracking-tight text-white">
                  Apna <span className="text-primary italic">Cross</span> Yahan Se
                </h1>

                <p className="text-sm lg:text-base text-muted-foreground max-w-xl">
                  Photographers, videographers, editors, aur crew — sab ek jagah. Cross request bhejein ya receive karein, aur apna kaam barhayein.
                </p>

                <div className="flex items-center gap-2 pt-1">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-500/10 border border-green-500/25">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-green-400">
                      Live Network
                    </span>
                  </div>
                </div>
              </div>

              <div className="shrink-0 grid grid-cols-3 gap-2 md:gap-3 md:min-w-[340px]">
                <StatChip icon={<Users className="w-4 h-4" />} label="Pros" value={String(totalProfessionals)} />
                <StatChip icon={<TrendingUp className="w-4 h-4" />} label="Crosses" value={String(completedCount)} />
                <StatChip icon={<Inbox className="w-4 h-4" />} label="Pending" value={String(pendingCount)} highlight={pendingCount > 0} />
              </div>
            </div>
          </div>
        </div>

        {/* ⭐ TOP PROFESSIONALS */}
        {topProfessionals.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="h-0.5 w-6 bg-gradient-to-r from-primary to-primary/30 rounded-full" />
                <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary/90">
                  Top Professionals
                </span>
                <Badge className="rounded-lg bg-primary/15 text-primary border border-primary/30 gap-1 text-[9px] font-bold uppercase tracking-widest ml-1">
                  <Crown className="w-2.5 h-2.5" />
                  Featured
                </Badge>
              </div>

              <Link href="/network">
                <Button variant="ghost" size="sm" className="rounded-xl gap-1.5 text-xs">
                  View All
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {topProfessionals.map((pro: any, idx: number) => (
                <TopProCard key={pro.userId} profile={pro} rank={idx + 1} />
              ))}
            </div>
          </div>
        )}

        {/* QUICK ACTIONS */}
        <div>
          <div className="flex items-center gap-2 mb-5">
            <div className="h-0.5 w-6 bg-gradient-to-r from-primary to-primary/30 rounded-full" />
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary/90">
              Explore
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {actions.map((action) => {
              const Icon = action.icon;
              const isPending = action.id === "incoming" && pendingCount > 0;
              const isProfileMissing = action.id === "profile" && !hasProfile;
              const isPrimary = action.highlight;
              const hasSaved = action.id === "saved" && savedCount > 0;

              return (
                <Link key={action.id} href={action.href} className="group">
                  <Card
                    className={cn(
                      "relative overflow-hidden rounded-2xl border bg-gradient-to-br transition-all duration-500 h-full",
                      "hover:translate-y-[-4px] hover:shadow-xl cursor-pointer",
                      action.color,
                      isProfileMissing && "ring-2 ring-primary/40",
                      isPrimary && "ring-1 ring-blue-500/20"
                    )}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />

                    {isPending && (
                      <div className="absolute -top-6 -right-6 w-16 h-16 rounded-full bg-primary/20 blur-2xl animate-pulse" />
                    )}
                    {hasSaved && (
                      <div className="absolute -top-6 -right-6 w-16 h-16 rounded-full bg-red-500/20 blur-2xl" />
                    )}

                    <CardContent className="relative p-6 space-y-4">
                      <div className="flex items-start justify-between">
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110",
                          action.iconBg
                        )}>
                          <Icon className={cn("w-6 h-6", hasSaved && "fill-red-400 text-red-400")} />
                        </div>

                        {isPending && (
                          <Badge className="bg-primary text-primary-foreground border-0 font-bold animate-pulse">
                            {pendingCount} new
                          </Badge>
                        )}

                        {isProfileMissing && (
                          <Badge variant="outline" className="border-primary/40 text-primary bg-primary/10 text-[10px] font-bold uppercase tracking-widest">
                            Setup
                          </Badge>
                        )}

                        {isPrimary && !isPending && !isProfileMissing && (
                          <Badge variant="outline" className="border-blue-500/30 text-blue-400 bg-blue-500/10 text-[10px] font-bold uppercase tracking-widest">
                            Hot
                          </Badge>
                        )}

                        {hasSaved && (
                          <Badge className="bg-red-500/15 text-red-400 border border-red-500/30 text-[10px] font-bold uppercase tracking-widest">
                            {savedCount} saved
                          </Badge>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <h3 className="text-lg font-headline font-bold text-white">
                          {action.title}
                        </h3>
                        <p className="text-[13px] text-muted-foreground leading-relaxed">
                          {action.description}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-primary pt-1">
                        {action.cta}
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>

        {/* HOW IT WORKS */}
        <div className="relative overflow-hidden rounded-[2rem] border border-border/40 bg-card/40 p-7 lg:p-10">
          <div className="flex items-center gap-2 mb-6">
            <div className="h-0.5 w-6 bg-gradient-to-r from-primary to-primary/30 rounded-full" />
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary/90">
              Kaise Kaam Karta Hai
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StepCard step="01" title="Availability Set Karein" description="Apne busy din mark karein — baqi din automatically available rahenge." icon={<CalendarDays className="w-5 h-5" />} />
            <StepCard step="02" title="Cross Bhejein ya Receive Karein" description="Professionals ko dhoondein ya dusron se cross requests receive karein." icon={<Handshake className="w-5 h-5" />} />
            <StepCard step="03" title="Reviews Se Reputation Banayein" description="Event complete karein, rating lein, aur Hafash par apni izzat barhayein." icon={<Star className="w-5 h-5" />} />
          </div>
        </div>

        {/* TRUST */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <TrustCard icon={<Shield className="w-5 h-5" />} title="Verified Professionals" description="Sirf real aur trusted log — verify kiya gaya." />
          <TrustCard icon={<Star className="w-5 h-5" />} title="Honest Reviews" description="Har cross ke baad real feedback aur rating." />
          <TrustCard icon={<CheckCircle2 className="w-5 h-5" />} title="Secure Chat" description="Cross accept hone ke baad private chat." />
        </div>

        {/* CTA */}
        {!hasProfile && (
          <Card className="relative overflow-hidden rounded-[2rem] border-primary/30 bg-gradient-to-br from-primary/15 via-card to-background shadow-2xl">
            <div className="absolute -top-24 -right-24 h-56 w-56 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
            <CardContent className="relative p-7 lg:p-10 text-center space-y-5">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/15 border border-primary/30">
                <Sparkles className="w-7 h-7 text-primary" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl lg:text-3xl font-headline font-bold text-white">
                  Network join karne ke liye tayyar?
                </h2>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Apna profile banayein, apna kaam dikhayein, aur Pakistan bhar se cross requests receive karein.
                </p>
              </div>
              <Link href="/network/join">
                <button type="button" className="inline-flex items-center gap-2 px-6 h-12 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold shadow-lg shadow-primary/25 transition-all hover:scale-105">
                  Profile Banayein
                  <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
}

function TopProCard({ profile, rank }: { profile: any; rank: number }) {
  const displayName = profile?.studioName || profile?.photographerName || "Hafash Professional";
  const city = profile?.baseCity || profile?.baseLocation || "";
  const ratingAvg = profile?._ratingAvg || 0;
  const ratingCount = profile?._ratingCount || 0;
  const isVerified = profile?.isVerified || (ratingCount >= 5 && ratingAvg >= 4.0);
  const gender = profile?.gender;
  const isFemale = gender === 'female';
  const isMale = gender === 'male';
  const primaryRate = profile?.rates?.[0] || profile?.rate;

  const rankStyles = {
    1: { bg: 'from-yellow-500/20 to-amber-600/10 border-yellow-500/40', badge: 'bg-yellow-500 text-black', icon: <Crown className="w-3 h-3" />, label: '#1' },
    2: { bg: 'from-slate-400/15 to-slate-500/5 border-slate-400/30', badge: 'bg-slate-300 text-black', icon: <Award className="w-3 h-3" />, label: '#2' },
    3: { bg: 'from-orange-600/15 to-orange-700/5 border-orange-600/30', badge: 'bg-orange-400 text-black', icon: <Flame className="w-3 h-3" />, label: '#3' },
  }[rank] || { bg: 'from-primary/10 to-primary/5 border-primary/30', badge: 'bg-primary text-primary-foreground', icon: <Star className="w-3 h-3" />, label: `#${rank}` };

  return (
    <Link href={`/network/professional/${profile.userId}`} className="group">
      <Card
        className={cn(
          "relative overflow-hidden rounded-[2rem] border bg-gradient-to-br transition-all duration-300 h-full",
          "hover:-translate-y-1 hover:shadow-xl cursor-pointer",
          rankStyles.bg
        )}
      >
        {/* Rank Badge */}
        <div className={cn(
          "absolute top-4 right-4 z-10 flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-[10px] shadow-lg",
          rankStyles.badge
        )}>
          {rankStyles.icon}
          {rankStyles.label}
        </div>

        <CardContent className="p-6 space-y-4">

          {/* Name */}
          <div className="min-w-0 pr-16">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-headline font-bold text-base truncate group-hover:text-primary transition-colors">
                {displayName}
              </h3>
              {isVerified && <ShieldCheck className="w-4 h-4 text-primary shrink-0" />}
            </div>

            <div className="flex flex-wrap gap-1.5 mt-2">
              {isFemale && (
                <Badge className="rounded-md bg-pink-500/15 text-pink-400 border-pink-500/30 text-[9px] font-bold uppercase tracking-widest px-2">
                  Female
                </Badge>
              )}
              {isMale && (
                <Badge className="rounded-md bg-blue-500/15 text-blue-400 border-blue-500/30 text-[9px] font-bold uppercase tracking-widest px-2">
                  Male
                </Badge>
              )}
              {(profile.roles || []).slice(0, 1).map((role: string) => (
                <Badge key={role} variant="outline" className="text-[9px] uppercase font-bold border-primary/20 text-primary bg-primary/5 gap-1">
                  {ROLE_ICONS[role]}
                  {ROLE_LABELS[role] || role}
                </Badge>
              ))}
              {(profile.roles || []).length > 1 && (
                <Badge className="text-[9px] bg-background/50 text-muted-foreground border border-border/30">
                  +{profile.roles.length - 1}
                </Badge>
              )}
            </div>
          </div>

          {/* Rating */}
          {ratingCount > 0 && (
            <div className="flex items-center gap-1.5">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span className="font-bold text-sm">{ratingAvg.toFixed(1)}</span>
              <span className="text-xs text-muted-foreground">({ratingCount})</span>
            </div>
          )}

          {/* City */}
          {city && (
            <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-background/50 border border-border/30 rounded-lg px-2.5 py-1.5">
              <MapPin className="w-3 h-3" />
              {city}
            </p>
          )}

          {/* Rate + Trust */}
          <div className="flex items-end justify-between pt-3 border-t border-border/20">
            <div>
              <p className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground">Rate</p>
              <p className="font-headline font-bold text-primary text-sm">
                Rs. {primaryRate?.amount?.toLocaleString() || '—'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground">Trust</p>
              <p className="font-headline font-bold text-sm">{profile._trustScore}/100</p>
            </div>
          </div>

        </CardContent>
      </Card>
    </Link>
  );
}

function StatChip({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: string; highlight?: boolean; }) {
  return (
    <div className={cn("rounded-2xl border px-3 py-2.5 bg-background/50 backdrop-blur-sm", highlight ? "border-primary/40 bg-primary/10" : "border-border/40")}>
      <div className="flex items-center gap-1.5 text-muted-foreground text-[9px] uppercase tracking-widest font-bold mb-0.5">
        <span className={highlight ? "text-primary" : "text-muted-foreground"}>{icon}</span>
        {label}
      </div>
      <p className={cn("text-xl font-headline font-bold", highlight ? "text-primary" : "text-white")}>{value}</p>
    </div>
  );
}

function StepCard({ step, title, description, icon }: { step: string; title: string; description: string; icon: React.ReactNode; }) {
  return (
    <div className="relative space-y-3 group">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
          {icon}
        </div>
        <span className="text-3xl font-headline font-bold text-primary/20">{step}</span>
      </div>
      <h3 className="font-headline font-bold text-base text-white">{title}</h3>
      <p className="text-[13px] text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

function TrustCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string; }) {
  return (
    <Card className="rounded-2xl border-border/40 bg-card/50 hover:border-primary/30 transition-all duration-300">
      <CardContent className="p-5 flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
          {icon}
        </div>
        <div className="min-w-0">
          <h4 className="font-headline font-bold text-sm text-white">{title}</h4>
          <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}