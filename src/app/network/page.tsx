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
  CAMERAS,
  GIMBALS,
  DRONES,
  searchCameras,
  searchGimbals,
  searchDrones,
  getCameraLabel,
  getGimbalLabel,
  getDroneLabel,
} from '@/lib/cameras';
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
  ArrowRight,
  Clock,
  TrendingUp,
  DollarSign,
  Check,
  Sliders,
  Send,
  Camera as CameraIcon,
  Video as VideoIcon,
} from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

type RoleKey = Role;
type GenderFilter = 'any' | 'male' | 'female';
type SortOption = 'best_match' | 'top_rated' | 'lowest_price' | 'newest';
type GimbalFilter = 'any' | 'yes' | 'no';

const REMOTE_ROLES = ['video_editor', 'photo_editor', 'album_designer'];

const ROLE_FILTERS: { id: RoleKey; label: string; icon: React.ReactNode }[] = [
  { id: 'photographer', label: 'Photographer', icon: <Camera className="w-3.5 h-3.5" /> },
  { id: 'videographer', label: 'Videographer', icon: <Video className="w-3.5 h-3.5" /> },
  { id: 'drone_operator', label: 'Drone Operator', icon: <Plane className="w-3.5 h-3.5" /> },
  { id: 'album_designer', label: 'Album Designer', icon: <ImageIcon className="w-3.5 h-3.5" /> },
  { id: 'video_editor', label: 'Video Editor', icon: <Film className="w-3.5 h-3.5" /> },
  { id: 'photo_editor', label: 'Photo Editor', icon: <Wand2 className="w-3.5 h-3.5" /> },
  { id: 'camera_operator', label: 'Camera Op', icon: <Aperture className="w-3.5 h-3.5" /> },
  { id: 'helper', label: 'Helper', icon: <UserCog className="w-3.5 h-3.5" /> },
  { id: 'makeup_artist', label: 'Makeup Artist', icon: <Brush className="w-3.5 h-3.5" /> },
];

const SORT_OPTIONS: { id: SortOption; label: string }[] = [
  { id: 'best_match', label: 'Best Match' },
  { id: 'top_rated', label: 'Top Rated' },
  { id: 'lowest_price', label: 'Lowest Price' },
  { id: 'newest', label: 'Newest' },
];

