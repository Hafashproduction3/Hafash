"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useUser, useFirestore, useCollection } from "@/firebase";
import {
  collection,
  query,
  where,
  deleteDoc,
  doc,
  getDoc,
} from "firebase/firestore";
import {
  Home,
  Plus,
  Eye,
  Star,
  MapPin,
  Edit,
  Trash2,
  ArrowRight,
  Sparkles,
  Camera,
  BadgeCheck,
  Clock,
  DollarSign,
  Loader2,
  AlertCircle,
  LayoutGrid,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { getCategoryInfo, formatTime12h } from "@/lib/locations";
import { cn } from "@/lib/utils";

export default function LocationDashboardLocationsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const locationsQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, "shootLocations"),
      where("ownerId", "==", user.uid)
    );
  }, [firestore, user?.uid]);
  const { data: locations, loading } = useCollection(locationsQuery);

  const sortedLocations = useMemo(() => {
    if (!locations) return [];
    return [...locations].sort((a: any, b: any) => {
      const aT = a.createdAt?.seconds || 0;
      const bT = b.createdAt?.seconds || 0;
      return bT - aT;
    });
  }, [locations]);

  // ═══════════════════════════════════════════════════════════════
  // DELETE — Firestore doc + R2 photos
  // ═══════════════════════════════════════════════════════════════
  const handleDelete = async (locationId: string, name: string) => {
    if (!firestore) return;
    if (!confirm(`"${name}" delete karein? Yeh action undo nahi ho sakti.`)) return;

    setDeletingId(locationId);
    try {
      // ─── Step 1: Location doc fetch karein (photos nikalne ke liye) ───
      const locationRef = doc(firestore, "shootLocations", locationId);
      const locationSnap = await getDoc(locationRef);

      if (locationSnap.exists()) {
        const locationData = locationSnap.data();
        const photos = locationData.photos || [];

        // ─── Step 2: R2 se photos delete karein (agar storageKey hai) ───
        if (photos.length > 0) {
          const keys = photos
            .map((p: any) => p.storageKey)
            .filter((k: string) => k && k.trim());

          if (keys.length > 0) {
            try {
              const response = await fetch("/api/delete-photos", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ keys }),
              });

              if (!response.ok) {
                console.warn("R2 delete failed, but continuing with Firestore...");
              }
            } catch (r2Err) {
              console.warn("R2 delete error:", r2Err);
              // R2 fail ho to bhi Firestore doc delete karein
            }
          }
        }
      }

      // ─── Step 3: Firestore doc delete karein ───
      await deleteDoc(doc(firestore, "shootLocations", locationId));

      toast({
        title: "✅ Location deleted",
        description: `"${name}" aur uski photos remove ho gayi.`,
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: err.message,
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-700">
      {/* ═══ HEADER ═══ */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 border-b border-border/30 pb-8">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5">
            <Home className="w-3.5 h-3.5 text-primary" />
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">
              My Locations
            </span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-headline font-bold tracking-tight">
            Manage <span className="text-primary italic">Locations</span>
          </h1>
          <p className="text-sm text-muted-foreground max-w-xl">
            Apni saari shoot locations ek jagah manage karein.
          </p>
        </div>

        <Link href="/locations/join">
          <Button className="rounded-2xl h-12 px-6 bg-primary text-primary-foreground hover:bg-primary/90 font-bold gap-2 shadow-xl">
            <Plus className="w-4 h-4" />
            Add New Location
          </Button>
        </Link>
      </div>

      {/* ═══ LIST ═══ */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 rounded-2xl bg-card/20" />
          ))}
        </div>
      ) : sortedLocations.length === 0 ? (
        <Card className="bg-card/40 border-border/40 rounded-[2rem] border-dashed">
          <CardContent className="p-16 text-center">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
              <Home className="w-10 h-10 text-primary/50" />
            </div>
            <h2 className="text-2xl font-headline font-bold mb-2">Koi location nahi</h2>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
              Apni pehli location add karein aur photographers ko apni jagah dikhayein.
            </p>
            <Link href="/locations/join">
              <Button className="rounded-xl gap-2 bg-primary text-primary-foreground font-bold h-12 px-6">
                <Plus className="w-4 h-4" />
                Add Your First Location
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {sortedLocations.map((location: any) => (
            <LocationManageCard
              key={location.id}
              location={location}
              onDelete={() => handleDelete(location.id, location.name)}
              deleting={deletingId === location.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// LOCATION MANAGE CARD
// ═══════════════════════════════════════════════════════════════

function LocationManageCard({
  location,
  onDelete,
  deleting,
}: {
  location: any;
  onDelete: () => void;
  deleting: boolean;
}) {
  const cover = location.photos?.[0]?.url;
  const categoryInfo = getCategoryInfo(location.category);
  const rating = location.rating || { average: 0, count: 0 };
  const isVerified = location.isVerified === true;

  return (
    <Card className="bg-card/60 border-border/40 rounded-2xl overflow-hidden hover:border-primary/40 transition-all group">
      <CardContent className="p-0">
        <div className="flex gap-4">
          {/* Cover Photo */}
          <div className="w-32 h-32 lg:w-40 lg:h-40 relative shrink-0 bg-muted overflow-hidden">
            {cover ? (
              <img
                src={cover}
                alt={location.name}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-primary/5">
                <Camera className="w-8 h-8 text-primary/30" />
              </div>
            )}
            {isVerified && (
              <div className="absolute top-2 left-2">
                <Badge className="bg-green-500/90 text-white text-[8px] font-bold uppercase tracking-widest border-0 gap-1 px-1.5 py-0.5">
                  <BadgeCheck className="w-2.5 h-2.5" />
                  Verified
                </Badge>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 p-4 min-w-0 flex flex-col">
            <div className="flex-1 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-headline font-bold text-base truncate">
                  {location.name}
                </h3>
                <Badge
                  className={cn(
                    "text-[9px] font-bold uppercase tracking-widest shrink-0",
                    location.isActive
                      ? "bg-green-500/20 text-green-400 border-green-500/30"
                      : "bg-muted text-muted-foreground border-border/30"
                  )}
                >
                  {location.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                {categoryInfo && (
                  <span className="flex items-center gap-1">
                    <span>{categoryInfo.emoji}</span>
                    <span>{categoryInfo.label}</span>
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <MapPin className="w-2.5 h-2.5" />
                  {location.city}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <DollarSign className="w-2.5 h-2.5 text-primary" />
                  Rs. {location.hourlyRate?.toLocaleString()}/hr
                </span>
                {location.viewCount > 0 && (
                  <span className="flex items-center gap-1">
                    <Eye className="w-2.5 h-2.5" />
                    {location.viewCount}
                  </span>
                )}
                {rating.count > 0 && (
                  <span className="flex items-center gap-1">
                    <Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />
                    {rating.average.toFixed(1)}
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-3 mt-3 border-t border-border/30">
              <Link href={`/locations/${location.id}`} className="flex-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-full rounded-lg gap-1 text-[10px] font-bold uppercase tracking-widest h-8"
                >
                  <Eye className="w-3 h-3" />
                  View
                </Button>
              </Link>

              {/* ✅ EDIT — ab dedicated edit page pe jayega */}
              <Link
                href={`/location-dashboard/locations/${location.id}/edit`}
                className="flex-1"
              >
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-full rounded-lg gap-1 text-[10px] font-bold uppercase tracking-widest h-8 text-primary hover:bg-primary/10"
                >
                  <Edit className="w-3 h-3" />
                  Edit
                </Button>
              </Link>

              <Button
                size="sm"
                variant="ghost"
                onClick={onDelete}
                disabled={deleting}
                className="rounded-lg gap-1 text-[10px] font-bold uppercase tracking-widest h-8 text-destructive hover:bg-destructive/10 px-3"
              >
                {deleting ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Trash2 className="w-3 h-3" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}