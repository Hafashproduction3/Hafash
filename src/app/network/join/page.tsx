"use client";

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc, useCollection } from '@/firebase';
import { doc, setDoc, serverTimestamp, collection, query, where } from 'firebase/firestore';
import { getUserPlan } from '@/lib/plans';
import { EQUIPMENT_CATALOG, EQUIPMENT_CATEGORY_LABELS, searchEquipment, type EquipmentItem } from '@/lib/equipment';
import {
  Camera,
  Video,
  Plane,
  X,
  Plus,
  Search,
  Loader2,
  Instagram,
  ImageIcon,
  ArrowLeft,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

type Role = 'photographer' | 'videographer' | 'drone_operator';

const ROLE_OPTIONS: { id: Role; label: string; icon: React.ReactNode }[] = [
  { id: 'photographer', label: 'Photographer', icon: <Camera className="w-5 h-5" /> },
  { id: 'videographer', label: 'Videographer', icon: <Video className="w-5 h-5" /> },
  { id: 'drone_operator', label: 'Drone Operator', icon: <Plane className="w-5 h-5" /> },
];

export default function JoinNetworkPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  // --- Plan status (determines portfolio option) ---
  const profileRef = useMemo(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user?.uid]);
  const { data: profile } = useDoc(profileRef);
  const currentPlan = useMemo(() => getUserPlan(profile?.planId), [profile?.planId]);
  const hasActivePlan = currentPlan.id !== 'none';

  // --- User's existing galleries (for portfolio selection if they have a plan) ---
  const galleriesQuery = useMemo(() => {
    if (!firestore || !user || !hasActivePlan) return null;
    return query(collection(firestore, 'galleries'), where('userId', '==', user.uid));
  }, [firestore, user?.uid, hasActivePlan]);
  const { data: galleries } = useCollection(galleriesQuery);

  // --- Form state ---
  const [selectedRoles, setSelectedRoles] = useState<Role[]>([]);
  const [equipmentQuery, setEquipmentQuery] = useState('');
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentItem[]>([]);
  const [rateAmount, setRateAmount] = useState('');
  const [rateUnit, setRateUnit] = useState<'per_event' | 'per_hour'>('per_event');
  const [bio, setBio] = useState('');
  const [baseLocation, setBaseLocation] = useState('');
  const [instagramLink, setInstagramLink] = useState('');
  const [selectedGalleryIds, setSelectedGalleryIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const equipmentResults = useMemo(() => {
    if (!equipmentQuery.trim()) return [];
    return searchEquipment(equipmentQuery).filter(
      (item) => !selectedEquipment.some((sel) => sel.id === item.id)
    ).slice(0, 8);
  }, [equipmentQuery, selectedEquipment]);

  const toggleRole = useCallback((role: Role) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  }, []);

  const addEquipment = useCallback((item: EquipmentItem) => {
    setSelectedEquipment((prev) => [...prev, item]);
    setEquipmentQuery('');
  }, []);

  const addCustomEquipment = useCallback(() => {
    const trimmed = equipmentQuery.trim();
    if (!trimmed) return;
    const customItem: EquipmentItem = {
      id: `custom-${Date.now()}`,
      category: 'accessory',
      name: trimmed,
    };
    setSelectedEquipment((prev) => [...prev, customItem]);
    setEquipmentQuery('');
  }, [equipmentQuery]);

  const removeEquipment = useCallback((id: string) => {
    setSelectedEquipment((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const toggleGallery = useCallback((galleryId: string) => {
    setSelectedGalleryIds((prev) =>
      prev.includes(galleryId) ? prev.filter((id) => id !== galleryId) : [...prev, galleryId]
    );
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!user || !firestore) return;

    if (selectedRoles.length === 0) {
      toast({ variant: 'destructive', title: 'Select at least one role', description: 'Choose Photographer, Videographer, or Drone Operator.' });
      return;
    }
    if (!rateAmount.trim()) {
      toast({ variant: 'destructive', title: 'Rate required', description: 'Please enter your rate.' });
      return;
    }
    if (!baseLocation.trim()) {
      toast({ variant: 'destructive', title: 'Location required', description: 'Please enter your base location.' });
      return;
    }
    if (!hasActivePlan && !instagramLink.trim()) {
      toast({ variant: 'destructive', title: 'Portfolio required', description: 'Add your Instagram link, or activate a Hafash plan to use your galleries.' });
      return;
    }

    setIsSaving(true);

    try {
      await setDoc(
        doc(firestore, 'networkProfiles', user.uid),
        {
          userId: user.uid,
          studioName: profile?.studioName || '',
          photographerName: profile?.photographerName || profile?.name || '',
          roles: selectedRoles,
          equipment: selectedEquipment.map((e) => ({ id: e.id, category: e.category, name: e.name })),
          rate: { amount: Number(rateAmount), unit: rateUnit },
          bio: bio.trim(),
          baseLocation: baseLocation.trim(),
          portfolioType: hasActivePlan ? 'hafash_gallery' : 'instagram_link',
          portfolioGalleryIds: hasActivePlan ? selectedGalleryIds : [],
          instagramLink: hasActivePlan ? '' : instagramLink.trim(),
          isActive: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      toast({ title: 'Welcome to Hafash Network!', description: 'Your professional profile is live.' });
      router.push('/network');
    } catch (error: any) {
      console.error('[JOIN_NETWORK] Error:', error);
      toast({ variant: 'destructive', title: 'Something went wrong', description: 'Unable to save your profile. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  }, [user, firestore, selectedRoles, rateAmount, rateUnit, bio, baseLocation, hasActivePlan, instagramLink, selectedEquipment, selectedGalleryIds, toast, router]);

  return (
    <div className="min-h-screen bg-background p-6 lg:p-12 animate-in fade-in duration-500">
      <div className="max-w-3xl mx-auto space-y-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="rounded-full" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-headline font-bold">Join Hafash Network</h1>
            <p className="text-muted-foreground text-sm mt-1">Get discovered by photographers who need a second shooter, editor, or crew.</p>
          </div>
        </div>

        {/* Roles */}
        <Card className="bg-card border-border/50 rounded-3xl overflow-hidden">
          <CardHeader className="bg-background/30 border-b border-border/30">
            <CardTitle className="text-lg font-headline font-bold">What do you do?</CardTitle>
          </CardHeader>
          <CardContent className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            {ROLE_OPTIONS.map((role) => {
              const isSelected = selectedRoles.includes(role.id);
              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => toggleRole(role.id)}
                  className={`p-5 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all ${
                    isSelected ? 'border-primary bg-primary/10 text-primary' : 'border-border/30 bg-background/30 text-muted-foreground hover:border-primary/30'
                  }`}
                >
                  {role.icon}
                  <span className="font-bold text-sm">{role.label}</span>
                  {isSelected && <Check className="w-4 h-4" />}
                </button>
              );
            })}
          </CardContent>
        </Card>

        {/* Equipment */}
        <Card className="bg-card border-border/50 rounded-3xl overflow-hidden">
          <CardHeader className="bg-background/30 border-b border-border/30">
            <CardTitle className="text-lg font-headline font-bold">Your Equipment</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search for your camera, lens, gimbal, drone..."
                className="pl-12 h-12 rounded-xl"
                value={equipmentQuery}
                onChange={(e) => setEquipmentQuery(e.target.value)}
              />
            </div>

            {equipmentQuery.trim() && (
              <div className="border border-border/30 rounded-2xl overflow-hidden">
                {equipmentResults.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => addEquipment(item)}
                    className="w-full text-left px-4 py-3 hover:bg-primary/10 flex items-center justify-between text-sm border-b border-border/20 last:border-0"
                  >
                    <span>{item.name}</span>
                    <span className="text-[10px] uppercase text-muted-foreground">{EQUIPMENT_CATEGORY_LABELS[item.category]}</span>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={addCustomEquipment}
                  className="w-full text-left px-4 py-3 hover:bg-primary/10 flex items-center gap-2 text-sm text-primary font-bold"
                >
                  <Plus className="w-4 h-4" /> Add &quot;{equipmentQuery.trim()}&quot; as custom item
                </button>
              </div>
            )}

            {selectedEquipment.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {selectedEquipment.map((item) => (
                  <Badge key={item.id} className="bg-primary/10 text-primary border border-primary/20 rounded-lg px-3 py-1.5 gap-2 text-xs font-bold">
                    {item.name}
                    <button type="button" onClick={() => removeEquipment(item.id)}>
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Rate & Location */}
        <Card className="bg-card border-border/50 rounded-3xl overflow-hidden">
          <CardHeader className="bg-background/30 border-b border-border/30">
            <CardTitle className="text-lg font-headline font-bold">Rate & Location</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-muted-foreground">Your Rate (PKR)</label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="5000"
                    className="h-12 rounded-xl"
                    value={rateAmount}
                    onChange={(e) => setRateAmount(e.target.value)}
                  />
                  <select
                    className="h-12 rounded-xl border border-input bg-background px-3 text-sm"
                    value={rateUnit}
                    onChange={(e) => setRateUnit(e.target.value as 'per_event' | 'per_hour')}
                  >
                    <option value="per_event">Per Event</option>
                    <option value="per_hour">Per Hour</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-muted-foreground">Base Location</label>
                <Input
                  placeholder="e.g. DHA Phase 5, Karachi"
                  className="h-12 rounded-xl"
                  value={baseLocation}
                  onChange={(e) => setBaseLocation(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-muted-foreground">Short Bio (optional)</label>
              <Textarea
                placeholder="Tell hirers a bit about your style and experience..."
                className="rounded-xl min-h-[100px]"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Portfolio */}
        <Card className="bg-card border-border/50 rounded-3xl overflow-hidden">
          <CardHeader className="bg-background/30 border-b border-border/30">
            <CardTitle className="text-lg font-headline font-bold">Portfolio</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {hasActivePlan ? (
              <>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-primary" />
                  Select galleries to showcase as your portfolio (uses your {currentPlan.name} plan storage).
                </p>
                {!galleries || galleries.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">You don&apos;t have any galleries yet. Create one first, then come back here.</p>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {galleries.map((gallery: any) => {
                      const isSelected = selectedGalleryIds.includes(gallery.id);
                      return (
                        <button
                          key={gallery.id}
                          type="button"
                          onClick={() => toggleGallery(gallery.id)}
                          className={`relative rounded-xl overflow-hidden aspect-[4/3] border-2 ${isSelected ? 'border-primary' : 'border-border/30'}`}
                        >
                          {gallery.coverImage ? (
                            <img src={gallery.coverImage} className="w-full h-full object-cover" alt={gallery.title} />
                          ) : (
                            <div className="w-full h-full bg-muted flex items-center justify-center">
                              <ImageIcon className="w-6 h-6 text-white/10" />
                            </div>
                          )}
                          {isSelected && (
                            <div className="absolute top-2 right-2 bg-primary rounded-full p-1">
                              <Check className="w-3 h-3 text-primary-foreground" />
                            </div>
                          )}
                          <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1">
                            <p className="text-[10px] text-white truncate">{gallery.title}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Instagram className="w-4 h-4 text-primary" />
                  You don&apos;t have an active Hafash plan yet — add your Instagram photography page link instead.
                </p>
                <Input
                  placeholder="https://instagram.com/yourpage"
                  className="h-12 rounded-xl"
                  value={instagramLink}
                  onChange={(e) => setInstagramLink(e.target.value)}
                />
              </>
            )}
          </CardContent>
        </Card>

        <Button
          className="w-full h-16 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 text-lg font-bold shadow-2xl shadow-primary/20"
          onClick={handleSubmit}
          disabled={isSaving}
        >
          {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Join Hafash Network'}
        </Button>
      </div>
    </div>
  );
}