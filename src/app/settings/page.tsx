
"use client";

import { useUser, useFirestore, useDoc } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { User, Shield, Camera, Save, Loader2, Briefcase, Phone, Image as ImageIcon, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { doc, setDoc } from 'firebase/firestore';

export default function SettingsPage() {
  const { user, loading: authLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

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
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        studioName: profile.studioName || '',
        photographerName: profile.photographerName || '',
        whatsappNumber: profile.whatsappNumber || '',
        studioLogo: profile.studioLogo || '',
      });
    }
  }, [profile]);

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
        title: "Settings Saved",
        description: "Your studio profile has been updated.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to save settings.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || profileLoading) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="rounded-full" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-4xl font-headline font-bold">Studio Settings</h1>
            <p className="text-muted-foreground mt-2">Manage your professional profile and defaults.</p>
          </div>
        </div>
        <Button 
          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full gap-2 px-8 h-12 font-bold shadow-lg" 
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Changes
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card className="bg-card border-border/50 rounded-[2rem] overflow-hidden shadow-xl">
            <CardHeader className="border-b border-border/30 bg-background/30 px-8 py-6">
              <CardTitle className="text-xl font-headline font-bold flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-primary" /> Studio Identity
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Studio Name *</Label>
                  <Input 
                    value={formData.studioName} 
                    onChange={(e) => setFormData({ ...formData, studioName: e.target.value })}
                    placeholder="e.g. Cinematic Memories" 
                    className="rounded-xl h-11 bg-background/50 border-border/50" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>WhatsApp Number *</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 w-4 h-4 text-primary" />
                    <Input 
                      value={formData.whatsappNumber} 
                      onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
                      placeholder="e.g. +923001234567" 
                      className="pl-10 h-11 rounded-xl bg-background/50 border-border/50" 
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Photographer Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 w-4 h-4 text-primary" />
                    <Input 
                      value={formData.photographerName} 
                      onChange={(e) => setFormData({ ...formData, photographerName: e.target.value })}
                      placeholder="Your Name" 
                      className="pl-10 h-11 rounded-xl bg-background/50 border-border/50" 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Studio Logo URL</Label>
                  <div className="relative">
                    <ImageIcon className="absolute left-3 top-3 w-4 h-4 text-primary" />
                    <Input 
                      value={formData.studioLogo} 
                      onChange={(e) => setFormData({ ...formData, studioLogo: e.target.value })}
                      placeholder="https://..." 
                      className="pl-10 h-11 rounded-xl bg-background/50 border-border/50" 
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border/50 rounded-[2rem] overflow-hidden shadow-xl">
            <CardHeader className="border-b border-border/30 bg-background/30 px-8 py-6">
              <CardTitle className="text-xl font-headline font-bold flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" /> Security
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <p className="text-sm text-muted-foreground mb-4">You are logged in as <strong>{user?.email}</strong></p>
              <Button variant="outline" className="rounded-xl border-border/50" onClick={() => router.push('/verify-email')}>
                Manage Verification
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
