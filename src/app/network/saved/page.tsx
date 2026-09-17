"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser, useFirestore, useDoc, useCollection } from "@/firebase";
import { collection, query, where, doc, updateDoc, arrayRemove } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Heart,
  Star,
  ShieldCheck,
  MapPin,
  Briefcase,
  Sparkles,
  User as UserIcon,
  Camera,
  Video,
  Plane,
  Image as ImageIcon,
  Film,
  Wand2,
  Aperture,
  UserCog,
  Brush,
  Users,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

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

export default function SavedProfessionalsPage() {
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  // Get current user's saved profiles
  const myProfileRef = useMemo(() => {
    if (!firestore || !user) return null;
    return doc(firestore, "users", user.uid);
  }, [firestore, user?.uid]);

  const { data: myProfile, loading: myProfileLoading } = useDoc(myProfileRef);
  const savedIds: string[] = myProfile?.savedNetworkProfiles || [];

  // Get all saved profiles
  const allProfilesQuery = useMemo(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, "networkProfiles"),
      where("isActive", "==", true)
    );
  }, [firestore]);

  const { data: allProfiles, loading: profilesLoading } = useCollection(allProfilesQuery);

  // Filter only saved
  const savedProfiles = useMemo(() => {
    if (!allProfiles || savedIds.length === 0) return [];
    return allProfiles.filter((p: any) => savedIds.includes(p.userId));
  }, [allProfiles, savedIds]);

  const handleRemove = async (profileUserId: string, profileName: string) => {
    if (!firestore || !user) return;
    try {
      await updateDoc(doc(firestore, "users", user.uid), {
        savedNetworkProfiles: arrayRemove(profileUserId),
      });
      toast({ title: "Removed", description: `${profileName} removed from saved.` });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Failed to remove" });
    }
  };

  const loading = myProfileLoading || profilesLoading;

  return (
    <div className="min-h-screen bg-background p-6 lg:p-12 animate-in fade-in duration-500">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={() => router.back()}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-red-400/20 bg-red-400/5 px-3 py-1.5 mb-2">
              <Heart className="w-3 h-3 text-red-400" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-400">
                Saved Professionals
              </span>
            </div>
            <h1 className="text-3xl lg:text-4xl font-headline font-bold tracking-tight">
              My Saved Cross
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Professionals aapne dil se save kiye — jab zaroorat ho, foran contact karein.
            </p>
          </div>
        </div>

        {/* Stats */}
        {!loading && savedProfiles.length > 0 && (
          <div className="flex items-center gap-3">
            <Badge className="bg-red-400/10 text-red-400 border border-red-400/20 rounded-lg px-3 py-1.5 text-xs font-bold gap-1.5">
              <Heart className="w-3 h-3 fill-current" />
              {savedProfiles.length} saved
            </Badge>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="rounded-3xl border-border/40 bg-card/60">
                <CardContent className="p-6">
                  <div className="animate-pulse space-y-3">
                    <div className="h-5 w-40 bg-muted/30 rounded" />
                    <div className="h-3 w-64 bg-muted/20 rounded" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : savedProfiles.length === 0 ? (
          <Card className="rounded-[2rem] border-dashed border-border/40 bg-card/40">
            <CardContent className="p-16 text-center space-y-4">
              <div className="w-20 h-20 rounded-2xl bg-red-400/10 flex items-center justify-center mx-auto">
                <Heart className="w-10 h-10 text-red-400" />
              </div>
              <div>
                <h3 className="font-headline font-bold text-xl">Abhi koi saved nahi</h3>
                <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
                  Search karte waqt professional ke card par dil (❤️) dabayein — wo yahan aa jayega.
                </p>
              </div>
              <Link href="/network">
                <Button className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold gap-2 mt-2">
                  <Sparkles className="w-4 h-4" />
                  Browse Professionals
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {savedProfiles.map((profile: any) => (
              <SavedProfileCard
                key={profile.userId}
                profile={profile}
                onRemove={() => handleRemove(
                  profile.userId,
                  profile.studioName || profile.photographerName || "Professional"
                )}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SavedProfileCard({
  profile,
  onRemove,
}: {
  profile: any;
  onRemove: () => void;
}) {
  const displayName = profile?.studioName || profile?.photographerName || "Hafash Professional";
  const city = profile?.baseCity || profile?.baseLocation || "";
  const ratingAvg = profile?.rating?.average || 0;
  const ratingCount = profile?.rating?.count || 0;
  const completedJobs = profile?.completedJobs || 0;
  const isVerified = profile?.isVerified || (ratingCount >= 5 && ratingAvg >= 4.0);
  const gender = profile?.gender;
  const isFemale = gender === 'female';
  const isMale = gender === 'male';
  const primaryRate = profile?.rates?.[0] || profile?.rate;

  return (
    <Card
      className={cn(
        "group relative bg-card/80 border-border/40 rounded-[2rem] overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300",
        isFemale && "hover:border-pink-500/40",
        isMale && "hover:border-blue-500/40",
        !isFemale && !isMale && "hover:border-primary/40"
      )}
    >
      <div className={cn(
        "absolute inset-x-0 top-0 h-1",
        isFemale && "bg-gradient-to-r from-pink-500/60 via-pink-500/20 to-transparent",
        isMale && "bg-gradient-to-r from-blue-500/60 via-blue-500/20 to-transparent",
        !isFemale && !isMale && "bg-gradient-to-r from-primary/60 via-primary/20 to-transparent"
      )} />

      <CardContent className="p-6 space-y-4">

        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Link
                href={`/network/professional/${profile.userId}`}
                className="font-headline font-bold text-lg tracking-tight hover:text-primary transition-colors truncate"
              >
                {displayName}
              </Link>
              {isVerified && (
                <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
              )}
            </div>

            <div className="flex flex-wrap gap-1.5 mt-2">
              {isFemale && (
                <Badge className="rounded-md bg-pink-500/15 text-pink-400 border-pink-500/30 text-[9px] font-bold uppercase tracking-widest gap-1 px-2">
                  Female
                </Badge>
              )}
              {isMale && (
                <Badge className="rounded-md bg-blue-500/15 text-blue-400 border-blue-500/30 text-[9px] font-bold uppercase tracking-widest gap-1 px-2">
                  Male
                </Badge>
              )}

              {(profile.roles || []).slice(0, 2).map((role: string) => (
                <Badge
                  key={role}
                  variant="outline"
                  className="text-[9px] uppercase font-bold border-primary/20 text-primary bg-primary/5 gap-1"
                >
                  {ROLE_ICONS[role]}
                  {ROLE_LABELS[role] || role}
                </Badge>
              ))}
              {(profile.roles || []).length > 2 && (
                <Badge className="text-[9px] bg-background/50 text-muted-foreground border border-border/30">
                  +{profile.roles.length - 2}
                </Badge>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onRemove}
            className="shrink-0 w-10 h-10 rounded-xl border border-red-400/30 bg-red-400/10 flex items-center justify-center hover:bg-red-400/20 transition-all"
            title="Remove from saved"
          >
            <Heart className="w-5 h-5 fill-red-400 text-red-400" />
          </button>
        </div>

        {/* Rating */}
        {(ratingCount > 0 || completedJobs > 0) && (
          <div className="flex items-center gap-4 text-xs">
            {ratingCount > 0 && (
              <div className="flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                <span className="font-bold">{ratingAvg.toFixed(1)}</span>
                <span className="text-muted-foreground">({ratingCount})</span>
              </div>
            )}
            {completedJobs > 0 && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Briefcase className="w-3.5 h-3.5" />
                <span>{completedJobs} events</span>
              </div>
            )}
          </div>
        )}

        {/* Location */}
        {city && (
          <p className="inline-flex items-center gap-2 text-xs text-muted-foreground rounded-xl bg-background/50 border border-border/30 px-3 py-2">
            <MapPin className="w-3.5 h-3.5" />
            {city}
          </p>
        )}

        {/* Bio */}
        {profile.bio && (
          <p className="text-sm leading-6 text-muted-foreground line-clamp-2">
            {profile.bio}
          </p>
        )}

        {/* Rate + Actions */}
        <div className="pt-4 border-t border-border/20 flex items-center justify-between gap-3">
          <div>
            <p className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground">Rate</p>
            <p className="font-headline font-bold text-primary">
              Rs. {primaryRate?.amount?.toLocaleString() || '—'}
              <span className="text-xs text-muted-foreground">
                /{primaryRate?.unit === 'per_hour' ? 'hr' : primaryRate?.unit === 'per_project' ? 'project' : 'event'}
              </span>
            </p>
          </div>

          <Link href={`/network/professional/${profile.userId}?request=1`}>
            <Button
              size="sm"
              className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Send Request
            </Button>
          </Link>
        </div>

      </CardContent>
    </Card>
  );
}