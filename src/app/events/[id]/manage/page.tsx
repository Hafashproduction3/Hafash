"use client";

import { useFirestore, useDoc, useUser } from '@/firebase';
import { useParams, useRouter } from 'next/navigation';
import { 
  Share2, 
  MessageCircle, 
  Link as LinkIcon, 
  Lock, 
  Unlock,
  Trash2, 
  Image as ImageIcon,
  ArrowLeft,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
  CreditCard,
  Globe,
  AlertTriangle,
  CheckCircle2,
  Settings,
  Heart,
  Copy,
  Check,
  Smartphone,
  QrCode,
  Key,
  Shield,
  X,
  ShieldAlert
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { doc, deleteDoc, updateDoc } from 'firebase/firestore';
import Link from 'next/link';
import { useMemo, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export default function EventManagementPage() {
  const params = useParams();
  const id = params?.id as string;
  const firestore = useFirestore();
  const { user, loading: authLoading } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  
  const [origin, setOrigin] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [copiedLink, setCopiedLink] = useState<'gallery' | 'selection' | null>(null);

  // Security Management State
  const [passwordEnabled, setPasswordEnabled] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [savingSecurity, setSavingSecurity] = useState(false);

  // Local state for settings
  const [settings, setSettings] = useState({
    title: '',
    clientName: '',
    description: ''
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const eventRef = useMemo(() => {
    if (!firestore || !id) return null;
    return doc(firestore, 'galleries', id);
  }, [firestore, id]);

  const { data: event, loading: dataLoading, error } = useDoc(eventRef);

  useEffect(() => {
    if (event) {
      setSettings({
        title: event.title || '',
        clientName: event.clientName || '',
        description: event.description || ''
      });
      setPasswordEnabled(!!event.isPasswordProtected);
    }
  }, [event]);

  // Secure Hashing Logic (SHA-256)
  const hashPassword = async (password: string) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleSaveSecurity = async () => {
    if (!eventRef) return;
    
    if (newPassword.length < 6) {
      toast({ variant: "destructive", title: "Security Alert", description: "Password must be at least 6 characters." });
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast({ variant: "destructive", title: "Validation Error", description: "Passwords do not match." });
      return;
    }

    setSavingSecurity(true);
    try {
      const hashed = await hashPassword(newPassword);
      await updateDoc(eventRef, {
        isPasswordProtected: true,
        hashedPassword: hashed,
        updatedAt: new Date().toISOString()
      });
      toast({ title: "Security Enabled", description: "Password protection is now active." });
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast({ variant: "destructive", title: "Sync Failed", description: err.message });
    } finally {
      setSavingSecurity(false);
    }
  };

  const handleTogglePassword = async (enabled: boolean) => {
    if (!eventRef) return;
    
    if (!enabled) {
      // Remove protection immediately
      try {
        await updateDoc(eventRef, {
          isPasswordProtected: false,
          hashedPassword: null,
          updatedAt: new Date().toISOString()
        });
        toast({ title: "Security Disabled", description: "Password protection has been removed." });
        setPasswordEnabled(false);
      } catch (err: any) {
        toast({ variant: "destructive", title: "Update Failed", description: err.message });
      }
    } else {
      // Just show the UI to set a password
      setPasswordEnabled(true);
    }
  };

  const handleUpdateSettings = async () => {
    if (!eventRef) return;
    try {
      await updateDoc(eventRef, { ...settings, updatedAt: new Date().toISOString() });
      toast({ title: "Settings Saved", description: "Gallery metadata updated successfully." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Update Failed", description: err.message });
    }
  };

  const confirmDelete = async () => {
    if (!eventRef || deleteConfirmText !== 'DELETE') return;
    setIsDeleting(true);
    setShowDeleteDialog(false);
    try {
      await deleteDoc(eventRef);
      toast({ title: "Event Deleted" });
      router.replace('/dashboard');
    } catch (err: any) {
      setIsDeleting(false);
      toast({ variant: "destructive", title: "Delete Failed", description: err.message });
    }
  };

  const updateToggle = (field: string, value: any) => {
    if (!eventRef) return;
    const updateData = { [field]: value, updatedAt: new Date().toISOString() };
    
    if (field === 'isPaid' && value === true) {
      updateData.isLocked = false;
    } else if (field === 'isPaid' && value === false) {
      updateData.isLocked = true;
    }

    updateDoc(eventRef, updateData)
      .then(() => {
        toast({ title: "Status Updated" });
      })
      .catch((err) => {
        toast({ variant: "destructive", title: "Error", description: err.message });
      });
  };

  const handleCopy = (text: string, type: 'gallery' | 'selection') => {
    navigator.clipboard.writeText(text);
    setCopiedLink(type);
    toast({ title: "Link Copied" });
    setTimeout(() => setCopiedLink(null), 2000);
  };

  if (authLoading || dataLoading) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-10 h-10 animate-spin text-primary" />
    </div>
  );

  if (!isDeleting && (error || !event)) return (
    <div className="text-center py-20">
      <h2 className="text-2xl font-headline font-bold">Event not found</h2>
      <Button className="mt-6" onClick={() => router.push('/dashboard')}>Back to Dashboard</Button>
    </div>
  );

  const galleryUrl = `${origin}/gallery/${event.slug || event.id}`;
  const selectionUrl = event.albumLinkToken ? `${origin}/album/${event.albumLinkToken}` : '';

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-border/50 pb-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/10" onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="space-y-1">
            <h1 className="text-4xl font-headline font-bold tracking-tight">{event.title}</h1>
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              <span className="text-primary">{event.category}</span>
              <span className="opacity-30">•</span>
              <span>Created {event.createdAt ? new Date(event.createdAt).toLocaleDateString() : '--'}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <Link href={`/gallery/${event.slug || event.id}`} target="_blank">
             <Button variant="outline" className="rounded-xl gap-2 font-bold border-border/50 hover:bg-primary/5 hover:text-primary transition-all">
               <Eye className="w-4 h-4" /> Live Preview
             </Button>
          </Link>
          <Link href={`/events/${id}/upload`}>
            <Button className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold gap-2 shadow-lg shadow-primary/20">
              <ImageIcon className="w-4 h-4" /> Add Photos
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          
          {/* Gallery Security - NEW PASSWORD MANAGEMENT */}
          <Card className="bg-card border-border/50 rounded-[2rem] overflow-hidden shadow-xl">
            <CardHeader className="bg-primary/5 border-b border-border/30 px-8 py-6">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-headline font-bold flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary" /> Gallery Security
                  </CardTitle>
                  <CardDescription>Enforce password protection for client access.</CardDescription>
                </div>
                <Badge variant="outline" className="text-[8px] tracking-[0.2em] font-bold border-primary/30 text-primary">
                  SECURITY VAULT
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="flex items-center justify-between p-5 bg-background/50 rounded-2xl border border-border/30">
                <div className="space-y-1">
                  <Label className="text-sm font-bold flex items-center gap-2">
                    <Lock className={cn("w-3.5 h-3.5", event.isPasswordProtected ? "text-primary" : "text-muted-foreground")} />
                    Enable Password Protection
                  </Label>
                  <p className="text-[10px] text-muted-foreground italic">Restrict gallery access to authorized clients only.</p>
                </div>
                <Switch 
                  checked={passwordEnabled} 
                  onCheckedChange={handleTogglePassword}
                />
              </div>

              {passwordEnabled && (
                <div className="space-y-6 pt-2 animate-in fade-in slide-in-from-top-2">
                  {event.isPasswordProtected && (
                    <div className="flex items-center gap-3 p-4 bg-green-500/5 border border-green-500/20 rounded-xl">
                      <ShieldCheck className="w-5 h-5 text-green-500" />
                      <span className="text-xs font-bold text-green-500 uppercase tracking-widest">Protection Active & Encrypted</span>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">New Access Password</Label>
                      <div className="relative">
                        <Key className="absolute left-3 top-3.5 w-4 h-4 text-primary" />
                        <Input 
                          type={showPass ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Min. 6 characters"
                          className="pl-10 h-12 bg-background/50 border-border/50 rounded-xl"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Confirm Password</Label>
                      <div className="relative">
                        <CheckCircle2 className="absolute left-3 top-3.5 w-4 h-4 text-primary" />
                        <Input 
                          type={showPass ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Repeat password"
                          className="pl-10 h-12 bg-background/50 border-border/50 rounded-xl"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-[10px] font-bold uppercase tracking-widest"
                      onClick={() => setShowPass(!showPass)}
                    >
                      {showPass ? "Hide Passwords" : "Show Passwords"}
                    </Button>
                    <Button 
                      className="rounded-xl px-8 h-12 font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
                      onClick={handleSaveSecurity}
                      disabled={savingSecurity || !newPassword || !confirmPassword}
                    >
                      {savingSecurity ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                      Save Password Settings
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Visibility Controls */}
          <Card className="bg-card border-border/50 rounded-[2rem] overflow-hidden shadow-xl">
            <CardHeader className="bg-primary/5 border-b border-border/30 px-8 py-6">
              <CardTitle className="text-xl font-headline font-bold flex items-center gap-2">
                <Globe className="w-5 h-5 text-primary" /> Visibility & Delivery
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center justify-between p-4 bg-background/50 rounded-2xl border border-border/30">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold">Public Gallery</Label>
                    <p className="text-[10px] text-muted-foreground">Toggle visibility via direct slug.</p>
                  </div>
                  <Switch checked={event.isPublic} onCheckedChange={(val) => updateToggle('isPublic', val)} />
                </div>
                <div className="flex items-center justify-between p-4 bg-background/50 rounded-2xl border border-border/30">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold">Client Downloads</Label>
                    <p className="text-[10px] text-muted-foreground">Enable high-res master saving.</p>
                  </div>
                  <Switch checked={!event.isLocked} onCheckedChange={(val) => updateToggle('isLocked', !val)} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Settings & Cover */}
          <Card className="bg-card border-border/50 rounded-[2rem] overflow-hidden shadow-xl">
            <CardHeader className="border-b border-border/30 px-8 py-6">
              <CardTitle className="text-xl font-headline font-bold flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" /> Event Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Gallery Title</Label>
                  <Input value={settings.title} onChange={(e) => setSettings({...settings, title: e.target.value})} className="rounded-xl h-12 bg-background/50 border-border/50" />
                </div>
                <div className="space-y-2">
                  <Label>Client Name</Label>
                  <Input value={settings.clientName} onChange={(e) => setSettings({...settings, clientName: e.target.value})} className="rounded-xl h-12 bg-background/50 border-border/50" />
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <Button className="rounded-xl px-10 h-12 font-bold" onClick={handleUpdateSettings}>Save Metadata</Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Stats & Sharing */}
        <div className="space-y-8">
          <Card className="bg-card border-border/50 rounded-[2.5rem] overflow-hidden shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">Live Insights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-background/50 p-4 rounded-2xl border border-border/30 text-center">
                  <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Assets</p>
                  <p className="text-2xl font-headline font-bold">{event.items?.length || 0}</p>
                </div>
                <div className="bg-background/50 p-4 rounded-2xl border border-border/30 text-center">
                  <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Views</p>
                  <p className="text-2xl font-headline font-bold">{event.viewCount || '--'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border/50 rounded-[2.5rem] overflow-hidden shadow-lg">
            <CardHeader className="border-b border-border/30">
              <CardTitle className="text-sm font-headline font-bold flex items-center gap-2">
                <Share2 className="w-4 h-4 text-primary" /> Sharing Suite
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-3">
                <Label className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground">Gallery URL</Label>
                <div className="flex gap-2">
                  <Input readOnly value={galleryUrl} className="h-10 text-[10px] bg-background border-border/50 rounded-xl" />
                  <Button size="icon" variant="outline" className="rounded-xl shrink-0" onClick={() => handleCopy(galleryUrl, 'gallery')}>
                    {copiedLink === 'gallery' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-destructive/5 border-destructive/20 rounded-[2.5rem] overflow-hidden">
            <CardHeader>
              <CardTitle className="text-sm font-headline font-bold text-destructive">Danger Zone</CardTitle>
            </CardHeader>
            <CardContent>
              <Button variant="destructive" className="w-full rounded-xl font-bold h-12" onClick={() => setShowDeleteDialog(true)}>
                Delete Gallery
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-card border-border/50 rounded-[2.5rem] max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-headline font-bold text-center">Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription className="text-center space-y-4">
              <p>Type <span className="text-destructive font-mono font-bold">DELETE</span> to confirm.</p>
              <Input placeholder="Type DELETE..." className="text-center font-bold" value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)} />
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2 mt-4">
            <AlertDialogCancel className="rounded-xl flex-1">Cancel</AlertDialogCancel>
            <AlertDialogAction className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold flex-1" onClick={confirmDelete} disabled={deleteConfirmText !== 'DELETE'}>
              Destroy Gallery
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Save(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
      <path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7" />
      <path d="M7 3v4a1 1 0 0 0 1 1h7" />
    </svg>
  );
}