export default function NetworkSearchPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const [genderFilter, setGenderFilter] = useState<GenderFilter>('any');
  const [dateFilter, setDateFilter] = useState<Date | undefined>();
  const [locationQuery, setLocationQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleKey | null>(null);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('best_match');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // ⭐ NEW: Camera + Gimbal + Event Location
  const [eventLocation, setEventLocation] = useState('');
  const [requiredCameras, setRequiredCameras] = useState<string[]>([]);
  const [cameraQuery, setCameraQuery] = useState('');
  const [gimbalRequired, setGimbalRequired] = useState<GimbalFilter>('any');
  const [requiredGimbals, setRequiredGimbals] = useState<string[]>([]);
  const [gimbalQuery, setGimbalQuery] = useState('');

  const myProfileRef = useMemo(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user?.uid]);

  const { data: myProfile } = useDoc(myProfileRef);
  const savedIds: string[] = myProfile?.savedNetworkProfiles || [];

  const profilesQuery = useMemo(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'networkProfiles'),
      where('isActive', '==', true)
    );
  }, [firestore]);

  const { data: profiles, loading } = useCollection(profilesQuery);

  const dateFilterKey = dateFilter ? format(dateFilter, 'yyyy-MM-dd') : '';

  // ⭐ Camera search results
  const cameraResults = useMemo(() => {
    if (!cameraQuery.trim()) return [];
    return searchCameras(cameraQuery)
      .filter((c) => !requiredCameras.includes(c.id))
      .slice(0, 8);
  }, [cameraQuery, requiredCameras]);

  // ⭐ Gimbal search results
  const gimbalResults = useMemo(() => {
    if (!gimbalQuery.trim()) return [];
    return searchGimbals(gimbalQuery)
      .filter((g) => !requiredGimbals.includes(g.id))
      .slice(0, 8);
  }, [gimbalQuery, requiredGimbals]);

  const filteredProfiles = useMemo(() => {
    if (!profiles || !dateFilterKey) return [];

    const filtered = profiles.filter((p: any) => {
      if (user && p.userId === user.uid) return false;

      if (genderFilter !== 'any') {
        if (p.gender !== genderFilter) return false;
      }

      if (roleFilter && !(p.roles || []).includes(roleFilter)) return false;

      if (locationQuery.trim()) {
        const q = locationQuery.trim().toLowerCase();
        const city = (p.baseCity || p.baseLocation || '').toLowerCase();
        const areas = (p.serviceAreas || []).map((a: string) => a.toLowerCase());
        if (!city.includes(q) && !areas.some((a: string) => a.includes(q))) return false;
      }

      // ⭐ Event Location filter
      if (eventLocation.trim()) {
        const loc = eventLocation.toLowerCase();
        const city = (p.baseCity || p.baseLocation || '').toLowerCase();
        const areas = (p.serviceAreas || []).map((a: string) => a.toLowerCase());
        if (!city.includes(loc) && !areas.some((a: string) => a.includes(loc))) return false;
      }

      // ⭐ Camera filter
      if (requiredCameras.length > 0) {
        const professionalCameras = p.cameras || [];
        const hasRequired = requiredCameras.some((camId) =>
          professionalCameras.includes(camId)
        );
        if (!hasRequired) return false;
      }

      // ⭐ Gimbal filter
      if (gimbalRequired === 'yes') {
        if (!p.gimbals || p.gimbals.length === 0) return false;
        if (requiredGimbals.length > 0) {
          const hasRequired = requiredGimbals.some((gimId) =>
            p.gimbals.includes(gimId)
          );
          if (!hasRequired) return false;
        }
      } else if (gimbalRequired === 'no') {
        if (p.gimbals && p.gimbals.length > 0) return false;
      }

      if (dateFilterKey) {
        const matchingRoles = roleFilter ? [roleFilter] : (p.roles || []);
        const hasOnSiteMatch = matchingRoles.some((r: string) => !REMOTE_ROLES.includes(r));

        if (hasOnSiteMatch) {
          const status = p.availability?.[dateFilterKey];
          if (status === 'busy') return false;
        }
      }

      if (verifiedOnly) {
        const rCount = p.rating?.count || 0;
        const rAvg = p.rating?.average || 0;
        const isVer = p.isVerified || (rCount >= 5 && rAvg >= 4.0);
        if (!isVer) return false;
      }

      const primaryRate = p.rates?.[0]?.amount || p.rate?.amount || 0;
      if (budgetMin && primaryRate < Number(budgetMin)) return false;
      if (budgetMax && primaryRate > Number(budgetMax)) return false;

      return true;
    });

    return [...filtered].sort((a: any, b: any) => {
      const aRating = a.rating?.average || 0;
      const bRating = b.rating?.average || 0;
      const aRate = a.rates?.[0]?.amount || a.rate?.amount || 0;
      const bRate = b.rates?.[0]?.amount || b.rate?.amount || 0;
      const aCreated = a.createdAt?.seconds || 0;
      const bCreated = b.createdAt?.seconds || 0;

      const aTrust = (aRating * 60) / 5 + Math.min((a.rating?.count || 0) / 20, 1) * 20;
      const bTrust = (bRating * 60) / 5 + Math.min((b.rating?.count || 0) / 20, 1) * 20;

      switch (sortBy) {
        case 'top_rated':
          return bRating - aRating;
        case 'lowest_price':
          return aRate - bRate;
        case 'newest':
          return bCreated - aCreated;
        case 'best_match':
        default:
          return bTrust - aTrust;
      }
    });
  }, [
    profiles, genderFilter, roleFilter, locationQuery, dateFilterKey,
    verifiedOnly, budgetMin, budgetMax, user, sortBy,
    eventLocation, requiredCameras, gimbalRequired, requiredGimbals,
  ]);

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
    setGenderFilter('any');
    setDateFilter(undefined);
    setLocationQuery('');
    setRoleFilter(null);
    setVerifiedOnly(false);
    setBudgetMin('');
    setBudgetMax('');
    setSortBy('best_match');
    setEventLocation('');
    setRequiredCameras([]);
    setCameraQuery('');
    setGimbalRequired('any');
    setRequiredGimbals([]);
    setGimbalQuery('');
  }, []);

  const hasActiveFilters =
    genderFilter !== 'any' ||
    !!locationQuery.trim() ||
    !!roleFilter ||
    verifiedOnly ||
    !!budgetMin ||
    !!budgetMax ||
    !!eventLocation.trim() ||
    requiredCameras.length > 0 ||
    gimbalRequired !== 'any' ||
    requiredGimbals.length > 0;

  const getRoleLabel = (roleId: string) => {
    return ROLE_FILTERS.find(r => r.id === roleId)?.label || roleId;
  };

  return (
    <div className="min-h-screen bg-background p-5 lg:p-10 animate-in fade-in duration-500">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* HEADER */}
        <div className="relative overflow-hidden rounded-[2rem] border border-border/40 bg-gradient-to-br from-primary/8 via-card/60 to-background px-6 py-6 lg:px-8 lg:py-8 shadow-sm">
          <div className="absolute -top-24 -right-24 h-56 w-56 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

          <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary">
                  Hafash Network
                </span>
              </div>
              <h1 className="text-3xl lg:text-4xl font-headline font-bold tracking-tight">
                Apna <span className="text-primary italic">Cross</span> Dhundein
              </h1>
              <p className="text-sm text-muted-foreground max-w-xl">
                Gender, date, location aur camera — sab select karein, hum perfect professional dikhayenge.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {user && (
                <Button
                  variant="outline"
                  className="rounded-2xl gap-2 border-border/40 hover:border-primary/40"
                  onClick={() => router.push('/network/hub')}
                >
                  <ArrowRight className="w-4 h-4 rotate-180" />
                  <span className="text-sm font-bold">Hub</span>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* FILTERS */}
        <Card className="bg-card/80 border-border/40 rounded-[2rem] overflow-hidden shadow-sm">
          <CardContent className="p-6 lg:p-7 space-y-7">

            {/* STEP 1: GENDER */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary/80">Step 1</span>
                <div className="h-px flex-1 bg-border/30" />
                <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground">
                  Kisko hire karna hai?
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <GenderChip active={genderFilter === 'any'} onClick={() => setGenderFilter('any')} label="Any" icon={<Users className="w-4 h-4" />} color="primary" />
                <GenderChip active={genderFilter === 'male'} onClick={() => setGenderFilter('male')} label="Male" icon={<UserCircle className="w-4 h-4" />} color="blue" />
                <GenderChip active={genderFilter === 'female'} onClick={() => setGenderFilter('female')} label="Female" icon={<UserCircle className="w-4 h-4" />} color="pink" />
              </div>
            </div>

            {/* STEP 2: DATE */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary/80">Step 2</span>
                <div className="h-px flex-1 bg-border/30" />
                <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground">
                  Kis date ke liye? <span className="text-destructive">*</span>
                </span>
              </div>

              {!dateFilter ? (
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-background/40 border-2 border-dashed border-primary/30">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/25 flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm">Date select karein</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Available professionals dikhane ke liye date zaroori hai
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-primary/5 border-2 border-primary/30">
                  <div className="w-11 h-11 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center shrink-0">
                    <Check className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm">{format(dateFilter, 'EEEE, dd MMMM yyyy')}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Aapki selected date</p>
                  </div>
                  <Button variant="ghost" size="icon" className="rounded-full shrink-0" onClick={() => setDateFilter(undefined)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}

              <div className="rounded-2xl border border-border/40 bg-background/30 p-2 flex justify-center">
                <Calendar
                  mode="single"
                  selected={dateFilter}
                  onSelect={setDateFilter}
                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  className="rounded-xl"
                />
              </div>
            </div>

            {/* STEP 2B: EVENT LOCATION ⭐ */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary/80">Step 2B</span>
                <div className="h-px flex-1 bg-border/30" />
                <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground">
                  Kahan shoot hai? (optional)
                </span>
              </div>

              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                <Input
                  placeholder="e.g., Noori House, DHA Phase 5"
                  className="pl-12 h-12 rounded-xl bg-background/60 border-border/40"
                  value={eventLocation}
                  onChange={(e) => setEventLocation(e.target.value)}
                />
              </div>
            </div>

            {/* STEP 2C: CAMERA REQUIREMENT ⭐ */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary/80">Step 2C</span>
                <div className="h-px flex-1 bg-border/30" />
                <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground">
                  Camera chahiye? (optional)
                </span>
              </div>

              {/* Selected Cameras */}
              {requiredCameras.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {requiredCameras.map((camId) => (
                    <Badge
                      key={camId}
                      className="bg-primary/10 text-primary border border-primary/20 rounded-lg px-3 py-1.5 gap-2 text-xs font-bold"
                    >
                      📸 {getCameraLabel(camId)}
                      <button
                        type="button"
                        onClick={() => setRequiredCameras(prev => prev.filter(c => c !== camId))}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search camera... (e.g., Sony A7 III)"
                  className="pl-12 h-12 rounded-xl bg-background/60 border-border/40"
                  value={cameraQuery}
                  onChange={(e) => setCameraQuery(e.target.value)}
                />
              </div>

              {cameraQuery.trim() && cameraResults.length > 0 && (
                <div className="border border-border/30 rounded-2xl overflow-hidden max-h-64 overflow-y-auto">
                  {cameraResults.map((camera) => (
                    <button
                      key={camera.id}
                      type="button"
                      onClick={() => {
                        setRequiredCameras(prev => [...prev, camera.id]);
                        setCameraQuery('');
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-primary/10 flex items-center justify-between text-sm border-b border-border/20 last:border-0"
                    >
                      <span className="flex items-center gap-2">
                        <span>{camera.emoji}</span>
                        <span>{camera.brand} {camera.model}</span>
                      </span>
                      <span className="text-[10px] uppercase text-muted-foreground">
                        {camera.type}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* STEP 2D: GIMBAL REQUIREMENT ⭐ */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary/80">Step 2D</span>
                <div className="h-px flex-1 bg-border/30" />
                <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground">
                  Gimbal chahiye?
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setGimbalRequired('any')}
                  className={cn(
                    "px-3 py-2.5 rounded-xl text-xs font-bold border-2 transition-all",
                    gimbalRequired === 'any'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border/30 text-muted-foreground hover:border-primary/30'
                  )}
                >
                  Any
                </button>
                <button
                  type="button"
                  onClick={() => setGimbalRequired('yes')}
                  className={cn(
                    "px-3 py-2.5 rounded-xl text-xs font-bold border-2 transition-all",
                    gimbalRequired === 'yes'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border/30 text-muted-foreground hover:border-primary/30'
                  )}
                >
                  Haan, chahiye
                </button>
                <button
                  type="button"
                  onClick={() => setGimbalRequired('no')}
                  className={cn(
                    "px-3 py-2.5 rounded-xl text-xs font-bold border-2 transition-all",
                    gimbalRequired === 'no'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border/30 text-muted-foreground hover:border-primary/30'
                  )}
                >
                  Nahi
                </button>
              </div>

              {gimbalRequired === 'yes' && (
                <>
                  {requiredGimbals.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {requiredGimbals.map((gimId) => (
                        <Badge
                          key={gimId}
                          className="bg-primary/10 text-primary border border-primary/20 rounded-lg px-3 py-1.5 gap-2 text-xs font-bold"
                        >
                          🎬 {getGimbalLabel(gimId)}
                          <button
                            type="button"
                            onClick={() => setRequiredGimbals(prev => prev.filter(g => g !== gimId))}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search gimbal... (e.g., DJI RS 3)"
                      className="pl-12 h-12 rounded-xl bg-background/60 border-border/40"
                      value={gimbalQuery}
                      onChange={(e) => setGimbalQuery(e.target.value)}
                    />
                  </div>

                  {gimbalQuery.trim() && gimbalResults.length > 0 && (
                    <div className="border border-border/30 rounded-2xl overflow-hidden max-h-64 overflow-y-auto">
                      {gimbalResults.map((gimbal) => (
                        <button
                          key={gimbal.id}
                          type="button"
                          onClick={() => {
                            setRequiredGimbals(prev => [...prev, gimbal.id]);
                            setGimbalQuery('');
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-primary/10 flex items-center justify-between text-sm border-b border-border/20 last:border-0"
                        >
                          <span className="flex items-center gap-2">
                            <span>{gimbal.emoji}</span>
                            <span>{gimbal.brand} {gimbal.model}</span>
                          </span>
                          <span className="text-[10px] uppercase text-muted-foreground">
                            {gimbal.payload}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* STEP 3: LOCATION */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary/80">Step 3</span>
                <div className="h-px flex-1 bg-border/30" />
                <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground">
                  Kahan? (optional)
                </span>
              </div>

              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by city or area (e.g. Karachi, DHA)"
                  className="pl-12 h-12 rounded-xl bg-background/60 border-border/40"
                  value={locationQuery}
                  onChange={(e) => setLocationQuery(e.target.value)}
                />
              </div>
            </div>

            {/* STEP 4: ROLE */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary/80">Step 4</span>
                <div className="h-px flex-1 bg-border/30" />
                <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground">
                  Kaunse professional?
                </span>
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
                      "px-3 py-2 rounded-xl text-xs font-bold border-2 flex items-center gap-1.5 transition-all",
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

            {/* ADVANCED */}
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-xs font-bold text-primary hover:underline pt-2 border-t border-border/20 w-full"
            >
              <Sliders className="w-3.5 h-3.5" />
              {showAdvanced ? 'Hide' : 'Show'} advanced filters
              <ChevronDown className={cn("w-3.5 h-3.5 ml-auto transition-transform", showAdvanced && "rotate-180")} />
            </button>

            {showAdvanced && (
              <div className="space-y-5 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-primary" />
                    <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      Budget Range (Rs.)
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input type="number" placeholder="Min (e.g. 5000)" className="h-11 rounded-xl" value={budgetMin} onChange={(e) => setBudgetMin(e.target.value)} />
                    <Input type="number" placeholder="Max (e.g. 50000)" className="h-11 rounded-xl" value={budgetMax} onChange={(e) => setBudgetMax(e.target.value)} />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setVerifiedOnly(!verifiedOnly)}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all",
                    verifiedOnly ? 'border-primary bg-primary/10' : 'border-border/30 hover:border-primary/30'
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
                    {verifiedOnly && <Check className="w-3 h-3 text-primary-foreground" />}
                  </div>
                </button>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      Sort By
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {SORT_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setSortBy(opt.id)}
                        className={cn(
                          "px-3 py-2.5 rounded-xl text-[11px] font-bold border-2 transition-all",
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

                {hasActiveFilters && (
                  <Button
                    variant="outline"
                    className="w-full rounded-xl gap-2 text-destructive hover:bg-destructive/10 border-destructive/30"
                    onClick={clearAllFilters}
                  >
                    <X className="w-4 h-4" />
                    Clear All Filters
                  </Button>
                )}
              </div>
            )}

          </CardContent>
        </Card>

        {/* RESULTS HEADER */}
        {dateFilter && !loading && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-foreground">
                {filteredProfiles.length} {filteredProfiles.length === 1 ? 'professional' : 'professionals'} mile
              </span>

              {genderFilter !== 'any' && (
                <Badge className={cn(
                  "rounded-lg border text-[10px] font-bold uppercase tracking-widest gap-1",
                  genderFilter === 'male'
                    ? "bg-blue-500/15 text-blue-400 border-blue-500/30"
                    : "bg-pink-500/15 text-pink-400 border-pink-500/30"
                )}>
                  {genderFilter === 'male' ? 'Male' : 'Female'}
                </Badge>
              )}

              {roleFilter && (
                <Badge className="rounded-lg bg-primary/15 text-primary border-primary/30 text-[10px] font-bold uppercase tracking-widest">
                  {getRoleLabel(roleFilter)}
                </Badge>
              )}

              {eventLocation.trim() && (
                <Badge className="rounded-lg bg-background border border-border/40 text-[10px] font-bold uppercase tracking-widest gap-1">
                  <MapPin className="w-2.5 h-2.5" />
                  {eventLocation}
                </Badge>
              )}

              {requiredCameras.length > 0 && (
                <Badge className="rounded-lg bg-primary/15 text-primary border-primary/30 text-[10px] font-bold uppercase tracking-widest gap-1">
                  <CameraIcon className="w-2.5 h-2.5" />
                  {requiredCameras.length} camera
                </Badge>
              )}

              {gimbalRequired === 'yes' && (
                <Badge className="rounded-lg bg-primary/15 text-primary border-primary/30 text-[10px] font-bold uppercase tracking-widest gap-1">
                  <VideoIcon className="w-2.5 h-2.5" />
                  Gimbal
                </Badge>
              )}
            </div>

            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
              for {format(dateFilter, 'dd MMM yyyy')}
            </span>
          </div>
        )}

        {/* RESULTS */}
        {!dateFilter ? (
          <EmptyState
            icon={<Clock className="w-10 h-10" />}
            title="Date Select Karein"
            description="Available professionals dikhane ke liye pehle date select karein — baaki filters baad mein laga sakte hain."
          />
        ) : loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-80 rounded-3xl bg-card/20" />
            ))}
          </div>
        ) : filteredProfiles.length === 0 ? (
          <EmptyState
            icon={<Users className="w-10 h-10" />}
            title="Koi professional nahi mila"
            description={
              hasActiveFilters
                ? "Try adjusting your filters or select a different date."
                : "Is date ke liye koi available professional nahi hai. Kisi aur date ko try karein."
            }
            onAction={hasActiveFilters ? clearAllFilters : undefined}
            actionLabel="Clear Filters"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProfiles.map((profile: any) => (
  <ProfessionalCard
    key={profile.userId}
    profile={profile}
    dateFilterKey={dateFilterKey}
    eventLocation={eventLocation}
    requiredCameras={requiredCameras}
    gimbalRequired={gimbalRequired}
    isSaved={savedIds.includes(profile.userId)}
    onToggleSave={() =>
      toggleSave(profile.userId, savedIds.includes(profile.userId))
    }
    canSave={!!user}
    onSendRequest={() => {
      const params = new URLSearchParams();
      params.set('request', '1');
      if (dateFilterKey) params.set('date', dateFilterKey);
      if (eventLocation) params.set('location', eventLocation);
      if (requiredCameras.length > 0) params.set('cameras', requiredCameras.join(','));
      if (gimbalRequired !== 'any') params.set('gimbal', gimbalRequired);
      router.push(`/network/professional/${profile.userId}?${params.toString()}`);
    }}
  />
))}
          </div>
        )}

      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Helper Components
// ─────────────────────────────────────────────────────────────

function GenderChip({ active, onClick, label, icon, color }: {
  active: boolean; onClick: () => void; label: string; icon: React.ReactNode; color: 'primary' | 'blue' | 'pink';
}) {
  const colors = {
    primary: { active: 'border-primary bg-primary/10 text-primary', inactive: 'border-border/30 text-muted-foreground hover:border-primary/30' },
    blue: { active: 'border-blue-500 bg-blue-500/10 text-blue-400', inactive: 'border-border/30 text-muted-foreground hover:border-blue-500/30' },
    pink: { active: 'border-pink-500 bg-pink-500/10 text-pink-400', inactive: 'border-border/30 text-muted-foreground hover:border-pink-500/30' },
  }[color];

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all",
        active ? colors.active : colors.inactive
      )}
    >
      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", active ? "bg-current/10" : "bg-muted/40")}>
        {icon}
      </div>
      <span className="text-[11px] font-bold uppercase tracking-wider">{label}</span>
    </button>
  );
}

function EmptyState({ icon, title, description, onAction, actionLabel }: {
  icon: React.ReactNode; title: string; description: string; onAction?: () => void; actionLabel?: string;
}) {
  return (
    <div className="text-center py-20 border-2 border-dashed border-border/40 rounded-[2rem] bg-card/30">
      <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
        <div className="text-primary">{icon}</div>
      </div>
      <h3 className="text-xl font-headline font-bold mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm max-w-md mx-auto leading-relaxed">{description}</p>
      {onAction && actionLabel && (
        <Button variant="outline" className="mt-5 rounded-xl gap-2" onClick={onAction}>
          <X className="w-4 h-4" />
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

function ProfessionalCard({
  profile,
  dateFilterKey,
  eventLocation,
  requiredCameras,
  gimbalRequired,
  isSaved,
  onToggleSave,
  canSave,
  onSendRequest,
}: {
  profile: any;
  dateFilterKey?: string;
  eventLocation?: string;
  requiredCameras?: string[];
  gimbalRequired?: string;
  isSaved: boolean;
  onToggleSave: () => void;
  canSave: boolean;
  onSendRequest: () => void;
}) {
  const displayName = profile?.studioName || profile?.photographerName || 'Hafash Professional';

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

  const isVerified = profile?.isVerified || (ratingCount >= 5 && ratingAvg >= 4.0);

  const gender = profile?.gender;
  const isFemale = gender === 'female';
  const isMale = gender === 'male';

  // ⭐ Cameras + Gimbals
  const cameras = profile?.cameras || [];
  const gimbals = profile?.gimbals || [];

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

        {/* Name + Save */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <a
                href={`/network/professional/${profile.userId}`}
                className="font-headline font-bold text-lg tracking-tight group-hover:text-primary transition-colors hover:text-primary truncate"
              >
                {displayName}
              </a>
              {isVerified && (
                <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
              )}
            </div>

            <div className="flex flex-wrap gap-1.5 mt-2">
              {isFemale && (
                <Badge className="rounded-md bg-pink-500/15 text-pink-400 border-pink-500/30 text-[9px] font-bold uppercase tracking-widest gap-1 px-2">
                  <UserCircle className="w-2.5 h-2.5" />
                  Female
                </Badge>
              )}
              {isMale && (
                <Badge className="rounded-md bg-blue-500/15 text-blue-400 border-blue-500/30 text-[9px] font-bold uppercase tracking-widest gap-1 px-2">
                  <UserCircle className="w-2.5 h-2.5" />
                  Male
                </Badge>
              )}

              {(profile.roles || []).slice(0, 2).map((role: string) => (
                <Badge
                  key={role}
                  variant="outline"
                  className="text-[9px] uppercase font-bold border-primary/20 text-primary bg-primary/5 gap-1"
                >
                  {roleIcons[role]}
                  {roleLabels[role] || role}
                </Badge>
              ))}
              {(profile.roles || []).length > 2 && (
                <Badge className="text-[9px] bg-background/50 text-muted-foreground border border-border/30">
                  +{profile.roles.length - 2}
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
              <Heart className={cn("w-5 h-5", isSaved ? 'fill-red-400 text-red-400' : 'text-muted-foreground')} />
            </button>
          )}
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
            {profile.serviceAreas && profile.serviceAreas.length > 0 && (
              <span className="text-[10px] opacity-70">
                • {profile.serviceAreas.slice(0, 2).join(', ')}
                {profile.serviceAreas.length > 2 && ` +${profile.serviceAreas.length - 2}`}
              </span>
            )}
          </p>
        )}

        {/* Bio */}
        {profile.bio && (
          <p className="text-sm leading-6 text-muted-foreground line-clamp-2">{profile.bio}</p>
        )}

        {/* ⭐ CAMERAS */}
        {cameras.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground flex items-center gap-1">
              <CameraIcon className="w-3 h-3" /> Cameras
            </p>
            <div className="flex flex-wrap gap-1.5">
              {cameras.slice(0, 3).map((camId: string) => (
                <Badge
                  key={camId}
                  className="bg-primary/10 text-primary border-primary/20 rounded-lg text-[10px] px-2 py-0.5 font-medium"
                >
                  📸 {getCameraLabel(camId)}
                </Badge>
              ))}
              {cameras.length > 3 && (
                <Badge className="bg-background/50 text-muted-foreground border border-border/30 text-[10px]">
                  +{cameras.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* ⭐ GIMBALS */}
        {gimbals.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground flex items-center gap-1">
              <VideoIcon className="w-3 h-3" /> Gimbals
            </p>
            <div className="flex flex-wrap gap-1.5">
              {gimbals.slice(0, 3).map((gimId: string) => (
                <Badge
                  key={gimId}
                  className="bg-primary/10 text-primary border-primary/20 rounded-lg text-[10px] px-2 py-0.5 font-medium"
                >
                  🎬 {getGimbalLabel(gimId)}
                </Badge>
              ))}
              {gimbals.length > 3 && (
                <Badge className="bg-background/50 text-muted-foreground border border-border/30 text-[10px]">
                  +{gimbals.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Rate + Social + Send Request */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-border/20">
          <div>
            <p className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground">Rate</p>
            <p className="font-headline font-bold text-primary">
              Rs. {primaryRate?.amount?.toLocaleString() || '—'}
              <span className="text-xs text-muted-foreground">
                /{primaryRate?.unit === 'per_hour' ? 'hr' : primaryRate?.unit === 'per_day' ? 'day' : primaryRate?.unit === 'per_project' ? 'project' : 'event'}
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
          </div>
        </div>

        {/* Send Request */}
        {canSave && (
          <Button
            className="w-full rounded-xl h-11 font-bold gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 group/btn"
            onClick={onSendRequest}
          >
            <Send className="w-4 h-4 group-hover/btn:translate-x-0.5 transition-transform" />
            Send Request
          </Button>
        )}

      </CardContent>
    </Card>
  );
}