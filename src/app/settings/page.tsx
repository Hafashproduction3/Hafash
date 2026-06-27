"use client";

import { useUser, useFirestore, useDoc } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { User, Shield, Camera, Save, Loader2, Briefcase, Phone, Image as ImageIcon, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { doc, setDoc } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

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
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

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
    const updateData = {
      ...formData,
      userId: user.uid,
      updatedAt: new Date().toISOString(),
    };

    const docRef = doc(firestore, 'users', user.uid);
    setDoc(docRef, updateData, { merge: true })
      .then(() => {
        toast({ title: "Settings Saved", description: "Your studio preferences have been updated." });
      })
      .catch(async (err: any) => {
        if (err.code === 'permission-denied') {
          const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'update',
            requestResourceData: updateData,
          });
          errorEmitter.emit('permission-error', permissionError);
        } else {
          toast({ variant: "destructive", title: "Save Failed", description: err.message });
        }
      })
      .finally(() => {
        setSaving(false);
      });
  };

  if (authLoading || profileLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-headline font-bold">Studio Settings</h1>
          <p className="text-muted-foreground mt-2">Manage your professional profile and defaults.</p>
        </div>
        <Button 
          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full gap-2 px-8 h-11 font-bold shadow-lg" 
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving...' : 'Save Changes'}
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
                    required
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
                      required
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
                <Shield className="w-5 h-5 text-primary" /> Account Status
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
               <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex-1 space-y-2">
                    <Label>Authenticated Email</Label>
                    <Input defaultValue={user.email || ""} readOnly className="h-11 rounded-xl bg-muted/30 border-border/50 opacity-70" />
                  </div>
                  <div className="flex items-center gap-3 bg-primary/5 px-6 py-3 rounded-2xl border border-primary/10">
                    <Check className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Identity Verified</p>
                      <p className="text-xs text-muted-foreground">Email: {user.emailVerified ? 'Verified' : 'Pending'}</p>
                    </div>
                  </div>
               </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
           <Card className="bg-card border-border/50 rounded-[2.5rem] overflow-hidden shadow-lg">
            <CardHeader className="border-b border-border/30 bg-background/30">
              <CardTitle className="text-[10px] uppercase tracking-[0.2em] text-primary font-bold">Studio Defaults</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
               <div className="flex items-center justify-between">
                 <div className="space-y-1">
                   <Label className="text-xs">Dynamic Watermark</Label>
                   <p className="text-[9px] text-muted-foreground uppercase">Hafash Studio Standard</p>
                 </div>
                 <Switch defaultChecked disabled className="data-[state=checked]:bg-primary" />
               </div>
               <div className="pt-4 border-t border-border/30">
                 <p className="text-[9px] text-muted-foreground italic leading-relaxed">
                   Studio preferences are encrypted and synchronized with your photographer ID. Changes reflect instantly across all live galleries.
                 </p>
               </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}