
"use client";

import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { User, Shield, Camera, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';

export default function SettingsPage() {
  const { user, loading: authLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const handleSave = () => {
    toast({ title: "Settings Saved", description: "Your studio preferences have been updated." });
  };

  if (authLoading) {
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
        <Button className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full gap-2 px-8" onClick={handleSave}>
          <Save className="w-4 h-4" /> Save Changes
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Profile Section */}
          <Card className="bg-card border-border/50 rounded-3xl overflow-hidden">
            <CardHeader className="border-b border-border/30 bg-background/30">
              <CardTitle className="text-xl font-headline font-bold flex items-center gap-2">
                <User className="w-5 h-5 text-primary" /> Professional Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="flex flex-col md:flex-row gap-8 items-center mb-6">
                <div className="relative">
                  <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-primary/20">
                    <img src={user.photoURL || "https://picsum.photos/seed/photographer/400/400"} className="w-full h-full object-cover" alt="Profile" />
                  </div>
                  <Button size="icon" className="absolute bottom-0 right-0 rounded-full bg-primary text-primary-foreground h-10 w-10">
                    <Camera className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex-1 space-y-4 w-full">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Full Name</Label>
                      <Input defaultValue={user.displayName || ""} className="rounded-xl bg-background/50 border-border/50" />
                    </div>
                    <div className="space-y-2">
                      <Label>Studio Email</Label>
                      <Input defaultValue={user.email || ""} readOnly className="rounded-xl bg-background/50 border-border/50 opacity-70" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Studio Tagline</Label>
                <Input placeholder="Luxury wedding photography capturing timeless emotions." className="rounded-xl bg-background/50 border-border/50" />
              </div>
            </CardContent>
          </Card>

          {/* Security */}
          <Card className="bg-card border-border/50 rounded-3xl overflow-hidden">
            <CardHeader className="border-b border-border/30 bg-background/30">
              <CardTitle className="text-xl font-headline font-bold flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" /> Security & Access
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>New Password</Label>
                    <Input type="password" placeholder="••••••••" className="rounded-xl bg-background/50 border-border/50" />
                  </div>
                  <div className="space-y-2">
                    <Label>Confirm Password</Label>
                    <Input type="password" placeholder="••••••••" className="rounded-xl bg-background/50 border-border/50" />
                  </div>
               </div>
               <Button variant="outline" className="rounded-xl border-border/50">Enable 2FA Authentication</Button>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Settings */}
        <div className="space-y-8">
           <Card className="bg-card border-border/50 rounded-3xl overflow-hidden">
            <CardHeader className="border-b border-border/30 bg-background/30">
              <CardTitle className="text-sm uppercase tracking-widest text-primary font-bold">Studio Defaults</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
               <div className="flex items-center justify-between">
                 <div className="space-y-0.5">
                   <Label>Auto-Watermark</Label>
                   <p className="text-xs text-muted-foreground">Apply to all new galleries</p>
                 </div>
                 <Switch defaultChecked className="data-[state=checked]:bg-primary" />
               </div>
               <div className="flex items-center justify-between">
                 <div className="space-y-0.5">
                   <Label>AI Highlights</Label>
                   <p className="text-xs text-muted-foreground">Analyze sets on upload</p>
                 </div>
                 <Switch defaultChecked className="data-[state=checked]:bg-primary" />
               </div>
               <div className="flex items-center justify-between">
                 <div className="space-y-0.5">
                   <Label>Email Notifications</Label>
                   <p className="text-xs text-muted-foreground">Client view alerts</p>
                 </div>
                 <Switch defaultChecked className="data-[state=checked]:bg-primary" />
               </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border/50 rounded-3xl overflow-hidden border-destructive/20">
            <CardHeader className="border-b border-border/30 bg-destructive/5">
              <CardTitle className="text-sm uppercase tracking-widest text-destructive font-bold">Danger Zone</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-xs text-muted-foreground mb-4">Deleting your account is permanent and will remove all galleries and assets.</p>
              <Button variant="destructive" className="w-full rounded-xl">Delete Studio Account</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
