"use client";

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc, useCollection } from '@/firebase';
import { doc, setDoc, serverTimestamp, collection, query, where } from 'firebase/firestore';
import { getUserPlan } from '@/lib/plans';
import {
  EQUIPMENT_CATALOG,
  EQUIPMENT_CATEGORY_LABELS,
  searchEquipment,
  getAreasForCity,
  ROLE_DEFINITIONS,
  TRAVEL_RANGE_LABELS,
  PAKISTAN_CITIES,
  RATE_UNIT_LABELS,
  TURNAROUND_OPTIONS,
  REMOTE_SERVICES,
  GENDER_LABELS,
  hasOnSiteRole,
  hasRemoteRole,
  type EquipmentItem,
  type EquipmentCategory,
  type Role,
  type TravelRange,
  type RateUnit,
  type Gender,
} from '@/lib/equipment';
import { EventTypePicker } from '@/components/event-type-picker';
import {
  Camera,
  Video,
  Plane,
  Image as ImageIcon,
  Film,
  Wand2,
  Aperture,
  UserCog,
  Brush,
  X,
  Plus,
  Search,
  Loader2,
  Instagram,
  Facebook,
  Youtube,
  ArrowLeft,
  Check,
  MapPin,
  Compass,
  Info,
  DollarSign,
  Clock,
  Sparkles,
  User,
  UserCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const ROLE_ICONS: Record<Role, React.ReactNode> = {
  photographer: <Camera className="w-5 h-5" />,
  videographer: <Video className="w-5 h-5" />,
  drone_operator: <Plane className="w-5 h-5" />,
  album_designer: <ImageIcon className="w-5 h-5" />,
  video_editor: <Film className="w-5 h-5" />,
  photo_editor: <Wand2 className="w-5 h-5" />,
  camera_operator: <Aperture className="w-5 h-5" />,
  helper: <UserCog className="w-5 h-5" />,
  makeup_artist: <Brush className="w-5 h-5" />,
};

const ALL_ROLES: Role[] = [
  'photographer',
  'videographer',
  'drone_operator',
  'album_designer',
  'video_editor',
  'photo_editor',
  'camera_operator',
  'helper',
  'makeup_artist',
];

const REMOTE_ROLES: Role[] = ['video_editor', 'photo_editor', 'album_designer'];

export default function JoinNetworkPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const profileRef = useMemo(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user?.uid]);
  const { data: profile } = useDoc(profileRef);
  const currentPlan = useMemo(() => getUserPlan(profile?.planId), [profile?.planId]);
  const hasActivePlan = currentPlan.id !== 'none';

  const galleriesQuery = useMemo(() => {
    if (!firestore || !user || !hasActivePlan) return null;
    return query(collection(firestore, 'galleries'), where('userId', '==', user.uid));
  }, [firestore, user?.uid, hasActivePlan]);
  const { data: galleries } = useCollection(galleriesQuery);

  const networkProfileRef = useMemo(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'networkProfiles', user.uid);
  }, [firestore, user?.uid]);
  const { data: existingProfile } = useDoc(networkProfileRef);

  // Form state
  const [gender, setGender] = useState<Gender | ''>('');
  const [selectedRoles, setSelectedRoles] = useState<Role[]>([]);
  const [equipmentQuery, setEquipmentQuery] = useState('');
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentItem[]>([]);
  const [bio, setBio] = useState('');
  const [baseCity, setBaseCity] = useState('');
  const [serviceAreas, setServiceAreas] = useState<string[]>([]);
  const [newArea, setNewArea] = useState('');
  const [travelRange, setTravelRange] = useState<TravelRange>('anywhere_in_city');
  const [rates, setRates] = useState<Array<{ eventType: string; amount: string; unit: RateUnit }>>([
    { eventType: 'All Events', amount: '', unit: 'per_event' },
  ]);
  const [turnarounds, setTurnarounds] = useState<Record<string, string>>({});
  const [services, setServices] = useState<Record<string, string[]>>({});
  const [instagramLink, setInstagramLink] = useState('');
  const [facebookLink, setFacebookLink] = useState('');
  const [youtubeLink, setYoutubeLink] = useState('');
  const [selectedGalleryIds, setSelectedGalleryIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (existingProfile) {
      setGender(existingProfile.gender || '');
      setSelectedRoles(existingProfile.roles || []);
      setSelectedEquipment(existingProfile.equipment || []);
      setBio(existingProfile.bio || '');
      setBaseCity(existingProfile.baseCity || existingProfile.baseLocation || '');
      setServiceAreas(existingProfile.serviceAreas || []);
      setTravelRange(existingProfile.travelRange || 'anywhere_in_city');
      setInstagramLink(existingProfile.instagramLink || '');
      setFacebookLink(existingProfile.facebookLink || '');
      setYoutubeLink(existingProfile.youtubeLink || '');
      setSelectedGalleryIds(existingProfile.portfolioGalleryIds || []);
      if (existingProfile.turnarounds) setTurnarounds(existingProfile.turnarounds);
      if (existingProfile.services) setServices(existingProfile.services);
      if (existingProfile.rates && Array.isArray(existingProfile.rates)) {
        setRates(existingProfile.rates.map((r: any) => ({
          eventType: r.eventType || 'All Events',
          amount: String(r.amount || ''),
          unit: r.unit || 'per_event',
        })));
      } else if (existingProfile.rate) {
        setRates([{
          eventType: 'All Events',
          amount: String(existingProfile.rate.amount || ''),
          unit: existingProfile.rate.unit || 'per_event',
        }]);
      }
    }
  }, [existingProfile]);

  const rolesRequireEquipment = useMemo(() => hasOnSiteRole(selectedRoles), [selectedRoles]);
  const rolesRequirePortfolio = useMemo(() => {
    return selectedRoles.some(r => ROLE_DEFINITIONS[r]?.requiresPortfolio);
  }, [selectedRoles]);
  const selectedRemoteRoles = useMemo(() => {
    return selectedRoles.filter(r => REMOTE_ROLES.includes(r));
  }, [selectedRoles]);
  const isOnSite = useMemo(() => hasOnSiteRole(selectedRoles), [selectedRoles]);

  const availableAreas = useMemo(() => {
    if (!baseCity) return [];
    return getAreasForCity(baseCity);
  }, [baseCity]);

  const equipmentResults = useMemo(() => {
    if (!equipmentQuery.trim()) return [];
    return searchEquipment(equipmentQuery)
      .filter(item => !selectedEquipment.some(sel => sel.id === item.id))
      .slice(0, 10);
  }, [equipmentQuery, selectedEquipment]);

  const toggleRole = useCallback((role: Role) => {
    setSelectedRoles(prev =>
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    );
  }, []);

  const addEquipment = useCallback((item: EquipmentItem) => {
    setSelectedEquipment(prev => [...prev, item]);
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
    setSelectedEquipment(prev => [...prev, customItem]);
    setEquipmentQuery('');
  }, [equipmentQuery]);

  const removeEquipment = useCallback((id: string) => {
    setSelectedEquipment(prev => prev.filter(item => item.id !== id));
  }, []);

  const toggleArea = useCallback((area: string) => {
    setServiceAreas(prev =>
      prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area]
    );
  }, []);

  const addCustomArea = useCallback(() => {
    const trimmed = newArea.trim();
    if (!trimmed || serviceAreas.includes(trimmed)) return;
    setServiceAreas(prev => [...prev, trimmed]);
    setNewArea('');
  }, [newArea, serviceAreas]);

  const removeArea = useCallback((area: string) => {
    setServiceAreas(prev => prev.filter(a => a !== area));
  }, []);

  const toggleGallery = useCallback((galleryId: string) => {
    setSelectedGalleryIds(prev =>
      prev.includes(galleryId) ? prev.filter(id => id !== galleryId) : [...prev, galleryId]
    );
  }, []);

  const addRateRow = useCallback(() => {
    setRates(prev => [...prev, { eventType: 'All Events', amount: '', unit: 'per_event' }]);
  }, []);

  const updateRateRow = useCallback((index: number, updates: Partial<{ eventType: string; amount: string; unit: RateUnit }>) => {
    setRates(prev => prev.map((r, i) => i === index ? { ...r, ...updates } : r));
  }, []);

  const removeRateRow = useCallback((index: number) => {
    setRates(prev => prev.filter((_, i) => i !== index));
  }, []);

  const setTurnaround = useCallback((roleId: string, value: string) => {
    setTurnarounds(prev => ({ ...prev, [roleId]: value }));
  }, []);

  const toggleService = useCallback((roleId: string, service: string) => {
    setServices(prev => {
      const current = prev[roleId] || [];
      const updated = current.includes(service)
        ? current.filter(s => s !== service)
        : [...current, service];
      return { ...prev, [roleId]: updated };
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!user || !firestore) return;

    if (!gender) {
      toast({ variant: 'destructive', title: 'Gender required', description: 'Please select Male or Female.' });
      return;
    }

    if (selectedRoles.length === 0) {
      toast({ variant: 'destructive', title: 'Select at least one role' });
      return;
    }

    if (isOnSite && !baseCity.trim()) {
      toast({ variant: 'destructive', title: 'City required', description: 'Please enter your base city.' });
      return;
    }

    const validRates = rates.filter(r => r.amount.trim() && Number(r.amount) > 0);
    if (validRates.length === 0) {
      toast({ variant: 'destructive', title: 'Rate required', description: 'Please add at least one rate.' });
      return;
    }

    if (selectedRemoteRoles.length > 0) {
      const missing = selectedRemoteRoles.filter(r => !turnarounds[r]);
      if (missing.length > 0) {
        toast({
          variant: 'destructive',
          title: 'Delivery time required',
          description: `Please set delivery time for: ${missing.map(r => ROLE_DEFINITIONS[r].label).join(', ')}`,
        });
        return;
      }
    }

    if (rolesRequirePortfolio && !hasActivePlan) {
      const hasLink = instagramLink.trim() || facebookLink.trim() || youtubeLink.trim();
      if (!hasLink) {
        toast({
          variant: 'destructive',
          title: 'Portfolio required',
          description: 'Add at least one social link or activate a Hafash plan.'
        });
        return;
      }
    }

    setIsSaving(true);

    try {
      const cleanedRates = validRates.map(r => ({
        eventType: r.eventType.trim() || 'All Events',
        amount: Number(r.amount),
        unit: r.unit,
      }));

      const primaryRate = cleanedRates[0];

      const cleanTurnarounds: Record<string, string> = {};
      selectedRemoteRoles.forEach(r => {
        if (turnarounds[r]) cleanTurnarounds[r] = turnarounds[r];
      });

      const cleanServices: Record<string, string[]> = {};
      selectedRemoteRoles.forEach(r => {
        if (services[r] && services[r].length > 0) {
          cleanServices[r] = services[r];
        }
      });

      await setDoc(
        doc(firestore, 'networkProfiles', user.uid),
        {
          userId: user.uid,
          gender,
          studioName: profile?.studioName || '',
          photographerName: profile?.photographerName || profile?.name || '',
          roles: selectedRoles,
          equipment: selectedEquipment.map(e => ({
            id: e.id,
            category: e.category,
            name: e.name,
            brand: e.brand || '',
          })),
          rate: {
            amount: primaryRate.amount,
            unit: primaryRate.unit,
          },
          rates: cleanedRates,
          bio: bio.trim(),
          baseCity: baseCity.trim(),
          serviceAreas: serviceAreas,
          travelRange,
          baseLocation: baseCity.trim(),
          turnarounds: cleanTurnarounds,
          services: cleanServices,
          portfolioType: hasActivePlan ? 'hafash_gallery' : 'social_links',
          portfolioGalleryIds: hasActivePlan ? selectedGalleryIds : [],
          instagramLink: instagramLink.trim(),
          facebookLink: facebookLink.trim(),
          youtubeLink: youtubeLink.trim(),
          isActive: true,
          createdAt: existingProfile?.createdAt || serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      toast({ title: 'Profile Saved!', description: 'Your professional profile is live.' });
      router.push('/network/hub');
    } catch (error: any) {
      console.error('[JOIN_NETWORK] Error:', error);
      toast({ variant: 'destructive', title: 'Something went wrong', description: error.message });
    } finally {
      setIsSaving(false);
    }
  }, [
    user, firestore, gender, selectedRoles, baseCity, serviceAreas, travelRange,
    selectedEquipment, bio, rates, hasActivePlan, instagramLink, facebookLink,
    youtubeLink, selectedGalleryIds, profile, existingProfile, toast, router,
    rolesRequirePortfolio, selectedRemoteRoles, turnarounds, services, isOnSite
  ]);

  return (
    <div className="min-h-screen bg-background p-6 lg:p-12 animate-in fade-in duration-500">
      <div className="max-w-3xl mx-auto space-y-8">

        {/* Header */}
        <div className="relative overflow-hidden rounded-[2rem] border border-border/40 bg-card/40 px-6 py-7 lg:px-8 lg:py-8 shadow-sm">
          <div className="absolute -top-24 -right-24 h-56 w-56 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
          <div className="relative flex items-center gap-4">
            <Button variant="ghost" size="icon" className="rounded-full" onClick={() => router.back()}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl lg:text-4xl font-headline font-bold tracking-tight">
                {existingProfile ? 'Edit Your Profile' : 'Join Hafash Network'}
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                Get discovered by other professionals who need a cross.
              </p>
            </div>
          </div>
        </div>

        {/* ═══ GENDER ═══ */}
        <Card className="bg-card border-border/50 rounded-3xl overflow-hidden">
          <CardHeader className="bg-background/30 border-b border-border/30">
            <CardTitle className="text-lg font-headline font-bold">
              Aap ka gender? <span className="text-destructive">*</span>
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Clients isi hisaab se aapko search mein dhoondein ge.
            </p>
          </CardHeader>
          <CardContent className="p-6 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setGender('male')}
              className={cn(
                "relative p-5 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all",
                gender === 'male'
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-border/30 bg-background/30 hover:border-blue-500/30'
              )}
            >
              <div className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center",
                gender === 'male' ? 'bg-blue-500/20 text-blue-400' : 'bg-muted text-muted-foreground'
              )}>
                <User className="w-7 h-7" />
              </div>
              <span className={cn(
                "font-bold text-sm",
                gender === 'male' && "text-blue-400"
              )}>
                Male
              </span>
              {gender === 'male' && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
            </button>

            <button
              type="button"
              onClick={() => setGender('female')}
              className={cn(
                "relative p-5 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all",
                gender === 'female'
                  ? 'border-pink-500 bg-pink-500/10'
                  : 'border-border/30 bg-background/30 hover:border-pink-500/30'
              )}
            >
              <div className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center",
                gender === 'female' ? 'bg-pink-500/20 text-pink-400' : 'bg-muted text-muted-foreground'
              )}>
                <UserCircle2 className="w-7 h-7" />
              </div>
              <span className={cn(
                "font-bold text-sm",
                gender === 'female' && "text-pink-400"
              )}>
                Female
              </span>
              {gender === 'female' && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-pink-500 flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
            </button>
          </CardContent>
        </Card>

        {/* ═══ ROLES ═══ */}
        <Card className="bg-card border-border/50 rounded-3xl overflow-hidden">
          <CardHeader className="bg-background/30 border-b border-border/30">
            <CardTitle className="text-lg font-headline font-bold">What do you do?</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">Select all that apply.</p>
          </CardHeader>
          <CardContent className="p-6 grid grid-cols-2 md:grid-cols-3 gap-3">
            {ALL_ROLES.map((roleId) => {
              const role = ROLE_DEFINITIONS[roleId];
              const isSelected = selectedRoles.includes(roleId);
              const isRemote = REMOTE_ROLES.includes(roleId);
              return (
                <button
                  key={roleId}
                  type="button"
                  onClick={() => toggleRole(roleId)}
                  className={cn(
                    "relative p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all text-center",
                    isSelected
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border/30 bg-background/30 text-muted-foreground hover:border-primary/30'
                  )}
                >
                  {ROLE_ICONS[roleId]}
                  <span className="font-bold text-xs leading-tight">{role.label}</span>
                  {isRemote && (
                    <span className={cn(
                      "absolute top-2 right-2 text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded",
                      isSelected ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                    )}>
                      Remote
                    </span>
                  )}
                  {isSelected && <Check className="w-3 h-3" />}
                </button>
              );
            })}
          </CardContent>
        </Card>

        {/* EQUIPMENT */}
        {rolesRequireEquipment && (
          <Card className="bg-card border-border/50 rounded-3xl overflow-hidden">
            <CardHeader className="bg-background/30 border-b border-border/30">
              <CardTitle className="text-lg font-headline font-bold flex items-center gap-2">
                <Camera className="w-5 h-5 text-primary" /> Your Equipment
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">List your gear so others know what you work with.</p>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search camera, lens, gimbal, drone..."
                  className="pl-12 h-12 rounded-xl"
                  value={equipmentQuery}
                  onChange={(e) => setEquipmentQuery(e.target.value)}
                />
              </div>

              {equipmentQuery.trim() && (
                <div className="border border-border/30 rounded-2xl overflow-hidden max-h-72 overflow-y-auto">
                  {equipmentResults.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => addEquipment(item)}
                      className="w-full text-left px-4 py-3 hover:bg-primary/10 flex items-center justify-between text-sm border-b border-border/20 last:border-0"
                    >
                      <span>{item.name}</span>
                      <span className="text-[10px] uppercase text-muted-foreground">
                        {EQUIPMENT_CATEGORY_LABELS[item.category]}
                      </span>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={addCustomEquipment}
                    className="w-full text-left px-4 py-3 hover:bg-primary/10 flex items-center gap-2 text-sm text-primary font-bold"
                  >
                    <Plus className="w-4 h-4" /> Add &quot;{equipmentQuery.trim()}&quot; as custom
                  </button>
                </div>
              )}

              {selectedEquipment.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {selectedEquipment.map((item) => (
                    <Badge
                      key={item.id}
                      className="bg-primary/10 text-primary border border-primary/20 rounded-lg px-3 py-1.5 gap-2 text-xs font-bold"
                    >
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
        )}

        {/* TURNAROUND */}
        {selectedRemoteRoles.length > 0 && (
          <Card className="bg-card border-border/50 rounded-3xl overflow-hidden">
            <CardHeader className="bg-background/30 border-b border-border/30">
              <CardTitle className="text-lg font-headline font-bold flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" /> Delivery Time
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Kitne din mein kaam deliver karenge? Har remote kaam ke liye alag set karein.
              </p>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {selectedRemoteRoles.map((roleId) => {
                const role = ROLE_DEFINITIONS[roleId];
                const selected = turnarounds[roleId];
                const roleServices = REMOTE_SERVICES[roleId] || [];
                const selectedRoleServices = services[roleId] || [];

                return (
                  <div key={roleId} className="space-y-4 p-4 rounded-2xl bg-background/40 border border-border/30">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                        {ROLE_ICONS[roleId]}
                      </div>
                      <div>
                        <p className="font-bold text-sm">{role.label}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                          {selected ? `Delivers in ${TURNAROUND_OPTIONS.find(o => o.id === selected)?.short}` : 'Set delivery time'}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {TURNAROUND_OPTIONS.map((option) => {
                        const isSelected = selected === option.id;
                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => setTurnaround(roleId, option.id)}
                            className={cn(
                              "px-3 py-2.5 rounded-xl border-2 text-[11px] font-bold transition-all",
                              isSelected
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-border/30 text-muted-foreground hover:border-primary/30'
                            )}
                          >
                            {option.short}
                          </button>
                        );
                      })}
                    </div>

                    {roleServices.length > 0 && (
                      <div className="pt-3 border-t border-border/20 space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                          Services you offer (optional)
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {roleServices.map((service) => {
                            const isSelected = selectedRoleServices.includes(service);
                            return (
                              <button
                                key={service}
                                type="button"
                                onClick={() => toggleService(roleId, service)}
                                className={cn(
                                  "px-3 py-1.5 rounded-lg border text-[11px] font-bold transition-all",
                                  isSelected
                                    ? 'border-primary bg-primary/15 text-primary'
                                    : 'border-border/30 text-muted-foreground hover:border-primary/30'
                                )}
                              >
                                {isSelected && <Check className="w-3 h-3 inline mr-1" />}
                                {service}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* LOCATION */}
        {isOnSite && (
          <Card className="bg-card border-border/50 rounded-3xl overflow-hidden">
            <CardHeader className="bg-background/30 border-b border-border/30">
              <CardTitle className="text-lg font-headline font-bold flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" /> Location & Service Areas
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">Where are you based, and where do you take work?</p>
            </CardHeader>
            <CardContent className="p-6 space-y-6">

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-muted-foreground">Base City *</label>
                <div className="flex flex-wrap gap-2">
                  {PAKISTAN_CITIES.slice(0, 8).map((city) => (
                    <button
                      key={city}
                      type="button"
                      onClick={() => setBaseCity(city)}
                      className={cn(
                        "px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-all",
                        baseCity === city
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border/30 text-muted-foreground hover:border-primary/30'
                      )}
                    >
                      {city}
                    </button>
                  ))}
                </div>
                <Input
                  placeholder="Or type your city..."
                  className="h-11 rounded-xl mt-2"
                  value={baseCity}
                  onChange={(e) => setBaseCity(e.target.value)}
                />
              </div>

              {baseCity && (
                <div className="space-y-3">
                  <label className="text-xs font-bold uppercase text-muted-foreground">
                    Service Areas in {baseCity}
                  </label>

                  {availableAreas.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {availableAreas.map((area) => {
                        const isSelected = serviceAreas.includes(area);
                        return (
                          <button
                            key={area}
                            type="button"
                            onClick={() => toggleArea(area)}
                            className={cn(
                              "px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-all",
                              isSelected
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-border/30 text-muted-foreground hover:border-primary/30'
                            )}
                          >
                            {isSelected && <Check className="w-3 h-3 inline mr-1" />}
                            {area}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Input
                      placeholder="Add custom area..."
                      className="h-10 rounded-xl"
                      value={newArea}
                      onChange={(e) => setNewArea(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomArea())}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-xl"
                      onClick={addCustomArea}
                      disabled={!newArea.trim()}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>

                  {serviceAreas.filter(a => !availableAreas.includes(a)).length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {serviceAreas
                        .filter(a => !availableAreas.includes(a))
                        .map((area) => (
                          <Badge
                            key={area}
                            className="bg-primary/10 text-primary border border-primary/20 rounded-lg px-3 py-1.5 gap-2 text-xs font-bold"
                          >
                            {area}
                            <button type="button" onClick={() => removeArea(area)}>
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-3 pt-3 border-t border-border/20">
                <label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                  <Compass className="w-4 h-4 text-primary" /> How far will you travel?
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {(Object.keys(TRAVEL_RANGE_LABELS) as TravelRange[]).map((range) => (
                    <button
                      key={range}
                      type="button"
                      onClick={() => setTravelRange(range)}
                      className={cn(
                        "px-4 py-3 rounded-xl text-sm font-bold border-2 transition-all text-left",
                        travelRange === range
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border/30 text-muted-foreground hover:border-primary/30'
                      )}
                    >
                      {TRAVEL_RANGE_LABELS[range]}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* RATE CARD */}
        <Card className="bg-card border-border/50 rounded-3xl overflow-hidden">
          <CardHeader className="bg-background/30 border-b border-border/30">
            <CardTitle className="text-lg font-headline font-bold flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" /> Your Rate Card
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">Add rates for different event types.</p>
          </CardHeader>
          <CardContent className="p-6 space-y-3">
            {rates.map((rate, index) => (
              <div key={index} className="flex flex-col md:flex-row gap-2 items-start md:items-center">
                <EventTypePicker
                  value={rate.eventType}
                  onChange={(val) => updateRateRow(index, { eventType: val })}
                  placeholder="Select event type..."
                  className="flex-1 w-full"
                  compact
                />

                <div className="flex gap-2 flex-1 w-full">
                  <Input
                    type="number"
                    placeholder="Amount"
                    className="h-11 rounded-xl flex-1"
                    value={rate.amount}
                    onChange={(e) => updateRateRow(index, { amount: e.target.value })}
                  />

                  <select
                    className="h-11 rounded-xl border border-input bg-background px-3 text-sm"
                    value={rate.unit}
                    onChange={(e) => updateRateRow(index, { unit: e.target.value as RateUnit })}
                  >
                    {(Object.keys(RATE_UNIT_LABELS) as RateUnit[]).map((unit) => (
                      <option key={unit} value={unit}>{RATE_UNIT_LABELS[unit]}</option>
                    ))}
                  </select>

                  {rates.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="rounded-xl text-destructive hover:bg-destructive/10 shrink-0"
                      onClick={() => removeRateRow(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              className="w-full rounded-xl gap-2 mt-2"
              onClick={addRateRow}
            >
              <Plus className="w-4 h-4" /> Add Another Rate
            </Button>
          </CardContent>
        </Card>

        {/* BIO */}
        <Card className="bg-card border-border/50 rounded-3xl overflow-hidden">
          <CardHeader className="bg-background/30 border-b border-border/30">
            <CardTitle className="text-lg font-headline font-bold">Short Bio</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">Optional, but recommended.</p>
          </CardHeader>
          <CardContent className="p-6">
            <Textarea
              placeholder="Tell others about your style, experience, and what makes you stand out..."
              className="rounded-xl min-h-[120px]"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground mt-2 text-right">{bio.length} / 500</p>
          </CardContent>
        </Card>

        {/* PORTFOLIO */}
        {rolesRequirePortfolio && (
          <Card className="bg-card border-border/50 rounded-3xl overflow-hidden">
            <CardHeader className="bg-background/30 border-b border-border/30">
              <CardTitle className="text-lg font-headline font-bold">Portfolio</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                {hasActivePlan
                  ? `Showcase your Hafash galleries (uses your ${currentPlan.name} storage).`
                  : 'Add your social links to showcase your work.'}
              </p>
            </CardHeader>
            <CardContent className="p-6 space-y-6">

              {hasActivePlan && (
                <div className="space-y-3">
                  {!galleries || galleries.length === 0 ? (
                    <div className="flex items-start gap-3 p-4 rounded-2xl bg-primary/5 border border-primary/20">
                      <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <p className="text-sm text-muted-foreground">
                        You don&apos;t have any galleries yet. Create one first, then come back here.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {galleries.map((gallery: any) => {
                        const isSelected = selectedGalleryIds.includes(gallery.id);
                        return (
                          <button
                            key={gallery.id}
                            type="button"
                            onClick={() => toggleGallery(gallery.id)}
                            className={cn(
                              "relative rounded-xl overflow-hidden aspect-[4/3] border-2 transition-all",
                              isSelected ? 'border-primary' : 'border-border/30 hover:border-primary/40'
                            )}
                          >
                            {gallery.coverImage ? (
                              <img src={gallery.coverImage} className="w-full h-full object-cover" alt={gallery.title} />
                            ) : (
                              <div className="w-full h-full bg-muted flex items-center justify-center">
                                <ImageIcon className="w-6 h-6 text-white/10" />
                              </div>
                            )}
                            {isSelected && (
                              <div className="absolute top-2 right-2 bg-primary rounded-full p-1 shadow-lg">
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
                </div>
              )}

              <div className="space-y-4">
                {!hasActivePlan && (
                  <div className="flex items-start gap-3 p-4 rounded-2xl bg-primary/5 border border-primary/20">
                    <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <p className="text-sm text-muted-foreground">
                      Add at least one link. Or activate a Hafash plan to showcase your galleries instead.
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                    <Instagram className="w-4 h-4 text-pink-500" /> Instagram
                  </label>
                  <Input
                    placeholder="https://instagram.com/yourpage"
                    className="h-11 rounded-xl"
                    value={instagramLink}
                    onChange={(e) => setInstagramLink(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                    <Facebook className="w-4 h-4 text-blue-500" /> Facebook
                  </label>
                  <Input
                    placeholder="https://facebook.com/yourpage"
                    className="h-11 rounded-xl"
                    value={facebookLink}
                    onChange={(e) => setFacebookLink(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                    <Youtube className="w-4 h-4 text-red-500" /> YouTube
                    <span className="text-[10px] normal-case font-medium">(optional)</span>
                  </label>
                  <Input
                    placeholder="https://youtube.com/@yourchannel"
                    className="h-11 rounded-xl"
                    value={youtubeLink}
                    onChange={(e) => setYoutubeLink(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* SUBMIT */}
        <Button
          className="w-full h-16 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 text-lg font-bold shadow-2xl shadow-primary/20"
          onClick={handleSubmit}
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Saving...
            </>
          ) : (
            existingProfile ? 'Update Profile' : 'Join Hafash Network'
          )}
        </Button>

      </div>
    </div>
  );
}