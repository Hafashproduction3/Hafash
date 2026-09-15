"use client";

import { useState, useMemo, useCallback } from 'react';
import { useUser, useFirestore, useCollection, useDoc } from '@/firebase';
import {
  collection,
  query,
  where,
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { searchEquipment, type EquipmentItem, type Role } from '@/lib/equipment';
import {
  Search,
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
  X,
  Instagram,
  Facebook,
  Youtube,
  Users,
  Sparkles,
  Star,
  ShieldCheck,
  Briefcase,
  ChevronDown,
  UserCircle,
} from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

type RoleKey = Role;

const ROLE_FILTERS: { id: RoleKey; label: string; icon: React.ReactNode }[] = [
  { id: 'photographer', label: 'Photographer', icon: <Camera className="w-4 h-4" /> },
  { id: 'videographer', label: 'Videographer', icon: <Video className="w-4 h-4" /> },
  { id: 'drone_operator', label: 'Drone Operator', icon: <Plane className="w-4 h-4" /> },
  { id: 'album_designer', label: 'Album Designer', icon: <ImageIcon className="w-4 h-4" /> },
  { id: 'video_editor', label: 'Video Editor', icon: <Film className="w-4 h-4" /> },
  { id: 'photo_editor', label: 'Photo Editor', icon: <Wand2 className="w-4 h-4" /> },
  { id: 'camera_operator', label: 'Camera Operator', icon: <Aperture className="w-4 h-4" /> },
  { id: 'helper', label: 'Helper / Assistant', icon: <UserCog className="w-4 h-4" /> },
  { id: 'makeup_artist', label: 'Makeup Artist', icon: <Brush className="w-4 h-4" /> },
];

type SortOption = 'rating' | 'rate_low' | 'rate_high' | 'newest';

const SORT_OPTIONS: { id: SortOption; label: string }[] = [
  { id: 'rating', label: 'Best Rating' },
  { id: 'rate_low', label: 'Lowest Rate' },
  { id: 'rate_high', label: 'Highest Rate' },
  { id: 'newest', label: 'Newest First' },
];

export default function NetworkSearchPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const [roleFilter, setRoleFilter] = useState<RoleKey | null>(null);
  const [locationQuery, setLocationQuery] = useState('');
  const [equipmentQuery, setEquipmentQuery] = useState('');
  const [equipmentFilters, setEquipmentFilters] = useState<EquipmentItem[]>([]);
  const [dateFilter, setDateFilter] = useState<Date | undefined>();
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('rating');
  const [showAllFilters, setShowAllFilters] = useState(false);

  // ── Current user's saved profiles ──
  const myProfileRef = useMemo(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user?.uid]);

  const { data: myProfile } = useDoc(myProfileRef);
  const savedIds: string[] = myProfile?.savedNetworkProfiles || [];

  // ── Check if current user has a network profile ──
  const myNetworkProfileRef = useMemo(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'networkProfiles', user.uid);
  }, [firestore, user?.uid]);

  const { data: myNetworkProfile } = useDoc(myNetworkProfileRef);
  const hasNetworkProfile = !!myNetworkProfile;

  // ── All active network profiles ──
  const profilesQuery = useMemo(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'networkProfiles'),
      where('isActive', '==', true)
    );
  }, [firestore]);

  const { data: profiles, loading } = useCollection(profilesQuery);

  const dateFilterKey = dateFilter
    ? dateFilter.toISOString().split('T')[0]
    : '';

  const equipmentResults = useMemo(() => {
    if (!equipmentQuery.trim()) return [];
    return searchEquipment(equipmentQuery)
      .filter((item) => !equipmentFilters.some((sel) => sel.id === item.id))
      .slice(0, 6);
  }, [equipmentQuery, equipmentFilters]);

  const addEquipmentFilter = useCallback((item: EquipmentItem) => {
    setEquipmentFilters((prev) => [...prev, item]);
    setEquipmentQuery('');
  }, []);

  const removeEquipmentFilter = useCallback((id: string) => {
    setEquipmentFilters((prev) => prev.filter((item) => item.id !== id));
  }, []);

  // ── Filtering & sorting ──
  const filteredProfiles = useMemo(() => {
    if (!profiles) return [];

    const filtered = profiles.filter((p: any) => {
      // Skip own profile
      if (user && p.userId === user.uid) return false;

      // Role
      if (roleFilter && !(p.roles || []).includes(roleFilter)) return false;

      // Location
      if (locationQuery.trim()) {
        const q = locationQuery.trim().toLowerCase();
        const city = (p.baseCity || p.baseLocation || '').toLowerCase();
        const areas = (p.serviceAreas || []).map((a: string) => a.toLowerCase());
        const matchCity = city.includes(q);
        const matchArea = areas.some((a: string) => a.includes(q));
        if (!matchCity && !matchArea) return false;
      }

      // Equipment
      if (equipmentFilters.length > 0) {
        const profileEquipmentNames = (p.equipment || []).map((e: any) => e.name);
        const hasAll = equipmentFilters.every((filter) =>
          profileEquipmentNames.includes(filter.name)
        );
        if (!hasAll) return false;
      }

      // Date (hide only busy)
      if (dateFilterKey) {
        const status = p.availability?.[dateFilterKey];
        if (status === 'busy') return false;
      }

      // Verified
      if (verifiedOnly && !p.isVerified) return false;

      return true;
    });

    // Sort
    return [...filtered].sort((a: any, b: any) => {
      const aRating = a.rating?.average || 0;
      const bRating = b.rating?.average || 0;
      const aRate = a.rate?.amount || a.rates?.[0]?.amount || 0;
      const bRate = b.rate?.amount || b.rates?.[0]?.amount || 0;
      const aCreated = a.createdAt?.seconds || 0;
      const bCreated = b.createdAt?.seconds || 0;

      switch (sortBy) {
        case 'rating':
          return bRating - aRating;
        case 'rate_low':
          return aRate - bRate;
        case 'rate_high':
          return bRate - aRate;
        case 'newest':
          return bCreated - aCreated;
        default:
          return 0;
      }
    });
  }, [profiles, roleFilter, locationQuery, equipmentFilters, dateFilterKey, user, verifiedOnly, sortBy]);

  const toggleSave = useCallback(
    async (professionalUserId: string, isSaved: boolean) => {
      if (!firestore || !user) return;
      const ref = doc(firestore, 'users', user.uid);
      try {
        await updateDoc(ref, {
          savedNetworkProfiles: isSaved
            ? arrayRemove(professionalUserId)
            : arrayUnion(professionalUserId),
        });
      } catch (error) {
        console.error('[NETWORK_SAVE] Error:', error);
      }
    },
    [firestore, user]
  );

  const clearAllFilters = useCallback(() => {
    setRoleFilter(null);
    setLocationQuery('');
    setEquipmentFilters([]);
    setDateFilter(undefined);
    setVerifiedOnly(false);
  }, []);

  const hasActiveFilters =
    !!roleFilter || !!locationQuery.trim() || equipmentFilters.length > 0 || !!dateFilter || verifiedOnly;

  return (
    <div className="min-h-screen bg-background p-6 lg:p-12 animate-in fade-in duration-500">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* ── Header ── */}
        <div className="relative overflow-hidden rounded-[2rem] border border-border/40 bg-card/40 px-6 py-7 lg:px-8 lg:py-8 shadow-sm">
          <div className="absolute -top-24 -right-24 h-56 w-56 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
          <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                  Hafash Network
                </span>
              </div>
              <div>
                <h1 className="text-3xl lg:text-4xl font-headline font-bold tracking-tight">
                  Find the right professional.
                </h1>
                <p className="mt-2 max-w-2xl text-sm lg:text-base text-muted-foreground">
                  Connect with trusted photographers, videographers, editors, and crew for your next event.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
              {/* My Profile Button */}
              {user && (
                <Button
                  variant="outline"
                  className="rounded-2xl gap-2 h-auto py-3 px-5 border-border/40 hover:border-primary/40 hover:bg-primary/5 justify-center"
                  onClick={() => {
                    if (hasNetworkProfile) {
                      router.push(`/network/professional/${user.uid}`);
                    } else {
                      router.push('/network/join');
                    }
                  }}
                >
                  <UserCircle className="w-4 h-4" />
                  <span className="text-sm font-bold">
                    {hasNetworkProfile ? 'My Profile' : 'Create Profile'}
                  </span>
                </Button>
              )}

              {/* Available count */}
              <div className="rounded-2xl border border-border/40 bg-background/50 px-5 py-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Available
                </p>
                <p className="text-xl font-headline font-bold">
                  {loading ? '...' : filteredProfiles.length}
                  <span className="ml-1 text-sm font-medium text-muted-foreground">
                    professionals
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Filters ── */}
        <Card className="bg-card/80 border-border/40 rounded-[2rem] overflow-hidden shadow-sm">
          <CardContent className="p-6 lg:p-7 space-y-6">

            {/* Role filters */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    Professional Type
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Choose the kind of professional you need.
                  </p>
                </div>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground hover:text-destructive gap-1"
                    onClick={clearAllFilters}
                  >
                    <X className="w-3 h-3" /> Clear All
                  </Button>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setRoleFilter(null)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold border-2 transition-all",
                    roleFilter === null
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border/30 text-muted-foreground hover:border-primary/30'
                  )}
                >
                  All
                </button>

                {ROLE_FILTERS.map((role) => (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => setRoleFilter(role.id)}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs font-bold border-2 flex items-center gap-2 transition-all",
                      roleFilter === role.id
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border/30 text-muted-foreground hover:border-primary/30'
                    )}
                  >
                    {role.icon}
                    {role.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Location + Equipment */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border/20">
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by city or area (e.g. Karachi, DHA)"
                  className="pl-12 h-12 rounded-xl bg-background/60 border-border/40"
                  value={locationQuery}
                  onChange={(e) => setLocationQuery(e.target.value)}
                />
              </div>

              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Filter by camera/gear (e.g. Sony A7 IV)"
                  className="pl-12 h-12 rounded-xl bg-background/60 border-border/40"
                  value={equipmentQuery}
                  onChange={(e) => setEquipmentQuery(e.target.value)}
                />

                {equipmentQuery.trim() && (
                  <div className="absolute z-20 mt-2 w-full bg-card border border-border/30 rounded-xl overflow-hidden shadow-xl">
                    {equipmentResults.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => addEquipmentFilter(item)}
                        className="w-full text-left px-4 py-2.5 hover:bg-primary/10 text-sm"
                      >
                        {item.name}
                      </button>
                    ))}
                    {equipmentResults.length === 0 && (
                      <div className="px-4 py-2.5 text-sm text-muted-foreground">
                        No matches
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Equipment chips */}
            {equipmentFilters.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {equipmentFilters.map((item) => (
                  <Badge
                    key={item.id}
                    className="bg-primary/10 text-primary border border-primary/20 rounded-lg px-3 py-1.5 gap-2 text-xs font-bold"
                  >
                    {item.name}
                    <button type="button" onClick={() => removeEquipmentFilter(item.id)}>
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            {/* Advanced toggle */}
            <button
              type="button"
              onClick={() => setShowAllFilters(!showAllFilters)}
              className="flex items-center gap-2 text-xs font-bold text-primary hover:underline"
            >
              <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", showAllFilters && "rotate-180")} />
              {showAllFilters ? 'Hide' : 'Show'} advanced filters
            </button>

            {/* Advanced Filters */}
            {showAllFilters && (
              <div className="space-y-5 pt-4 border-t border-border/20 animate-in fade-in duration-300">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Date */}
                  <div className="space-y-3">
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      Availability Date
                    </p>
                    <Calendar
                      mode="single"
                      selected={dateFilter}
                      onSelect={setDateFilter}
                      className="rounded-2xl border border-border/40 bg-background/30 p-3"
                    />
                    {dateFilter && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          Selected: {dateFilter.toLocaleDateString()}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setDateFilter(undefined)}
                          className="rounded-xl text-xs"
                        >
                          Clear
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Sort + Verified */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        Sort By
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {SORT_OPTIONS.map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setSortBy(opt.id)}
                            className={cn(
                              "px-3 py-2 rounded-xl text-xs font-bold border-2 transition-all text-left",
                              sortBy === opt.id
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-border/30 text-muted-foreground hover:border-primary/30'
                            )}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setVerifiedOnly(!verifiedOnly)}
                      className={cn(
                        "w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all",
                        verifiedOnly
                          ? 'border-primary bg-primary/10'
                          : 'border-border/30 hover:border-primary/30'
                      )}
                    >
                      <span className="flex items-center gap-2 text-xs font-bold">
                        <ShieldCheck className={cn("w-4 h-4", verifiedOnly ? "text-primary" : "text-muted-foreground")} />
                        <span className={verifiedOnly ? 'text-primary' : 'text-muted-foreground'}>
                          Verified professionals only
                        </span>
                      </span>
                      <div className={cn(
                        "w-5 h-5 rounded-md border-2 flex items-center justify-center",
                        verifiedOnly ? 'border-primary bg-primary' : 'border-border/40'
                      )}>
                        {verifiedOnly && <span className="text-primary-foreground text-xs">✓</span>}
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            )}

          </CardContent>
        </Card>

        {/* ── Results ── */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-80 rounded-3xl bg-card/20" />
            ))}
          </div>
        ) : filteredProfiles.length === 0 ? (
          <div className="text-center py-32 border-2 border-dashed border-white/5 rounded-[3rem]">
            <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-6" />
            <h3 className="text-xl font-headline font-bold mb-2">
              No professionals found
            </h3>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              {profiles && profiles.length === 0
                ? "Be the first to join Hafash Network! Click below to create your profile."
                : "Try adjusting your filters, or check back later as more professionals join."}
            </p>
            {(!profiles || profiles.length === 0) && (
              <Button
                className="mt-6 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold"
                onClick={() => router.push('/network/join')}
              >
                Join Hafash Network
              </Button>
            )}
            {hasActiveFilters && profiles && profiles.length > 0 && (
              <Button
                variant="outline"
                className="mt-6 rounded-xl"
                onClick={clearAllFilters}
              >
                Clear All Filters
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProfiles.map((profile: any) => (
              <ProfessionalCard
                key={profile.userId}
                profile={profile}
                isSaved={savedIds.includes(profile.userId)}
                onToggleSave={() =>
                  toggleSave(profile.userId, savedIds.includes(profile.userId))
                }
                canSave={!!user}
              />
            ))}
          </div>
        )}

      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Professional Card
