"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser, useFirestore, useCollection } from "@/firebase";
import {
  collection,
  query,
  where,
} from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Search,
  MapPin,
  Star,
  DollarSign,
  Sliders,
  ChevronDown,
  Sparkles,
  Plus,
  ArrowRight,
  X,
  Check,
  Camera,
  Clock,
  Users,
  TrendingUp,
  Building2,
  Eye,
} from "lucide-react";
import {
  LOCATION_CATEGORIES,
  getCategoryInfo,
  formatTime12h,
  type LocationCategory,
} from "@/lib/locations";

type SortOption = 'newest' | 'lowest_price' | 'highest_price' | 'top_rated';

const SORT_OPTIONS: { id: SortOption; label: string }[] = [
  { id: 'newest', label: 'Newest' },
  { id: 'lowest_price', label: 'Lowest Price' },
  { id: 'highest_price', label: 'Highest Price' },
  { id: 'top_rated', label: 'Top Rated' },
];

export default function LocationsListingPage() {
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  // ─── Filters ───
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<LocationCategory | null>(null);
  const [cityFilter, setCityFilter] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [showAdvanced, setShowAdvanced] = useState(false);

  // ─── Data ───
  const locationsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, "shootLocations"),
      where("isActive", "==", true)
    );
  }, [firestore]);

  const { data: locations, loading } = useCollection(locationsQuery);

  // ─── Filtering & Sorting ───
  const filteredLocations = useMemo(() => {
    if (!locations) return [];

    const q = searchQuery.trim().toLowerCase();
    const cityQ = cityFilter.trim().toLowerCase();

    const filtered = locations.filter((loc: any) => {
      // Search (name + area + city + description)
      if (q) {
        const haystack = [
          loc.name,
          loc.area,
          loc.city,
          loc.description,
          loc.ownerName,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      // Category
      if (categoryFilter && loc.category !== categoryFilter) return false;

      // City
      if (cityQ) {
        const locCity = (loc.city || "").toLowerCase();
        const locArea = (loc.area || "").toLowerCase();
        if (!locCity.includes(cityQ) && !locArea.includes(cityQ)) return false;
      }

      // Budget
      const rate = loc.hourlyRate || 0;
      if (budgetMin && rate < Number(budgetMin)) return false;
      if (budgetMax && rate > Number(budgetMax)) return false;

      return true;
    });

    // Sort
    return [...filtered].sort((a: any, b: any) => {
      const aRate = a.hourlyRate || 0;
      const bRate = b.hourlyRate || 0;
      const aRating = a.rating?.average || 0;
      const bRating = b.rating?.average || 0;
      const aCreated = a.createdAt?.seconds || 0;
      const bCreated = b.createdAt?.seconds || 0;

      switch (sortBy) {
        case 'lowest_price':
          return aRate - bRate;
        case 'highest_price':
          return bRate - aRate;
        case 'top_rated':
          return bRating - aRating;
        case 'newest':
        default:
          return bCreated - aCreated;
      }
    });
  }, [locations, searchQuery, categoryFilter, cityFilter, budgetMin, budgetMax, sortBy]);

  const hasActiveFilters =
    !!searchQuery.trim() ||
    !!categoryFilter ||
    !!cityFilter.trim() ||
    !!budgetMin ||
    !!budgetMax;

  const clearAllFilters = useCallback(() => {
    setSearchQuery("");
    setCategoryFilter(null);
    setCityFilter("");
    setBudgetMin("");
    setBudgetMax("");
    setSortBy("newest");
  }, []);

  const totalLocations = locations?.length || 0;

  return (
    <div className="min-h-screen bg-background p-5 lg:p-10 animate-in fade-in duration-500">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ═══ HEADER ═══ */}
        <div className="relative overflow-hidden rounded-[2rem] border border-border/40 bg-gradient-to-br from-primary/10 via-card/60 to-background px-6 py-6 lg:px-8 lg:py-8 shadow-sm">
          <div className="absolute -top-24 -right-24 h-56 w-56 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-primary/5 blur-3xl pointer-events-none" />

          <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5">
                <Camera className="w-3.5 h-3.5 text-primary" />
                <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary">
                  Shoot Locations
                </span>
              </div>
              <h1 className="text-3xl lg:text-4xl font-headline font-bold tracking-tight">
                Perfect <span className="text-primary italic">Location</span> Dhundein
              </h1>
              <p className="text-sm text-muted-foreground max-w-xl">
                Outdoor, indoor, studio, villa, hotel, beach — Pakistan bhar ke best shoot locations.
              </p>

              <div className="flex items-center gap-3 pt-2">
                <Badge className="rounded-lg bg-primary/15 text-primary border border-primary/30 gap-1.5 px-3 py-1 text-xs font-bold">
                  <Building2 className="w-3 h-3" />
                  {totalLocations} {totalLocations === 1 ? "Location" : "Locations"}
                </Badge>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              {user && (
                <Link href="/locations/join">
                  <Button className="rounded-2xl h-12 px-6 bg-gradient-to-br from-primary via-primary to-primary/90 text-primary-foreground font-bold gap-2.5 shadow-lg shadow-primary/25 hover:-translate-y-0.5 transition-all">
                    <Plus className="w-4 h-4" />
                    <span className="text-[13px]">List Your Location</span>
                  </Button>
                </Link>
              )}

              <Button
                variant="outline"
                className="rounded-2xl h-12 px-6 border-border/40 hover:border-primary/40"
                onClick={() => router.push("/network/hub")}
              >
                <ArrowRight className="w-4 h-4 rotate-180" />
                <span className="text-sm font-bold">Hub</span>
              </Button>
            </div>
          </div>
        </div>

        {/* ═══ FILTERS ═══ */}
        <Card className="bg-card/80 border-border/40 rounded-[2rem] overflow-hidden shadow-sm">
          <CardContent className="p-6 lg:p-7 space-y-5">

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, area, city..."
                className="pl-12 h-12 rounded-xl bg-background/60 border-border/40"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Category Chips */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Category
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setCategoryFilter(null)}
                  className={cn(
                    "px-3 py-2 rounded-xl text-xs font-bold border-2 transition-all",
                    categoryFilter === null
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border/30 text-muted-foreground hover:border-primary/30"
                  )}
                >
                  All
                </button>
                {LOCATION_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoryFilter(cat.id)}
                    className={cn(
                      "px-3 py-2 rounded-xl text-xs font-bold border-2 transition-all flex items-center gap-1.5",
                      categoryFilter === cat.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/30 text-muted-foreground hover:border-primary/30"
                    )}
                  >
                    <span>{cat.emoji}</span>
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Advanced toggle */}
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-xs font-bold text-primary hover:underline pt-2 border-t border-border/20 w-full"
            >
              <Sliders className="w-3.5 h-3.5" />
              {showAdvanced ? "Hide" : "Show"} advanced filters
              <ChevronDown
                className={cn(
                  "w-3.5 h-3.5 ml-auto transition-transform",
                  showAdvanced && "rotate-180"
                )}
              />
            </button>

            {showAdvanced && (
              <div className="space-y-5 animate-in fade-in slide-in-from-top-2 duration-300 pt-3">

                {/* City */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 text-primary" />
                    City
                  </label>
                  <Input
                    placeholder="e.g. Karachi, Lahore, Islamabad"
                    className="h-11 rounded-xl"
                    value={cityFilter}
                    onChange={(e) => setCityFilter(e.target.value)}
                  />
                </div>

                {/* Budget */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                    <DollarSign className="w-3 h-3 text-primary" />
                    Hourly Rate Range (Rs.)
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      type="number"
                      placeholder="Min (e.g. 2000)"
                      className="h-11 rounded-xl"
                      value={budgetMin}
                      onChange={(e) => setBudgetMin(e.target.value)}
                    />
                    <Input
                      type="number"
                      placeholder="Max (e.g. 20000)"
                      className="h-11 rounded-xl"
                      value={budgetMax}
                      onChange={(e) => setBudgetMax(e.target.value)}
                    />
                  </div>
                </div>

                {/* Sort */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                    <TrendingUp className="w-3 h-3 text-primary" />
                    Sort By
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {SORT_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setSortBy(opt.id)}
                        className={cn(
                          "px-3 py-2.5 rounded-xl text-[11px] font-bold border-2 transition-all",
                          sortBy === opt.id
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border/30 text-muted-foreground hover:border-primary/30"
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

        {/* ═══ RESULTS COUNT ═══ */}
        {!loading && (
          <div className="flex items-center justify-between gap-3 px-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold">
                {filteredLocations.length}{" "}
                {filteredLocations.length === 1 ? "location" : "locations"} mile
              </span>
              {categoryFilter && (
                <Badge className="rounded-lg bg-primary/15 text-primary border-primary/30 text-[10px] font-bold uppercase tracking-widest gap-1">
                  {getCategoryInfo(categoryFilter)?.emoji} {getCategoryInfo(categoryFilter)?.label}
                </Badge>
              )}
              {cityFilter.trim() && (
                <Badge className="rounded-lg bg-background border border-border/40 text-[10px] font-bold uppercase tracking-widest gap-1">
                  <MapPin className="w-2.5 h-2.5" /> {cityFilter}
                </Badge>
              )}
            </div>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-destructive gap-1"
                onClick={clearAllFilters}
              >
                <X className="w-3 h-3" /> Clear
              </Button>
            )}
          </div>
        )}

        {/* ═══ RESULTS ═══ */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-96 rounded-3xl bg-card/20" />
            ))}
          </div>
        ) : filteredLocations.length === 0 ? (
          <div className="text-center py-24 border-2 border-dashed border-border/40 rounded-[2rem] bg-card/30">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
              <Camera className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-xl font-headline font-bold mb-2">
              {hasActiveFilters ? "Koi location nahi mili" : "Abhi koi location nahi hai"}
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-5">
              {hasActiveFilters
                ? "Filters change karein ya clear kar dein."
                : "Pehli shoot location list karne ke liye neeche button dabayein."}
            </p>
            {hasActiveFilters ? (
              <Button
                variant="outline"
                className="rounded-xl gap-2"
                onClick={clearAllFilters}
              >
                <X className="w-4 h-4" />
                Clear Filters
              </Button>
            ) : (
              <Link href="/locations/join">
                <Button className="rounded-xl gap-2 bg-primary text-primary-foreground font-bold">
                  <Plus className="w-4 h-4" />
                  List Your Location
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredLocations.map((location: any) => (
              <LocationCard key={location.id} location={location} />
            ))}
          </div>
        )}

      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Location Card
// ─────────────────────────────────────────────────────────────

function LocationCard({ location }: { location: any }) {
  const photos = location.photos || [];
  const coverPhoto = photos[0]?.url;
  const rating = location.rating || { average: 0, count: 0 };
  const categoryInfo = getCategoryInfo(location.category);

  return (
    <Link href={`/locations/${location.id}`}>
      <Card className="group relative bg-card/80 border-border/40 rounded-[2rem] overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-1.5 hover:border-primary/40 transition-all duration-500 cursor-pointer h-full">

        {/* Cover Photo */}
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          {coverPhoto ? (
            <img
              src={coverPhoto}
              alt={location.name}
              className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-background">
              <Camera className="w-12 h-12 text-primary/30" />
            </div>
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          {/* Category Badge — top left */}
          {categoryInfo && (
            <div className="absolute top-4 left-4">
              <Badge className="rounded-lg bg-black/60 backdrop-blur-md text-white border border-white/20 gap-1.5 px-3 py-1 text-[10px] font-bold uppercase tracking-widest">
                <span>{categoryInfo.emoji}</span>
                {categoryInfo.label}
              </Badge>
            </div>
          )}

          {/* Rating — top right */}
          {rating.count > 0 && (
            <div className="absolute top-4 right-4">
              <Badge className="rounded-lg bg-black/60 backdrop-blur-md text-white border border-white/20 gap-1 px-2.5 py-1 text-[11px] font-bold">
                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                {rating.average.toFixed(1)}
              </Badge>
            </div>
          )}

          {/* Photos count */}
          {photos.length > 1 && (
            <div className="absolute bottom-4 right-4">
              <Badge className="rounded-lg bg-black/60 backdrop-blur-md text-white border border-white/20 gap-1 px-2 py-0.5 text-[10px] font-bold">
                <Camera className="w-2.5 h-2.5" />
                {photos.length}
              </Badge>
            </div>
          )}

          {/* Name + City — bottom */}
          <div className="absolute bottom-4 left-4 right-4">
            <h3 className="text-2xl font-headline font-bold text-white tracking-tight line-clamp-1 drop-shadow-2xl">
              {location.name}
            </h3>
            <p className="text-white/80 text-xs font-medium flex items-center gap-1.5 mt-1">
              <MapPin className="w-3 h-3" />
              {location.area ? `${location.area}, ` : ""}{location.city}
            </p>
          </div>
        </div>

        {/* Content */}
        <CardContent className="p-5 space-y-4">

          {/* Rating + hours */}
          <div className="flex items-center justify-between gap-3 text-xs">
            {rating.count > 0 ? (
              <div className="flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                <span className="font-bold">{rating.average.toFixed(1)}</span>
                <span className="text-muted-foreground">({rating.count})</span>
              </div>
            ) : (
              <span className="text-muted-foreground text-[11px] italic">New</span>
            )}

            <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
              <Clock className="w-3 h-3" />
              {formatTime12h(location.openTime)} - {formatTime12h(location.closeTime)}
            </div>
          </div>

          {/* Description */}
          {location.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {location.description}
            </p>
          )}

          {/* Amenities preview */}
          {(location.amenities || []).length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {(location.amenities || []).slice(0, 3).map((aId: string) => {
                const a = getCategoryInfo(aId); // dummy - will use AMENITIES
                return null;
              })}
              {/* Simple amenity chips */}
              {(location.amenities || []).slice(0, 3).map((aId: string, idx: number) => (
                <Badge
                  key={idx}
                  className="bg-background/60 text-muted-foreground border-border/30 rounded-lg text-[10px] px-2 py-0.5 font-normal"
                >
                  {aId.replace(/_/g, " ")}
                </Badge>
              ))}
              {(location.amenities || []).length > 3 && (
                <Badge className="bg-background/50 text-muted-foreground border border-border/30 text-[10px] font-normal">
                  +{(location.amenities || []).length - 3} more
                </Badge>
              )}
            </div>
          )}

          {/* Footer: Price + View */}
          <div className="pt-4 border-t border-border/20 flex items-end justify-between gap-3">
            <div>
              <p className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground">
                Starting from
              </p>
              <p className="font-headline font-bold text-primary text-lg leading-tight">
                Rs. {location.hourlyRate?.toLocaleString() || "—"}
                <span className="text-xs text-muted-foreground font-medium"> / hr</span>
              </p>
            </div>

            <Button
              size="sm"
              variant="ghost"
              className="rounded-xl gap-1.5 text-primary hover:bg-primary/10 group-hover:bg-primary group-hover:text-primary-foreground transition-all"
            >
              View
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Button>
          </div>

        </CardContent>
      </Card>
    </Link>
  );
}