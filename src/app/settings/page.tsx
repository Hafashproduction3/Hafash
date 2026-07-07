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
  Zap
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

export default function SettingsPage() {
  const { user, loading: authLoading } = useUser();
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

  if (authLoading || profileLoading) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Loader2 className="w-10 h-10 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      {/* Dynamic Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-border/50 pb-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 hover:bg-primary/10" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="space-y-1">
            <h1 className="text-3xl lg:text-4xl font-headline font-bold tracking-tight">Studio Control Center</h1>
            <div className="flex flex-wrap items-center gap-3 lg:gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              <span className="flex items-center gap-1.5"><Settings className="w-3 h-3 text-primary" /> Production Environment Active</span>
              {isDirty && (
                <span className="flex items-center gap-1.5 text-amber-500">
                  <AlertTriangle className="w-3 h-3" /> Unsaved Changes
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="w-full md:w-auto">
          <Button 
            className={cn(
              "w-full md:w-auto rounded-xl gap-2 px-8 h-12 font-bold shadow-lg transition-all",
              isDirty ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/20" : "bg-muted text-muted-foreground cursor-not-allowed"
            )} 
            onClick={handleSave}
            disabled={saving || !isDirty}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
        <TabsList className="bg-card/50 border border-border/50 p-1 rounded-2xl h-auto flex flex-wrap lg:inline-flex w-full lg:w-auto">
          <TabsTrigger value="studio" className="flex-1 lg:flex-none rounded-xl px-4 lg:px-6 py-3 lg:py-2.5 font-bold text-[9px] lg:text-[10px] uppercase tracking-wider">
            <Briefcase className="w-3.5 h-3.5 mr-1.5 lg:mr-2" /> Studio
          </TabsTrigger>
          <TabsTrigger value="account" className="flex-1 lg:flex-none rounded-xl px-4 lg:px-6 py-3 lg:py-2.5 font-bold text-[9px] lg:text-[10px] uppercase tracking-wider">
            <User className="w-3.5 h-3.5 mr-1.5 lg:mr-2" /> Account
          </TabsTrigger>
          <TabsTrigger value="gallery" className="flex-1 lg:flex-none rounded-xl px-4 lg:px-6 py-3 lg:py-2.5 font-bold text-[9px] lg:text-[10px] uppercase tracking-wider">
            <Camera className="w-3.5 h-3.5 mr-1.5 lg:mr-2" /> Defaults
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex-1 lg:flex-none rounded-xl px-4 lg:px-6 py-3 lg:py-2.5 font-bold text-[9px] lg:text-[10px] uppercase tracking-wider">
            <Bell className="w-3.5 h-3.5 mr-1.5 lg:mr-2" /> Notifications
          </TabsTrigger>
        </TabsList>

        {/* Studio Profile Tab */}
        <TabsContent value="studio" className="animate-in fade-in slide-in-from-left-4 duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <Card className="bg-card border-border/50 rounded-[2rem] overflow-hidden shadow-xl">
                <CardHeader className="border-b border-border/30 bg-background/30 px-6 lg:px-8 py-6">
                  <CardTitle className="text-xl font-headline font-bold">Studio Identity</CardTitle>
                  <CardDescription className="text-xs lg:text-sm">Professional branding used across client-facing galleries.</CardDescription>
                </CardHeader>
                <CardContent className="p-6 lg:p-8 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Studio Name *</Label>
                      <Input 
                        value={formData.studioName} 
                        onChange={(e) => updateField('studioName', e.target.value)}
                        placeholder="e.g. Cinematic Memories" 
                        className="rounded-xl h-12 bg-background/50 border-border/50" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">WhatsApp Number *</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-4 w-4 h-4 text-primary" />
                        <Input 
                          value={formData.whatsappNumber} 
                          onChange={(e) => updateField('whatsappNumber', e.target.value)}
                          placeholder="+923001234567" 
                          className="pl-10 h-12 rounded-xl bg-background/50 border-border/50" 
                        />
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Photographer Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-4 w-4 h-4 text-primary" />
                        <Input 
                          value={formData.photographerName} 
                          onChange={(e) => updateField('photographerName', e.target.value)}
                          placeholder="Your Name" 
                          className="pl-10 h-12 rounded-xl bg-background/50 border-border/50" 
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Studio Website</Label>
                      <div className="relative">
                        <Globe className="absolute left-3 top-4 w-4 h-4 text-primary" />
                        <Input 
                          value={formData.website} 
                          onChange={(e) => updateField('website', e.target.value)}
                          placeholder="https://yourstudio.com" 
                          className="pl-10 h-12 rounded-xl bg-background/50 border-border/50" 
                        />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Studio Logo URL</Label>
                    <div className="relative">
                      <ImageIcon className="absolute left-3 top-4 w-4 h-4 text-primary" />
                      <Input 
                        value={formData.studioLogo} 
                        onChange={(e) => updateField('studioLogo', e.target.value)}
                        placeholder="https://your-domain.com/logo.png" 
                        className="pl-10 h-12 rounded-xl bg-background/50 border-border/50" 
                      />
                    </div>
                    <p className="text-[9px] lg:text-[10px] text-muted-foreground italic ml-1">Recommended: 400x120px PNG with transparent background.</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-8">
              <Card className="bg-card border-border/50 rounded-[2.5rem] overflow-hidden shadow-lg border-t-4 border-t-primary">
                <CardHeader className="pb-4">
                  <CardTitle className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">Live Branding Preview</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center text-center p-8 bg-background/40">
                  {formData.studioLogo ? (
                    <img src={formData.studioLogo} className="h-12 lg:h-16 w-auto mb-6 object-contain" alt="Logo Preview" />
                  ) : (
                    <div className="h-14 lg:h-16 w-14 lg:w-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6">
                      <ImageIcon className="w-7 lg:w-8 h-7 lg:h-8" />
                    </div>
                  )}
                  <h3 className="text-xl lg:text-2xl font-headline font-bold leading-tight">{formData.studioName || "Untitled Studio"}</h3>
                  <p className="text-xs lg:text-sm text-primary italic font-headline mt-1">{formData.photographerName || "Professional Photographer"}</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Account & Storage Tab */}
        <TabsContent value="account" className="animate-in fade-in slide-in-from-left-4 duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="bg-card border-border/50 rounded-[2rem] overflow-hidden shadow-xl">
              <CardHeader className="border-b border-border/30 bg-background/30 px-6 lg:px-8 py-6">
                <CardTitle className="text-xl font-headline font-bold flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" /> Security & Access
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 lg:p-8 space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Primary Email</Label>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-1 p-4 bg-background/50 rounded-2xl border border-border/30 gap-4">
                      <span className="font-mono text-xs lg:text-sm truncate max-w-full">{user?.email}</span>
                      {user?.emailVerified ? (
                        <Badge className="w-fit bg-green-500/20 text-green-500 border-green-500/30 gap-1.5 text-[9px] py-0.5">
                          <CheckCircle2 className="w-3 h-3" /> Verified
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="w-fit bg-destructive/20 text-destructive border-destructive/30 text-[9px] py-0.5">
                          Unverified
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 flex flex-col sm:flex-row gap-4">
                    <Button variant="outline" className="rounded-xl font-bold h-12 border-border/50 flex-1 text-xs lg:text-sm" onClick={() => router.push('/verify-email')}>
                      Manage Verification
                    </Button>
                    <Button variant="outline" className="rounded-xl font-bold h-12 border-border/50 flex-1 text-xs lg:text-sm" onClick={() => router.push('/login')}>
                      <Lock className="w-4 h-4 mr-2" /> Reset Password
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border/50 rounded-[2rem] overflow-hidden shadow-xl">
              <CardHeader className="border-b border-border/30 bg-background/30 px-6 lg:px-8 py-6">
                <CardTitle className="text-xl font-headline font-bold flex items-center gap-2">
                  <HardDrive className="w-5 h-5 text-primary" /> Storage & Plan
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 lg:p-8 flex flex-col justify-between h-full min-h-[250px]">
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Active Subscription</p>
                      <h4 className="text-xl lg:text-2xl font-headline font-bold text-primary">{profile?.planId?.toUpperCase() || 'STARTER'} TIER</h4>
                    </div>
                    <Badge variant="outline" className="border-primary/30 text-primary px-3 lg:px-4 py-1 text-[9px] font-bold">ACTIVE</Badge>
                  </div>
                  <div className="p-5 lg:p-6 bg-primary/5 border border-primary/20 rounded-2xl">
                     <p className="text-[11px] lg:text-xs text-muted-foreground leading-relaxed italic">
                       Enterprise-grade master asset storage active. Your high-resolution files are protected by end-to-end encryption.
                     </p>
                  </div>
                </div>
                <div className="mt-8">
                  <Link href="/storage">
                    <Button className="w-full h-12 lg:h-14 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold shadow-lg shadow-primary/20 text-xs lg:text-sm">
                      Upgrade Studio Quotas
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Gallery Defaults Tab */}
        <TabsContent value="gallery" className="animate-in fade-in slide-in-from-left-4 duration-300">
          <Card className="max-w-4xl bg-card border-border/50 rounded-[2rem] overflow-hidden shadow-xl mx-auto lg:mx-0">
            <CardHeader className="border-b border-border/30 bg-background/30 px-6 lg:px-8 py-6">
              <CardTitle className="text-xl font-headline font-bold">New Event Defaults</CardTitle>
              <CardDescription className="text-xs lg:text-sm">Configure automatic settings for every new gallery you create.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 lg:p-8 grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10">
               <div className="space-y-6 lg:space-y-8">
                  <div className="flex items-center justify-between p-4 bg-background/50 rounded-2xl border border-border/30">
                    <div className="space-y-0.5">
                      <Label className="text-xs lg:text-sm font-bold flex items-center gap-2">
                        <Zap className="w-3.5 h-3.5 text-primary" />
                        Dynamic Watermark
                      </Label>
                      <p className="text-[9px] lg:text-[10px] text-muted-foreground">Always protect unpaid preview assets.</p>
                    </div>
                    <Switch 
                      checked={formData.defaultWatermark} 
                      onCheckedChange={(val) => updateField('defaultWatermark', val)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-background/50 rounded-2xl border border-border/30">
                    <div className="space-y-0.5">
                      <Label className="text-xs lg:text-sm font-bold flex items-center gap-2">
                        <HardDrive className="w-3.5 h-3.5 text-primary" />
                        Allow Downloads
                      </Label>
                      <p className="text-[9px] lg:text-[10px] text-muted-foreground">Start with downloads enabled.</p>
                    </div>
                    <Switch 
                      checked={formData.defaultAllowDownloads} 
                      onCheckedChange={(val) => updateField('defaultAllowDownloads', val)}
                    />
                  </div>
               </div>

               <div className="space-y-6 lg:space-y-8">
                  <div className="flex items-center justify-between p-4 bg-background/50 rounded-2xl border border-border/30">
                    <div className="space-y-0.5">
                      <Label className="text-xs lg:text-sm font-bold flex items-center gap-2">
                        <Globe className="w-3.5 h-3.5 text-primary" />
                        Public Accessibility
                      </Label>
                      <p className="text-[9px] lg:text-[10px] text-muted-foreground">Galleries are public by default.</p>
                    </div>
                    <Switch 
                      checked={formData.defaultPublicLink} 
                      onCheckedChange={(val) => updateField('defaultPublicLink', val)}
                    />
                  </div>
                  
                  <div className="p-4 bg-primary/5 border border-dashed border-primary/20 rounded-2xl">
                     <p className="text-[9px] lg:text-[10px] text-primary font-bold uppercase tracking-widest mb-1">System Configuration Note</p>
                     <p className="text-[9px] lg:text-[10px] text-muted-foreground leading-relaxed italic">
                       Changing these defaults will not affect existing galleries. These settings only apply to future luxury events.
                     </p>
                  </div>
               </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="animate-in fade-in slide-in-from-left-4 duration-300">
           <Card className="max-w-4xl bg-card border-border/50 rounded-[2rem] overflow-hidden shadow-xl mx-auto lg:mx-0">
            <CardHeader className="border-b border-border/30 bg-background/30 px-6 lg:px-8 py-6">
              <CardTitle className="text-xl font-headline font-bold">Communication Workflow</CardTitle>
              <CardDescription className="text-xs lg:text-sm">Manage how the Studio Flow notifies you of client interactions.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 lg:p-8 space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center justify-between p-5 bg-background/50 rounded-2xl border border-border/30">
                    <div className="space-y-0.5 pr-4">
                      <Label className="text-xs lg:text-sm font-bold">New Favorites</Label>
                      <p className="text-[9px] lg:text-[10px] text-muted-foreground">Notify when a client hearts a photo.</p>
                    </div>
                    <Switch 
                      checked={formData.notifyNewFavorite} 
                      onCheckedChange={(val) => updateField('notifyNewFavorite', val)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-5 bg-background/50 rounded-2xl border border-border/30">
                    <div className="space-y-0.5 pr-4">
                      <Label className="text-xs lg:text-sm font-bold">Gallery Access</Label>
                      <p className="text-[9px] lg:text-[10px] text-muted-foreground">Notify on first client view.</p>
                    </div>
                    <Switch 
                      checked={formData.notifyNewView} 
                      onCheckedChange={(val) => updateField('notifyNewView', val)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-5 bg-background/50 rounded-2xl border border-border/30">
                    <div className="space-y-0.5 pr-4">
                      <Label className="text-xs lg:text-sm font-bold">Payment Confirmations</Label>
                      <p className="text-[9px] lg:text-[10px] text-muted-foreground">Notify when status is marked paid.</p>
                    </div>
                    <Switch 
                      checked={formData.notifyPaymentReceived} 
                      onCheckedChange={(val) => updateField('notifyPaymentReceived', val)}
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