// ─────────────────────────────────────────────────────────────

function ProfessionalCard({
  profile,
  isSaved,
  onToggleSave,
  canSave,
}: {
  profile: any;
  isSaved: boolean;
  onToggleSave: () => void;
  canSave: boolean;
}) {
  const displayName =
    profile?.studioName ||
    profile?.photographerName ||
    'Hafash Professional';

  const roleIcons: Record<string, React.ReactNode> = {
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

  const roleLabels: Record<string, string> = {
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

  const primaryRate = profile?.rates?.[0] || profile?.rate;
  const ratingAvg = profile?.rating?.average || 0;
  const ratingCount = profile?.rating?.count || 0;
  const completedJobs = profile?.completedJobs || 0;
  const city = profile?.baseCity || profile?.baseLocation || '';

  return (
    <Card className="group relative bg-card/80 border-border/40 rounded-[2rem] overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-primary/30 transition-all duration-300">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/60 via-primary/20 to-transparent opacity-60" />

      <CardContent className="p-6 lg:p-7 space-y-4">

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <a
                href={`/network/professional/${profile.userId}`}
                className="font-headline font-bold text-lg tracking-tight group-hover:text-primary transition-colors hover:text-primary truncate"
              >
                {displayName}
              </a>
              {profile.isVerified && (
                <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
              )}
            </div>

            <div className="flex flex-wrap gap-1.5 mt-2">
              {(profile.roles || []).slice(0, 3).map((role: string) => (
                <Badge
                  key={role}
                  variant="outline"
                  className="text-[9px] uppercase font-bold border-primary/20 text-primary bg-primary/5 gap-1"
                >
                  {roleIcons[role]}
                  {roleLabels[role] || role}
                </Badge>
              ))}
              {(profile.roles || []).length > 3 && (
                <Badge className="text-[9px] bg-background/50 text-muted-foreground border border-border/30">
                  +{profile.roles.length - 3}
                </Badge>
              )}
            </div>
          </div>

          {canSave && (
            <button
              type="button"
              onClick={onToggleSave}
              className="shrink-0 w-10 h-10 rounded-xl border border-border/40 bg-background/50 flex items-center justify-center hover:bg-primary/5 hover:border-primary/20 transition-all"
            >
              <Heart
                className={cn(
                  "w-5 h-5",
                  isSaved ? 'fill-red-400 text-red-400' : 'text-muted-foreground'
                )}
              />
            </button>
          )}
        </div>

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

        {city && (
          <p className="inline-flex items-center gap-2 text-xs text-muted-foreground rounded-xl bg-background/50 border border-border/30 px-3 py-2">
            <MapPin className="w-3.5 h-3.5" />
            {city}
            {profile.serviceAreas && profile.serviceAreas.length > 0 && (
              <span className="text-[10px] opacity-70">
                • {profile.serviceAreas.slice(0, 2).join(', ')}
                {profile.serviceAreas.length > 2 && ` +${profile.serviceAreas.length - 2}`}
              </span>
            )}
          </p>
        )}

        {profile.bio && (
          <p className="text-sm leading-6 text-muted-foreground line-clamp-2">
            {profile.bio}
          </p>
        )}

        {(profile.equipment || []).length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {profile.equipment.slice(0, 3).map((eq: any) => (
              <Badge
                key={eq.id}
                className="bg-background/60 text-muted-foreground border-border/30 rounded-lg text-[10px] px-2 py-0.5 font-normal"
              >
                {eq.name}
              </Badge>
            ))}
            {profile.equipment.length > 3 && (
              <Badge className="bg-background/50 text-muted-foreground border border-border/30 text-[10px] font-normal">
                +{profile.equipment.length - 3} more
              </Badge>
            )}
          </div>
        )}

        <div className="flex items-end justify-between pt-4 border-t border-border/20">
          <div>
            <p className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground">
              Rate
            </p>
            <p className="font-headline font-bold text-primary">
              Rs. {primaryRate?.amount?.toLocaleString() || '—'}
              <span className="text-xs text-muted-foreground">
                /{primaryRate?.unit === 'per_hour' ? 'hr' : primaryRate?.unit === 'per_day' ? 'day' : 'event'}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            {profile.instagramLink && (
              <a href={profile.instagramLink} target="_blank" rel="noopener noreferrer">
                <Instagram className="w-4 h-4 text-muted-foreground hover:text-pink-500 transition-colors" />
              </a>
            )}
            {profile.facebookLink && (
              <a href={profile.facebookLink} target="_blank" rel="noopener noreferrer">
                <Facebook className="w-4 h-4 text-muted-foreground hover:text-blue-500 transition-colors" />
              </a>
            )}
            {profile.youtubeLink && (
              <a href={profile.youtubeLink} target="_blank" rel="noopener noreferrer">
                <Youtube className="w-4 h-4 text-muted-foreground hover:text-red-500 transition-colors" />
              </a>
            )}
            {profile.portfolioType === 'hafash_gallery' && (
              <ImageIcon className="w-4 h-4 text-primary" />
            )}
          </div>
        </div>

      </CardContent>
    </Card>
  );
}