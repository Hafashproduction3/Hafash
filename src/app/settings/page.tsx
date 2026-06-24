
"use client";

import { useUser, useFirestore, useDoc } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { User, Shield, Camera, Save, Loader2, Briefcase, Phone, Image as ImageIcon } from 'lucide-react';
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

  const handleSave = async () => {
    if (!firestore || !user) return;
    setSaving(true);

    const updateData = {
      ...formData,
      userId: user.uid,
      updatedAt: new Date().toISOString(),
    };

    try {
      const docRef = doc(firestore, 'users', user.uid);
      await setDoc(docRef, updateData, { merge: true });
      toast({ title: "Settings Saved", description: "Your studio preferences have been updated." });
    } catch (err: any) {
      if (err.code === 'permission-denied') {
        const permissionError = new FirestorePermissionError({
          path: `users/${user.uid}`,
          operation: 'update',
          requestResourceData: updateData,
        });
        errorEmitter.emit('permission-error', permissionError);
      } else {
        toast({ variant: "destructive", title: "Save Failed", description: err.message });
      }
    } finally {
      setSaving(false);
    }
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
          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full gap-2 px-8" 
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card className="bg-card border-border/50 rounded-3xl overflow-hidden shadow-xl">
            <CardHeader className="border-b border-border/30 bg-background/30">
              <CardTitle className="text-xl font-headline font-bold flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-primary" /> Studio Identity
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Studio Name</Label>
                  <Input 
                    value={formData.studioName} 
                    onChange={(e) => setFormData({ ...formData, studioName: e.target.value })}
                    placeholder="e.g. Cinematic Memories" 
                    className="rounded-xl bg-background/50 border-border/50" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>WhatsApp Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 w-4 h-4 text-primary" />
                    <Input 
                      value={formData.whatsappNumber} 
                      onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
                      placeholder="e.g. 923001234567" 
                      className="pl-10 rounded-xl bg-background/50 border-border/50" 
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
                      className="pl-10 rounded-xl bg-background/50 border-border/50" 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Studio Logo URL (Optional)</Label>
                  <div className="relative">
                    <ImageIcon className="absolute left-3 top-3 w-4 h-4 text-primary" />
                    <Input 
                      value={formData.studioLogo} 
                      onChange={(e) => setFormData({ ...formData, studioLogo: e.target.value })}
                      placeholder="https://..." 
                      className="pl-10 rounded-xl bg-background/50 border-border/50" 
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border/50 rounded-3xl overflow-hidden shadow-xl">
            <CardHeader className="border-b border-border/30 bg-background/30">
              <CardTitle className="text-xl font-headline font-bold flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" /> Account Security
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Studio Email</Label>
                    <Input defaultValue={user.email || ""} readOnly className="rounded-xl bg-background/50 border-border/50 opacity-70" />
                  </div>
               </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
           <Card className="bg-card border-border/50 rounded-3xl overflow-hidden">
            <CardHeader className="border-b border-border/30 bg-background/30">
              <CardTitle className="text-sm uppercase tracking-widest text-primary font-bold">Preferences</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
               <div className="flex items-center justify-between">
                 <div className="space-y-0.5">
                   <Label>Auto-Watermark</Label>
                   <p className="text-xs text-muted-foreground">Enabled for all previews</p>
                 </div>
                 <Switch defaultChecked disabled className="data-[state=checked]:bg-primary" />
               </div>
               <div className="pt-4 border-t border-border/30">
                 <p className="text-[10px] text-muted-foreground italic">Studio configuration is encrypted and synced across your photographer account.</p>
               </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
