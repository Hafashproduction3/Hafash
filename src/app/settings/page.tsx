"use client";

import { useUser, useFirestore, useDoc } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { 
  User, 
  Shield, 
  Camera, 
  Save, 
  Loader2, 
  Briefcase, 
  Phone, 
  Image as ImageIcon, 
  ArrowLeft,
  Settings,
  Bell,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  Globe,
  Lock,
  Zap,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { doc, setDoc } from 'firebase/firestore';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [activeTab, setActiveTab] = useState("studio");

  const settingsRef = useMemo(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user?.uid]);

  const { data: profile, loading: profileLoading } = useDoc(settingsRef);

  const [formData, setFormData] = useState({
    studioName: '',
    photographerName: '',
    whatsappNumber: '',
    studioLogo: '',
    studioBanner: '',
    website: '',
    // Gallery Defaults
    defaultWatermark: true,
    defaultAllowDownloads: false,
    defaultPublicLink: true,
    // Notification Preferences
    notifyNewFavorite: true,
    notifyNewView: false,
    notifyPaymentReceived: true,
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        studioName: profile.studioName || '',
        photographerName: profile.photographerName || '',
        whatsappNumber: profile.whatsappNumber || '',
        studioLogo: profile.studioLogo || '',
        studioBanner: profile.studioBanner || '',
        website: profile.website || '',
        defaultWatermark: profile.defaultWatermark ?? true,
        defaultAllowDownloads: profile.defaultAllowDownloads ?? false,
        defaultPublicLink: profile.defaultPublicLink ?? true,
        notifyNewFavorite: profile.notifyNewFavorite ?? true,
        notifyNewView: profile.notifyNewView ?? false,
        notifyPaymentReceived: profile.notifyPaymentReceived ?? true,
      });
      setIsDirty(false);
    }
  }, [profile]);

  const isCustomBrandingActive = useMemo(() => {
    return profile?.planId && profile.planId !== 'starter';
  }, [profile?.planId]);

  // Prevent accidental navigation
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const validateWhatsApp = (number: string) => {
    const regex = /^\+?[1-9]\d{1,14}$/;
    return regex.test(number.replace(/\s+/g, ''));
  };

  const handleSave = async () => {
    if (!firestore || !user) return;
    
    if (!formData.studioName || !formData.whatsappNumber) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Studio Name and WhatsApp Number are required.",
      });
      return;
    }

    if (!validateWhatsApp(formData.whatsappNumber)) {
      toast({
        variant: "destructive",
        title: "Invalid WhatsApp",
        description: "Please enter a valid international number (e.g., +923001234567).",
      });
      return;
    }

    setSaving(true);
    try {
      await setDoc(doc(firestore, 'users', user.uid), {
        ...formData,
        userId: user.uid,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      
      toast({
        title: "Configuration Synchronized",
        description: "Your studio control center has been updated.",
      });
      setIsDirty(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Sync Failed",
        description: error.message || "Failed to save settings.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-20">
      {/* Dynamic Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-10 border-b border-border/50 pb-12">
        <div className="flex items-center gap-6">
          <Button variant="ghost" size="icon" className="rounded-full h-12 w-12 hover:bg-primary/10 transition-all" onClick={() => router.back()}>
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div className="space-y-2">
            <h1 className="text-4xl lg:text-5xl font-headline font-bold tracking-tight">Studio Control Center</h1>
            <div className="flex flex-wrap items-center gap-4 text-[11px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
              <span className="flex items-center gap-2"><Settings className="w-4 h-4 text-primary" /> Production Environment Active</span>
              {isDirty && (
                <span className="flex items-center gap-2 text-amber-500 animate-pulse">
                  <AlertTriangle className="w-4 h-4" /> Unsaved Configuration Changes
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="w-full md:w-auto">
          <Button 
            className={cn(
              "w-full md:w-auto rounded-2xl gap-3 px-10 h-14 font-bold shadow-2xl transition-all",
              isDirty ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/20 scale-105" : "bg-muted text-muted-foreground cursor-not-allowed"
            )} 
            onClick={handleSave}
            disabled={saving || !isDirty}
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Synchronize Profile
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-12">
        <TabsList className="bg-card/40 backdrop-blur-md border border-border/30 p-1.5 rounded-[2rem] h-auto flex flex-wrap lg:inline-flex w-full lg:w-auto shadow-xl">
          <TabsTrigger value="studio" className="flex-1 lg:flex-none rounded-[1.5rem] px-8 py-3.5 font-bold text-[10px] uppercase tracking-[0.2em] transition-all">
            <Briefcase className="w-4 h-4 mr-3 text-primary" /> Studio Identity
          </TabsTrigger>
          <TabsTrigger value="account" className="flex-1 lg:flex-none rounded-[1.5rem] px-8 py-3.5 font-bold text-[10px] uppercase tracking-[0.2em] transition-all">
            <User className="w-4 h-4 mr-3 text-primary" /> Security & Plan
          </TabsTrigger>
          <TabsTrigger value="gallery" className="flex-1 lg:flex-none rounded-[1.5rem] px-8 py-3.5 font-bold text-[10px] uppercase tracking-[0.2em] transition-all">
            <Camera className="w-4 h-4 mr-3 text-primary" /> Gallery Rules
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex-1 lg:flex-none rounded-[1.5rem] px-8 py-3.5 font-bold text-[10px] uppercase tracking-[0.2em] transition-all">
            <Bell className="w-4 h-4 mr-3 text-primary" /> Telemetry alerts
          </TabsTrigger>
        </TabsList>

        {/* Studio Profile Tab */}
        <TabsContent value="studio" className="animate-in fade-in slide-in-from-left-6 duration-500">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 space-y-10">
              <Card className="bg-card/40 backdrop-blur-md border-border/50 rounded-[2.5rem] overflow-hidden shadow-2xl luxury-card-hover">
                <CardHeader className="border-b border-border/30 bg-background/40 px-10 py-10">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                    <div>
                      <CardTitle className="text-3xl font-headline font-bold">Professional Identity</CardTitle>
                      <CardDescription className="text-sm font-medium italic mt-1">Refine your studio branding used across all luxury galleries.</CardDescription>
                    </div>
                    {isCustomBrandingActive ? (
                      <Badge className="bg-primary/20 text-primary border border-primary/30 gap-2.5 py-2 px-5 rounded-xl shadow-lg shadow-primary/10">
                        <Sparkles className="w-4 h-4" /> Custom Branding Active
                      </Badge>
                    ) : (
                      <Link href="/storage">
                        <Badge variant="outline" className="border-muted-foreground/30 text-muted-foreground hover:text-primary hover:border-primary/50 transition-all cursor-pointer py-2 px-5 rounded-xl">
                          Upgrade for Custom Branding
                        </Badge>
                      </Link>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-10 space-y-8">
                  {profileLoading ? (
                    <div className="space-y-4">
                      <Skeleton className="h-14 w-full rounded-xl" />
                      <Skeleton className="h-14 w-full rounded-xl" />
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                          <Label className="text-[11px] font-bold uppercase tracking-[0.3em] text-muted-foreground ml-1">Studio Legal Name *</Label>
                          <Input 
                            value={formData.studioName} 
                            onChange={(e) => updateField('studioName', e.target.value)}
                            placeholder="e.g. Cinematic Memories" 
                            className="rounded-xl h-14 bg-background/50 border-border/50 focus:border-primary/50 text-base font-bold shadow-inner" 
                          />
                        </div>
                        <div className="space-y-3">
                          <Label className="text-[11px] font-bold uppercase tracking-[0.3em] text-muted-foreground ml-1">WhatsApp Studio Number *</Label>
                          <div className="relative">
                            <Phone className="absolute left-4 top-4.5 w-5 h-5 text-primary" />
                            <Input 
                              value={formData.whatsappNumber} 
                              onChange={(e) => updateField('whatsappNumber', e.target.value)}
                              placeholder="+923001234567" 
                              className="pl-14 h-14 rounded-xl bg-background/50 border-border/50 focus:border-primary/50 text-base font-bold shadow-inner" 
                            />
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                          <Label className="text-[11px] font-bold uppercase tracking-[0.3em] text-muted-foreground ml-1">Master Photographer Tagline</Label>
                          <div className="relative">
                            <User className="absolute left-4 top-4.5 w-5 h-5 text-primary" />
                            <Input 
                              value={formData.photographerName} 
                              onChange={(e) => updateField('photographerName', e.target.value)}
                              placeholder="Principal Photographer" 
                              className="pl-14 h-14 rounded-xl bg-background/50 border-border/50 focus:border-primary/50 text-base font-bold shadow-inner" 
                            />
                          </div>
                        </div>
                        <div className="space-y-3">
                          <Label className="text-[11px] font-bold uppercase tracking-[0.3em] text-muted-foreground ml-1">Studio Official Website</Label>
                          <div className="relative">
                            <Globe className="absolute left-4 top-4.5 w-5 h-5 text-primary" />
                            <Input 
                              value={formData.website} 
                              onChange={(e) => updateField('website', e.target.value)}
                              placeholder="https://yourstudio.com" 
                              className="pl-14 h-14 rounded-xl bg-background/50 border-border/50 focus:border-primary/50 text-base font-bold shadow-inner" 
                            />
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                  
                  <div className="space-y-10 pt-10 border-t border-border/20">
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                         <Label className="text-[11px] font-bold uppercase tracking-[0.3em] text-muted-foreground ml-1">Studio Signature Logo URL</Label>
                         {!isCustomBrandingActive && <Badge variant="secondary" className="text-[10px] font-bold px-3 uppercase tracking-tighter bg-muted/50 border border-border/50">Professional Tier Benefit</Badge>}
                      </div>
                      <div className={cn("relative transition-all duration-700", !isCustomBrandingActive && "opacity-40 grayscale pointer-events-none")}>
                        <ImageIcon className="absolute left-4 top-4.5 w-5 h-5 text-primary" />
                        <Input 
                          value={formData.studioLogo} 
                          onChange={(e) => updateField('studioLogo', e.target.value)}
                          placeholder="https://your-domain.com/studio-signature.png" 
                          className="pl-14 h-14 rounded-xl bg-background/50 border-border/50 focus:border-primary/50 font-mono text-sm" 
                          disabled={!isCustomBrandingActive}
                        />
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                         <Label className="text-[11px] font-bold uppercase tracking-[0.3em] text-muted-foreground ml-1">Global Studio Banner URL</Label>
                         {!isCustomBrandingActive && <Badge variant="secondary" className="text-[10px] font-bold px-3 uppercase tracking-tighter bg-muted/50 border border-border/50">Professional Tier Benefit</Badge>}
                      </div>
                      <div className={cn("relative transition-all duration-700", !isCustomBrandingActive && "opacity-40 grayscale pointer-events-none")}>
                        <ImageIcon className="absolute left-4 top-4.5 w-5 h-5 text-primary" />
                        <Input 
                          value={formData.studioBanner} 
                          onChange={(e) => updateField('studioBanner', e.target.value)}
                          placeholder="https://your-domain.com/studio-banner.jpg" 
                          className="pl-14 h-14 rounded-xl bg-background/50 border-border/50 focus:border-primary/50 font-mono text-sm" 
                          disabled={!isCustomBrandingActive}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-10">
              <Card className="bg-card/40 backdrop-blur-md border-border/50 rounded-[2.5rem] overflow-hidden shadow-2xl border-t-4 border-t-primary luxury-card-hover">
                <CardHeader className="pb-4 pt-10 px-8">
                  <CardTitle className="text-[11px] font-bold uppercase tracking-[0.5em] text-primary text-center">Live Identity Preview</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="relative h-64 w-full bg-muted overflow-hidden flex items-center justify-center group">
                    {formData.studioBanner && isCustomBrandingActive ? (
                      <img src={formData.studioBanner} className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:scale-110 transition-transform duration-[3s]" alt="Banner Preview" />
                    ) : (
                      <div className="absolute inset-0 bg-primary/5 flex items-center justify-center">
                        <ImageIcon className="w-16 h-16 text-primary opacity-10 animate-pulse" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <div className="relative z-10 text-center p-8 space-y-4">
                      {formData.studioLogo && isCustomBrandingActive ? (
                        <img src={formData.studioLogo} className="h-12 w-auto mb-2 mx-auto object-contain drop-shadow-2xl" alt="Logo Preview" />
                      ) : (
                        <h3 className="text-2xl font-headline font-bold text-white uppercase tracking-tight drop-shadow-2xl">{formData.studioName || "Untitled Studio"}</h3>
                      )}
                      <p className="text-[10px] text-primary italic font-headline uppercase tracking-[0.4em] drop-shadow-xl">{formData.photographerName || "Principal Photographer"}</p>
                    </div>
                  </div>
                  <div className="p-10 text-center space-y-6">
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">Studio Header Preview</p>
                    {!isCustomBrandingActive && (
                       <div className="flex flex-col items-center gap-3 opacity-30 animate-pulse">
                          <img src="/hafash-logo.png" className="h-10 w-auto grayscale brightness-200" alt="Hafash" />
                          <span className="font-headline font-bold text-2xl italic tracking-tighter">Hafash.pk Standard</span>
                       </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Account & Security Tab */}
        <TabsContent value="account" className="animate-in fade-in slide-in-from-left-6 duration-500">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <Card className="bg-card/40 backdrop-blur-md border-border/50 rounded-[2.5rem] overflow-hidden shadow-2xl luxury-card-hover">
              <CardHeader className="border-b border-border/30 bg-background/40 px-10 py-10">
                <CardTitle className="text-3xl font-headline font-bold flex items-center gap-4">
                  <Shield className="w-8 h-8 text-primary" /> Security & Access
                </CardTitle>
                <CardDescription className="text-sm font-medium italic mt-1">Manage the vault credentials and primary authentication rules.</CardDescription>
              </CardHeader>
              <CardContent className="p-10 space-y-10">
                <div className="space-y-6">
                  <div>
                    <Label className="text-[11px] font-bold uppercase tracking-[0.4em] text-muted-foreground ml-1">Primary Studio Email</Label>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-3 p-6 bg-background/60 rounded-3xl border border-border/40 gap-6 shadow-inner group">
                      <span className="font-mono text-base truncate max-w-full text-primary/90">{user?.email}</span>
                      {user?.emailVerified ? (
                        <Badge className="w-fit bg-green-500/20 text-green-500 border border-green-500/30 gap-2.5 text-[10px] font-bold py-1.5 px-4 rounded-xl shadow-lg shadow-green-500/10">
                          <CheckCircle2 className="w-4 h-4" /> Verified Identity
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="w-fit bg-destructive/20 text-destructive border border-destructive/30 text-[10px] font-bold py-1.5 px-4 rounded-xl animate-pulse">
                          Unverified Access
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/40 backdrop-blur-md border-border/50 rounded-[2.5rem] overflow-hidden shadow-2xl luxury-card-hover">
              <CardHeader className="border-b border-border/30 bg-background/40 px-10 py-10">
                <CardTitle className="text-3xl font-headline font-bold flex items-center gap-4">
                  <HardDrive className="w-8 h-8 text-primary" /> Cloud Subscription
                </CardTitle>
                <CardDescription className="text-sm font-medium italic mt-1">Overview of your enterprise-grade cloud storage and active tier.</CardDescription>
              </CardHeader>
              <CardContent className="p-10 flex flex-col justify-between h-full min-h-[350px]">
                <div className="space-y-10">
                  <div className="flex justify-between items-center bg-primary/5 p-8 rounded-[2rem] border border-primary/20 shadow-xl group">
                    <div className="space-y-2">
                      <p className="text-[11px] font-bold uppercase tracking-[0.4em] text-muted-foreground group-hover:text-primary transition-colors">Active Subscription</p>
                      <h4 className="text-4xl font-headline font-bold text-primary tracking-tighter">
                        {profileLoading ? <Skeleton className="h-10 w-24" /> : `${profile?.planId?.toUpperCase() || 'STARTER'} TIER`}
                      </h4>
                    </div>
                    <Badge variant="outline" className="border-primary/50 text-primary px-5 py-2 text-[10px] font-bold uppercase tracking-[0.2em] shadow-lg shadow-primary/10">STUDIO ACTIVE</Badge>
                  </div>
                </div>
                <div className="mt-10">
                  <Link href="/storage" className="block">
                    <Button className="w-full h-16 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold shadow-2xl shadow-primary/20 text-base uppercase tracking-widest transition-all hover:scale-105">
                      Upgrade Studio Thresholds
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Gallery Defaults Tab */}
        <TabsContent value="gallery" className="animate-in fade-in slide-in-from-left-6 duration-500">
          <Card className="max-w-5xl bg-card/40 backdrop-blur-md border-border/50 rounded-[3rem] overflow-hidden shadow-2xl mx-auto lg:mx-0 luxury-card-hover">
            <CardHeader className="border-b border-border/30 bg-background/40 px-10 py-10">
              <CardTitle className="text-3xl font-headline font-bold">Smart Event Defaults</CardTitle>
              <CardDescription className="text-sm font-medium italic mt-1">Configure automated logic for every new luxury event created in your studio.</CardDescription>
            </CardHeader>
            <CardContent className="p-10 grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-16">
               <div className="space-y-10">
                  <div className="flex items-center justify-between p-8 bg-background/50 rounded-[2rem] border border-border/30 group transition-all hover:border-primary/40 shadow-xl">
                    <div className="space-y-2">
                      <Label className="text-lg font-bold flex items-center gap-3">
                        <Zap className="w-5 h-5 text-primary animate-pulse" />
                        Dynamic Watermark
                      </Label>
                      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest">Always protect preview assets.</p>
                    </div>
                    <Switch 
                      checked={formData.defaultWatermark} 
                      onCheckedChange={(val) => updateField('defaultWatermark', val)}
                      className="data-[state=checked]:bg-primary"
                    />
                  </div>

                  <div className="flex items-center justify-between p-8 bg-background/50 rounded-[2rem] border border-border/30 group transition-all hover:border-primary/40 shadow-xl">
                    <div className="space-y-2">
                      <Label className="text-lg font-bold flex items-center gap-3">
                        <HardDrive className="w-5 h-5 text-primary" />
                        Universal Downloads
                      </Label>
                      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest">Enable high-res retrieval by default.</p>
                    </div>
                    <Switch 
                      checked={formData.defaultAllowDownloads} 
                      onCheckedChange={(val) => updateField('defaultAllowDownloads', val)}
                      className="data-[state=checked]:bg-primary"
                    />
                  </div>
               </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="animate-in fade-in slide-in-from-left-6 duration-500">
           <Card className="max-w-5xl bg-card/40 backdrop-blur-md border-border/50 rounded-[3rem] overflow-hidden shadow-2xl mx-auto lg:mx-0 luxury-card-hover">
            <CardHeader className="border-b border-border/30 bg-background/40 px-10 py-10">
              <CardTitle className="text-3xl font-headline font-bold">Studio Flow Telemetry</CardTitle>
              <CardDescription className="text-sm font-medium italic mt-1">Configure how you receive real-time updates regarding client engagement and vault access.</CardDescription>
            </CardHeader>
            <CardContent className="p-10 space-y-10">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="flex items-center justify-between p-8 bg-background/50 rounded-[2.5rem] border border-border/30 hover:border-primary/40 transition-all shadow-xl">
                    <div className="space-y-2 pr-6">
                      <Label className="text-lg font-bold">Asset Selections</Label>
                      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest">Notify when a client hearts a masterpiece.</p>
                    </div>
                    <Switch 
                      checked={formData.notifyNewFavorite} 
                      onCheckedChange={(val) => updateField('notifyNewFavorite', val)}
                      className="data-[state=checked]:bg-primary"
                    />
                  </div>

                  <div className="flex items-center justify-between p-8 bg-background/50 rounded-[2.5rem] border border-border/30 hover:border-primary/40 transition-all shadow-xl">
                    <div className="space-y-2 pr-6">
                      <Label className="text-lg font-bold">Engagement Access</Label>
                      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest">Notify on initial gallery penetration.</p>
                    </div>
                    <Switch 
                      checked={formData.notifyNewView} 
                      onCheckedChange={(val) => updateField('notifyNewView', val)}
                      className="data-[state=checked]:bg-primary"
                    />
                  </div>
               </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}