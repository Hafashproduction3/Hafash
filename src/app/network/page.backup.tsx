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
import { searchEquipment, type EquipmentItem } from '@/lib/equipment';
import {
  Search,
  Camera,
  Video,
  Plane,
  MapPin,
  Heart,
  X,
  Instagram,
  ImageIcon,
  Users,
} from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

type Role = 'photographer' | 'videographer' | 'drone_operator';

const ROLE_FILTERS: { id: Role; label: string; icon: React.ReactNode }[] = [
  {
    id: 'photographer',
    label: 'Photographer',
    icon: <Camera className="w-4 h-4" />,
  },
  {
    id: 'videographer',
    label: 'Videographer',
    icon: <Video className="w-4 h-4" />,
  },
  {
    id: 'drone_operator',
    label: 'Drone Operator',
    icon: <Plane className="w-4 h-4" />,
  },
];

export default function NetworkSearchPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  const [roleFilter, setRoleFilter] = useState<Role | null>(null);
  const [locationQuery, setLocationQuery] = useState('');
  const [equipmentQuery, setEquipmentQuery] = useState('');
  const [equipmentFilters, setEquipmentFilters] = useState<EquipmentItem[]>([]);
  const [dateFilter, setDateFilter] = useState<Date | undefined>();

  // Current user's saved/favorite network profiles
  const myProfileRef = useMemo(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user?.uid]);

  const { data: myProfile } = useDoc(myProfileRef);
  const savedIds: string[] = myProfile?.savedNetworkProfiles || [];

  // All active network profiles
  const profilesQuery = useMemo(() => {
    if (!firestore) return null;

    return query(
      collection(firestore, 'networkProfiles'),
      where('isActive', '==', true)
    );
  }, [firestore]);

  const { data: profiles, loading } = useCollection(profilesQuery);

  // Convert selected calendar date to the same YYYY-MM-DD
  // format used by networkProfiles.availability
  const dateFilterKey = dateFilter
    ? dateFilter.toISOString().split('T')[0]
    : '';

  const equipmentResults = useMemo(() => {
    if (!equipmentQuery.trim()) return [];

    return searchEquipment(equipmentQuery)
      .filter(
        (item) => !equipmentFilters.some((sel) => sel.id === item.id)
      )
      .slice(0, 6);
  }, [equipmentQuery, equipmentFilters]);

  const addEquipmentFilter = useCallback((item: EquipmentItem) => {
    setEquipmentFilters((prev) => [...prev, item]);
    setEquipmentQuery('');
  }, []);

  const removeEquipmentFilter = useCallback((id: string) => {
    setEquipmentFilters((prev) =>
      prev.filter((item) => item.id !== id)
    );
  }, []);

  const filteredProfiles = useMemo(() => {
    if (!profiles) return [];

    return profiles.filter((p: any) => {
      // Never show the current user's own profile
      if (user && p.userId === user.uid) return false;

      // Role filter
      if (roleFilter && !(p.roles || []).includes(roleFilter)) {
        return false;
      }

      // Location filter
      if (locationQuery.trim()) {
        const loc = (p.baseLocation || '').toLowerCase();

        if (!loc.includes(locationQuery.trim().toLowerCase())) {
          return false;
        }
      }

      // Equipment filter - profile must have ALL selected equipment
      if (equipmentFilters.length > 0) {
        const profileEquipmentNames = (p.equipment || []).map(
          (e: any) => e.name
        );

        const hasAll = equipmentFilters.every((filter) =>
          profileEquipmentNames.includes(filter.name)
        );

        if (!hasAll) return false;
      }

      // Date availability filter
      // Available + Partial are shown.
      // Busy + Not Set are hidden.
      if (dateFilterKey) {
        const status = p.availability?.[dateFilterKey];

        if (status !== 'available' && status !== 'partial') {
          return false;
        }
      }

      return true;
    });
  }, [
    profiles,
    roleFilter,
    locationQuery,
    equipmentFilters,
    user,
    dateFilterKey,
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

  return (
    <div className="min-h-screen bg-background p-6 lg:p-12 animate-in fade-in duration-500">
      <div className="max-w-6xl mx-auto space-y-10">

        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-primary" />
            <h1 className="text-4xl font-headline font-bold">
              Hafash Network
            </h1>
          </div>

          <p className="text-muted-foreground">
            Find a second shooter, videographer, or drone operator for your event.
          </p>
        </div>

        {/* Filters */}
        <Card className="bg-card border-border/50 rounded-3xl overflow-hidden">
          <CardContent className="p-6 space-y-6">

            {/* Role filters */}
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setRoleFilter(null)}
                className={`px-5 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${
                  roleFilter === null
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border/30 text-muted-foreground'
                }`}
              >
                All
              </button>

              {ROLE_FILTERS.map((role) => (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => setRoleFilter(role.id)}
                  className={`px-5 py-2.5 rounded-xl text-sm font-bold border-2 flex items-center gap-2 transition-all ${
                    roleFilter === role.id
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border/30 text-muted-foreground'
                  }`}
                >
                  {role.icon}
                  {role.label}
                </button>
              ))}
            </div>

            {/* Location + Equipment */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Location */}
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />

                <Input
                  placeholder="Search by city or area (e.g. Karachi, DHA)"
                  className="pl-12 h-12 rounded-xl"
                  value={locationQuery}
                  onChange={(e) => setLocationQuery(e.target.value)}
                />
              </div>

              {/* Equipment */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />

                <Input
                  placeholder="Filter by camera/gear (e.g. Nikon Z6 II)"
                  className="pl-12 h-12 rounded-xl"
                  value={equipmentQuery}
                  onChange={(e) => setEquipmentQuery(e.target.value)}
                />

                {equipmentQuery.trim() && (
                  <div className="absolute z-10 mt-2 w-full bg-card border border-border/30 rounded-xl overflow-hidden shadow-xl">

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

            {/* Equipment selected */}
            {equipmentFilters.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {equipmentFilters.map((item) => (
                  <Badge
                    key={item.id}
                    className="bg-primary/10 text-primary border border-primary/20 rounded-lg px-3 py-1.5 gap-2 text-xs font-bold"
                  >
                    {item.name}

                    <button
                      type="button"
                      onClick={() => removeEquipmentFilter(item.id)}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            {/* Date Filter */}
            <div className="space-y-3 pt-2 border-t border-border/20">

              <div>
                <p className="text-sm font-bold">Availability Date</p>
                <p className="text-xs text-muted-foreground">
                  Find professionals available for your event date.
                </p>
              </div>

              <div className="flex flex-col lg:flex-row lg:items-start gap-4">

                <Calendar
                  mode="single"
                  selected={dateFilter}
                  onSelect={setDateFilter}
                  className="rounded-xl border border-border/30 bg-background/30"
                />

                {dateFilter && (
                  <div className="flex flex-col gap-3 pt-2">
                    <span className="text-sm font-medium text-muted-foreground">
                      Selected: {dateFilter.toLocaleDateString()}
                    </span>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setDateFilter(undefined)}
                      className="rounded-xl"
                    >
                      Clear Date
                    </Button>
                  </div>
                )}

              </div>
            </div>

          </CardContent>
        </Card>

        {/* Results */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Skeleton
                key={i}
                className="h-72 rounded-3xl bg-card/20"
              />
            ))}
          </div>
        ) : filteredProfiles.length === 0 ? (
          <div className="text-center py-32 border-2 border-dashed border-white/5 rounded-[3rem]">
            <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-6" />

            <h3 className="text-xl font-headline font-bold mb-2">
              No professionals found
            </h3>

            <p className="text-muted-foreground text-sm">
              Try adjusting your filters, or check back later as more photographers join.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProfiles.map((profile: any) => (
              <ProfessionalCard
                key={profile.userId}
                profile={profile}
                isSaved={savedIds.includes(profile.userId)}
                onToggleSave={() =>
                  toggleSave(
                    profile.userId,
                    savedIds.includes(profile.userId)
                  )
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

  const roleLabels: Record<string, string> = {
    photographer: 'Photographer',
    videographer: 'Videographer',
    drone_operator: 'Drone Operator',
  };

  return (
    <Card className="bg-card border-border/50 rounded-3xl overflow-hidden hover:border-primary/40 transition-all">
      <CardContent className="p-6 space-y-4">

        {/* Name + Save */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-headline font-bold text-lg">
              {displayName}
            </h3>

            <div className="flex flex-wrap gap-1.5 mt-2">
              {(profile.roles || []).map((role: string) => (
                <Badge
                  key={role}
                  variant="outline"
                  className="text-[9px] uppercase font-bold border-primary/20 text-primary bg-primary/5"
                >
                  {roleLabels[role] || role}
                </Badge>
              ))}
            </div>
          </div>

          {canSave && (
            <button
              type="button"
              onClick={onToggleSave}
              className="shrink-0"
            >
              <Heart
                className={`w-5 h-5 ${
                  isSaved
                    ? 'fill-red-400 text-red-400'
                    : 'text-muted-foreground'
                }`}
              />
            </button>
          )}
        </div>

        {/* Location */}
        {profile.baseLocation && (
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5" />
            {profile.baseLocation}
          </p>
        )}

        {/* Bio */}
        {profile.bio && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {profile.bio}
          </p>
        )}

        {/* Equipment */}
        {(profile.equipment || []).length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {profile.equipment.slice(0, 3).map((eq: any) => (
              <Badge
                key={eq.id}
                className="bg-background/50 text-muted-foreground border border-border/30 text-[10px]"
              >
                {eq.name}
              </Badge>
            ))}

            {profile.equipment.length > 3 && (
              <Badge
                className="bg-background/50 text-muted-foreground border border-border/30 text-[10px]"
              >
                +{profile.equipment.length - 3} more
              </Badge>
            )}
          </div>
        )}

        {/* Rate + Portfolio */}
        <div className="flex items-center justify-between pt-3 border-t border-border/20">

          <div>
            <p className="text-[10px] uppercase font-bold text-muted-foreground">
              Rate
            </p>

            <p className="font-headline font-bold text-primary">
              Rs. {profile.rate?.amount?.toLocaleString() || '—'}

              <span className="text-xs text-muted-foreground">
                /{profile.rate?.unit === 'per_hour' ? 'hr' : 'event'}
              </span>
            </p>
          </div>

          {profile.portfolioType === 'instagram_link' &&
            profile.instagramLink && (
              <a
                href={profile.instagramLink}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Instagram className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" />
              </a>
            )}

          {profile.portfolioType === 'hafash_gallery' && (
            <ImageIcon className="w-5 h-5 text-primary" />
          )}

        </div>

      </CardContent>
    </Card>
  );
}