"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useUser, useFirestore } from "@/firebase";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import {
  Home, MapPin, DollarSign, Camera, Loader2, Save,
  ArrowLeft, X, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { value: "villa", label: "Villa", emoji: "🏡" },
  { value: "studio", label: "Studio", emoji: "🎬" },
  { value: "garden", label: "Garden", emoji: "🌳" },
  { value: "rooftop", label: "Rooftop", emoji: "🌃" },
  { value: "farmhouse", label: "Farmhouse", emoji: "🏞️" },
  { value: "hall", label: "Hall", emoji: "🏛️" },
  { value: "restaurant", label: "Restaurant", emoji: "🍽️" },
  { value: "other", label: "Other", emoji: "📍" },
];

export default function EditLocationPage() {
  const params = useParams();
  const locationId = params.id as string;
  const router = useRouter();
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("villa");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [hourlyRate, setHourlyRate] = useState(0);
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<any[]>([]);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    const loadLocation = async () => {
      if (!firestore || !locationId) return;

      try {
        const snap = await getDoc(doc(firestore, "shootLocations", locationId));

        if (!snap.exists()) {
          toast({ variant: "destructive", title: "Location not found" });
          router.push("/location-dashboard/locations");
          return;
        }

        const data = snap.data();

        if (data.ownerId !== user?.uid) {
          toast({
            variant: "destructive",
            title: "Access denied",
            description: "Yeh aapki location nahi hai.",
          });
          router.push("/location-dashboard/locations");
          return;
        }

        setName(data.name || "");
        setCategory(data.category || "villa");
        setCity(data.city || "");
        setAddress(data.address || "");
        setHourlyRate(data.hourlyRate || 0);
        setDescription(data.description || "");
        setPhotos(data.photos || []);
        setIsActive(data.isActive !== false);
      } catch (err: any) {
        toast({
          variant: "destructive",
          title: "Load failed",
          description: err.message,
        });
      } finally {
        setLoading(false);
      }
    };

    loadLocation();
  }, [firestore, locationId, user?.uid, router, toast]);

  const handleSave = async () => {
    if (!firestore || !locationId) return;

    if (!name.trim()) {
      toast({ variant: "destructive", title: "Location name required" });
      return;
    }
    if (!city.trim()) {
      toast({ variant: "destructive", title: "City required" });
      return;
    }
    if (hourlyRate <= 0) {
      toast({ variant: "destructive", title: "Valid hourly rate dein" });
      return;
    }

    setSaving(true);
    try {
      await updateDoc(doc(firestore, "shootLocations", locationId), {
        name: name.trim(),
        category,
        city: city.trim(),
        address: address.trim(),
        hourlyRate,
        description: description.trim(),
        photos,
        isActive,
        updatedAt: new Date().toISOString(),
      });

      toast({
        title: "✅ Location updated",
        description: "Changes save ho gaye.",
      });

      router.push("/location-dashboard/locations");
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Save failed",
        description: err.message,
      });
    } finally {
      setSaving(false);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/location-dashboard/locations">
          <Button variant="ghost" size="icon" className="rounded-xl">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl lg:text-3xl font-headline font-bold">
            Edit <span className="text-primary italic">Location</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Location details update karein
          </p>
        </div>
      </div>

      <Card className="bg-card/40 border-border/40 rounded-[2rem]">
        <CardContent className="p-6 lg:p-8 space-y-6">

          {/* Name */}
          <div className="space-y-2">
            <Label className="text-[11px] font-bold uppercase tracking-widest text-primary">
              Location Name *
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="E.g., Noori House"
              className="h-12 rounded-xl bg-background/50"
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label className="text-[11px] font-bold uppercase tracking-widest text-primary">
              Category
            </Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategory(cat.value)}
                  className={cn(
                    "p-3 rounded-xl border-2 transition-all text-center",
                    category === cat.value
                      ? "border-primary bg-primary/10"
                      : "border-border/30 hover:border-primary/50"
                  )}
                >
                  <div className="text-2xl mb-1">{cat.emoji}</div>
                  <div className="text-[11px] font-bold">{cat.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* City + Rate */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label className="text-[11px] font-bold uppercase tracking-widest text-primary">
                City *
              </Label>
              <Input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Karachi"
                className="h-12 rounded-xl bg-background/50"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[11px] font-bold uppercase tracking-widest text-primary">
                Hourly Rate (Rs.) *
              </Label>
              <Input
                type="number"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(parseInt(e.target.value) || 0)}
                placeholder="5000"
                className="h-12 rounded-xl bg-background/50"
              />
            </div>
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label className="text-[11px] font-bold uppercase tracking-widest text-primary">
              Address
            </Label>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="DHA Phase 5, Street 12"
              className="h-12 rounded-xl bg-background/50"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label className="text-[11px] font-bold uppercase tracking-widest text-primary">
              Description
            </Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Location ke baare mein likhein..."
              rows={4}
              className="rounded-xl bg-background/50 resize-none"
            />
          </div>

          {/* Photos */}
          <div className="space-y-3">
            <Label className="text-[11px] font-bold uppercase tracking-widest text-primary">
              Photos ({photos.length})
            </Label>

            {photos.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {photos.map((photo, index) => (
                  <div
                    key={index}
                    className="relative aspect-square rounded-xl overflow-hidden bg-muted group"
                  >
                    <img
                      src={photo.thumbUrl || photo.url}
                      alt={`Photo ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 rounded-xl border-2 border-dashed border-border/30 text-center">
                <Camera className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Koi photo nahi</p>
              </div>
            )}

            <p className="text-[10px] text-muted-foreground italic">
              ⚠️ Naye photos upload karne ke liye "Add New Location" page use karein (abhi ke liye).
            </p>
          </div>

          {/* Active Toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-background/40 border border-border/30">
            <div>
              <p className="font-bold text-sm">Listing Active</p>
              <p className="text-[11px] text-muted-foreground">
                Inactive karne se photographers ko nahi dikhegi
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className={cn(
                "w-12 h-6 rounded-full transition-colors relative",
                isActive ? "bg-green-500" : "bg-muted"
              )}
            >
              <div
                className={cn(
                  "w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform",
                  isActive ? "translate-x-6" : "translate-x-0.5"
                )}
              />
            </button>
          </div>

          {/* Save Button */}
          <div className="flex gap-3 pt-4 border-t border-border/30">
            <Link href="/location-dashboard/locations" className="flex-1">
              <Button
                variant="outline"
                className="w-full h-12 rounded-xl font-bold"
              >
                Cancel
              </Button>
            </Link>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 h-12 rounded-xl bg-primary text-primary-foreground font-bold gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}