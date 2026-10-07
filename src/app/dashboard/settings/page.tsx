"use client";

import { useUser, useFirestore, useDoc } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo, useRef } from 'react';
import { 
  User, Shield, Camera, Save, Loader2, Briefcase, Phone,
  Image as ImageIcon, ArrowLeft, Settings, HardDrive,
  CheckCircle2, AlertTriangle, Globe, Lock, Zap, Sparkles,
  Copy, Check, Palette, Plus, Trash2, Instagram,
  Facebook, Youtube, Music2, Play, Upload, X, FolderPlus,
  Info, Pencil, Folder
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Skeleton } from "@/components/ui/skeleton";
import { updateSubdomain } from '@/app/actions/subdomain';
import {  
  addPortfolioPhoto, 
  removePortfolioPhoto,
  createPortfolioFolder,
  updatePortfolioFolder,
  deletePortfolioFolder,
  assignPhotoToFolder,
} from '@/app/actions/portfolio';
import { isOwnerEmail } from '@/lib/plans';
import { THEME_LIST, type ThemeId } from '@/lib/portfolio-themes';
import { requestUploadUrl, refreshPhotoUrls } from '@/app/actions/storage';
import { ImageUploader } from '@/components/ImageUploader';
import { doc, setDoc, deleteField } from 'firebase/firestore';
import { convertToWebP } from '@/lib/storage/convert-to-webp';   // 🆕 YEH
export default function SettingsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [activeTab, setActiveTab] = useState("studio");
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Folders state
  const [portfolioFolders, setPortfolioFolders] = useState<any[]>([]);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [editingFolder, setEditingFolder] = useState<any>(null);
  const [folderForm, setFolderForm] = useState({ name: '', description: '', coverImage: '', coverKey: '' });
  const [savingFolder, setSavingFolder] = useState(false);

  const settingsRef = useMemo(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user?.uid]);

  const publicProfileRef = useMemo(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'publicProfiles', user.uid);
  }, [firestore, user?.uid]);

  const { data: profile, loading: profileLoading } = useDoc(settingsRef);
  const { data: publicProfile } = useDoc(publicProfileRef);

  const [formData, setFormData] = useState({
    studioName: '',
    photographerName: '',
    whatsappNumber: '',
    email: '',
    city: '',
    tagline: '',
    instagramLink: '',
    facebookLink: '',
    youtubeLink: '',
    tiktokLink: '',
    website: '',
    subdomain: '',
    theme: 'mixed' as ThemeId,
    studioLogo: '',
    studioLogoKey: '',
    studioBanner: '',
    studioBannerKey: '',
    photographerPhoto: '',
    photographerPhotoKey: '',
    aboutBio: '',
    services: [] as any[],
    packages: [] as any[],
    videoUrl: '',
    stats: { years: 5, clients: 100, appreciations: 0 },
    defaultWatermark: true,
    defaultAllowDownloads: false,
    defaultPublicLink: true,
    notifyNewFavorite: true,
    notifyNewView: false,
    notifyPaymentReceived: true,
  });

  const [portfolioPhotos, setPortfolioPhotos] = useState<any[]>([]);

  useEffect(() => {
    if (profile && !isDirty) {
      setFormData({
        studioName: profile.studioName || '',
        photographerName: profile.photographerName || '',
        whatsappNumber: profile.whatsappNumber || '',
        email: profile.email || user?.email || '',
        city: profile.city || '',
        tagline: profile.tagline || '',
        instagramLink: profile.instagramLink || '',
        facebookLink: profile.facebookLink || '',
        youtubeLink: profile.youtubeLink || '',
        tiktokLink: profile.tiktokLink || '',
        website: profile.website || '',
        subdomain: profile.subdomain || '',
        theme: (profile.theme || 'mixed') as ThemeId,
        studioLogo: '',
        studioLogoKey: '',
        studioBanner: '',
        studioBannerKey: '',
        photographerPhoto: '',
        photographerPhotoKey: '',
        aboutBio: profile.aboutBio || '',
        services: profile.services || [],
        packages: profile.packages || [],
        videoUrl: profile.videoUrl || '',
        stats: profile.stats || { years: 5, clients: 100, appreciations: 0 },
        defaultWatermark: profile.defaultWatermark ?? true,
        defaultAllowDownloads: profile.defaultAllowDownloads ?? false,
        defaultPublicLink: profile.defaultPublicLink ?? true,
        notifyNewFavorite: profile.notifyNewFavorite ?? true,
        notifyNewView: profile.notifyNewView ?? false,
        notifyPaymentReceived: profile.notifyPaymentReceived ?? true,
      });
      setIsDirty(false);
    }
  }, [profile, user?.email, isDirty]);

  useEffect(() => {
    if (!publicProfile || isDirty) return;

    setFormData(prev => ({
      ...prev,
      studioLogo: publicProfile.studioLogo || '',
      studioLogoKey: publicProfile.studioLogoKey || '',
      studioBanner: publicProfile.studioBanner || '',
      studioBannerKey: publicProfile.studioBannerKey || '',
      photographerPhoto: publicProfile.photographerPhoto || '',
      photographerPhotoKey: publicProfile.photographerPhotoKey || '',
    }));

    setPortfolioFolders(publicProfile.portfolioFolders || []);
  }, [publicProfile, isDirty]);

  useEffect(() => {
    async function loadPortfolioPhotos() {
      if (!publicProfile?.portfolioPhotos || publicProfile.portfolioPhotos.length === 0) {
        setPortfolioPhotos([]);
        return;
      }

      const rawPhotos: any[] = publicProfile.portfolioPhotos;
      
      const keysToRefresh: string[] = [];
      rawPhotos.forEach((p: any) => {
        if (p.storageKey) keysToRefresh.push(p.storageKey);
        if (p.thumbKey) keysToRefresh.push(p.thumbKey);
      });

      let urlMap: Record<string, string> = {};
      if (keysToRefresh.length > 0) {
        try {
          const result = await refreshPhotoUrls(keysToRefresh);
          if (result.success) {
            urlMap = result.urls;
          }
        } catch (err) {
          console.error('[SETTINGS_PORTFOLIO_REFRESH]', err);
        }
      }

      const refreshed = rawPhotos
        .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
        .map((p: any) => ({
          ...p,
          url: urlMap[p.storageKey] || p.url || '',
          thumbUrl: p.thumbKey
            ? (urlMap[p.thumbKey] || p.thumbUrl || p.url)
            : (urlMap[p.storageKey] || p.url || ''),
        }));

      setPortfolioPhotos(refreshed);
    }

    loadPortfolioPhotos();
  }, [publicProfile]);

  const isEnterprise = useMemo(() => {
    return profile?.planId === 'enterprise' || isOwnerEmail(user?.email);
  }, [profile?.planId, user?.email]);

  const isOwner = useMemo(() => isOwnerEmail(user?.email), [user?.email]);

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

  const handleCopyUrl = () => {
    const url = `https://${formData.subdomain || 'yourstudio'}.hafash.pk`;
    navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    toast({ title: "URL Copied!" });
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const validateWhatsApp = (number: string) => {
    const regex = /^03\d{9}$/;
    return regex.test(number.replace(/\s+/g, ''));
  };

  // ═══════════════════════════════════════════════════════════════
  // FOLDER HANDLERS
  // ═══════════════════════════════════════════════════════════════

  const openCreateFolderModal = () => {
    setEditingFolder(null);
    setFolderForm({ name: '', description: '', coverImage: '', coverKey: '' });
    setShowFolderModal(true);
  };

  const openEditFolderModal = (folder: any) => {
    setEditingFolder(folder);
    setFolderForm({
      name: folder.name || '',
      description: folder.description || '',
      coverImage: folder.coverImage || '',
      coverKey: folder.coverKey || '',
    });
    setShowFolderModal(true);
  };

  const handleSaveFolder = async () => {
    if (!user) return;
    if (!folderForm.name.trim()) {
      toast({ variant: 'destructive', title: 'Folder name zaroori hai' });
      return;
    }

    setSavingFolder(true);
    try {
      if (editingFolder) {
        const result = await updatePortfolioFolder(user.uid, editingFolder.id, {
          name: folderForm.name,
          description: folderForm.description,
          coverImage: folderForm.coverImage,
          coverKey: folderForm.coverKey,
        });
        if (!result.success) throw new Error(result.error);
        toast({ title: '✅ Folder update ho gaya' });
      } else {
        const result = await createPortfolioFolder(user.uid, {
          name: folderForm.name,
          description: folderForm.description,
          coverImage: folderForm.coverImage,
          coverKey: folderForm.coverKey,
        });
        if (!result.success) throw new Error(result.error);
        toast({ title: '✅ Folder ban gaya' });
      }

      setShowFolderModal(false);
      setEditingFolder(null);
      setFolderForm({ name: '', description: '', coverImage: '', coverKey: '' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Failed', description: err.message });
    } finally {
      setSavingFolder(false);
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!user) return;
    if (!confirm('Yeh folder delete karein? Photos "All Photos" mein chali jayengi.')) return;

    try {
      const result = await deletePortfolioFolder(user.uid, folderId);
      if (!result.success) throw new Error(result.error);
      toast({ title: 'Folder delete ho gaya' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Failed', description: err.message });
    }
  };

  const handleAssignPhoto = async (photoId: string, folderId: string | null) => {
    if (!user) return;

    setPortfolioPhotos(prev =>
      prev.map(p => (p.id === photoId ? { ...p, folderId } : p))
    );

    try {
      const result = await assignPhotoToFolder(user.uid, photoId, folderId);
      if (!result.success) throw new Error(result.error);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Failed', description: err.message });
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // PORTFOLIO PHOTO UPLOAD
  // ═══════════════════════════════════════════════════════════════

  const handlePortfolioPhotoUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!e.target.files || !e.target.files[0] || !user || !firestore) return;

    const file = e.target.files[0];

    if (!file.type.startsWith('image/')) {
      toast({
        variant: 'destructive',
        title: 'Invalid file',
        description: 'Sirf image files allowed hain',
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        variant: 'destructive',
        title: 'File too large',
        description: 'Max 10MB per photo',
      });
      return;
    }

    if (portfolioPhotos.length >= 50) {
      toast({
        variant: 'destructive',
        title: 'Limit reached',
        description: 'Max 50 portfolio photos',
      });
      return;
    }

    setUploadingPhoto(true);

    try {

      // 🆕 Convert to WebP
      const webpFile = await convertToWebP(file, 0.85);

      const uploadResult = await requestUploadUrl({
        userId: user.uid,
        galleryId: 'portfolio',
        fileName: webpFile.name,
        contentType: webpFile.type,
        fileSize: webpFile.size,
      });

      if (!uploadResult.success || !uploadResult.uploadUrl) {
        throw new Error(uploadResult.error || 'Upload URL failed');
      }

      const xhr = new XMLHttpRequest();
      await new Promise<void>((resolve, reject) => {
        xhr.open('PUT', uploadResult.uploadUrl!);
        xhr.setRequestHeader('Content-Type', 'image/webp');
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`R2: ${xhr.status}`)));
        xhr.onerror = () => reject(new Error('Network error'));
        xhr.send(webpFile);
      });

      const photoId = Math.random().toString(36).substring(2, 11);
      
      const publicUrl = `https://pub-e2f68400ff8d4c72ae59bfb7f78a2.r2.dev/${uploadResult.key!}`;

const result = await addPortfolioPhoto(user.uid, {
  id: photoId,
  url: publicUrl,
  thumbUrl: publicUrl,
  storageKey: uploadResult.key!,
  thumbKey: uploadResult.key!,
  caption: '',
});

      if (!result.success) {
        throw new Error(result.error);
      }

      try {
        const urlResult = await refreshPhotoUrls([uploadResult.key!]);
        if (urlResult.success && urlResult.urls[uploadResult.key!]) {
          setPortfolioPhotos((prev) => [
            ...prev,
            {
              id: photoId,
              url: urlResult.urls[uploadResult.key!],
              thumbUrl: urlResult.urls[uploadResult.key!],
              storageKey: uploadResult.key!,
              caption: '',
              folderId: null,
              order: prev.length,
              uploadedAt: new Date().toISOString(),
            },
          ]);
        }
      } catch (err) {
        console.error('[PORTFOLIO_PREVIEW]', err);
      }

      toast({
        title: '✅ Photo uploaded',
        description: 'Portfolio mein add ho gayi',
      });
    } catch (error: any) {
      console.error('[PORTFOLIO_UPLOAD]', error);
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: error.message || 'Please try again',
      });
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemovePortfolioPhoto = async (photoId: string) => {
    if (!user) return;
    if (!confirm('Yeh photo portfolio se remove karein?')) return;

    try {
      const result = await removePortfolioPhoto(user.uid, photoId);
      if (!result.success) throw new Error(result.error);

      setPortfolioPhotos((prev) => prev.filter((p) => p.id !== photoId));
      toast({ title: 'Photo removed' });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to remove',
        description: error.message,
      });
    }
  };

  const handleBrandingRemove = async (type: 'logo' | 'banner' | 'photo') => {
    if (!firestore || !user) return;

    const fieldMap = {
      logo: { url: 'studioLogo', key: 'studioLogoKey' },
      banner: { url: 'studioBanner', key: 'studioBannerKey' },
      photo: { url: 'photographerPhoto', key: 'photographerPhotoKey' },
    };

    const fields = fieldMap[type];

    try {
      const removeData = {
        [fields.url]: deleteField(),
        [fields.key]: deleteField(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(
        doc(firestore, 'publicProfiles', user.uid),
        removeData,
        { merge: true }
      );

      await setDoc(
        doc(firestore, 'users', user.uid),
        removeData,
        { merge: true }
      );

      setFormData(prev => ({
        ...prev,
        [fields.url]: '',
        [fields.key]: '',
      }));
      setIsDirty(true);

      toast({ title: `${type} removed` });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Remove failed',
        description: err.message,
      });
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // SAVE
  // ═══════════════════════════════════════════════════════════════

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
        description: "Please enter a valid Pakistani WhatsApp number (e.g., 03001234567).",
      });
      return;
    }

    setSaving(true);
    try {
      if (
        isEnterprise &&
        formData.subdomain &&
        formData.subdomain !== profile?.subdomain
      ) {
        const result = await updateSubdomain(user.uid, formData.subdomain);
        if (!result.success) {
          toast({
            variant: "destructive",
            title: "Subdomain Error",
            description: result.error || "Subdomain update nahi ho saka",
          });
          setSaving(false);
          return;
        }
      }

      const userUpdateData: any = {
        ...formData,
        userId: user.uid,
        updatedAt: new Date().toISOString(),
        studioLogo: deleteField(),
        studioLogoKey: deleteField(),
        studioBanner: deleteField(),
        studioBannerKey: deleteField(),
        photographerPhoto: deleteField(),
        photographerPhotoKey: deleteField(),
      };

      await setDoc(
        doc(firestore, 'users', user.uid),
        userUpdateData,
        { merge: true }
      );

      const updateData: any = {
        userId: user.uid,
        studioName: formData.studioName.trim(),
        photographerName: formData.photographerName.trim(),
        tagline: formData.tagline?.trim() || '',
        city: formData.city?.trim() || '',
        whatsappNumber: formData.whatsappNumber.replace(/\s+/g, ''),
        instagramLink: formData.instagramLink?.trim() || '',
        facebookLink: formData.facebookLink?.trim() || '',
        youtubeLink: formData.youtubeLink?.trim() || '',
        tiktokLink: formData.tiktokLink?.trim() || '',
        aboutBio: formData.aboutBio || '',
        services: formData.services || [],
        packages: formData.packages || [],
        videoUrl: formData.videoUrl || '',
        stats: formData.stats || { years: 5, clients: 100, appreciations: 0 },
        theme: formData.theme || 'mixed',
        subdomain: formData.subdomain || '',
        planId: profile?.planId || 'starter',
        isOwner: isOwnerEmail(user?.email),
        bookingEnabled: true,
        updatedAt: new Date().toISOString(),
      };

      if (formData.studioLogo) {
        updateData.studioLogo = formData.studioLogo;
      } else {
        updateData.studioLogo = deleteField();
      }
      if (formData.studioLogoKey) {
        updateData.studioLogoKey = formData.studioLogoKey;
      } else {
        updateData.studioLogoKey = deleteField();
      }
      if (formData.studioBanner) {
        updateData.studioBanner = formData.studioBanner;
      } else {
        updateData.studioBanner = deleteField();
      }
      if (formData.studioBannerKey) {
        updateData.studioBannerKey = formData.studioBannerKey;
      } else {
        updateData.studioBannerKey = deleteField();
      }
      if (formData.photographerPhoto) {
        updateData.photographerPhoto = formData.photographerPhoto;
      } else {
        updateData.photographerPhoto = deleteField();
      }
      if (formData.photographerPhotoKey) {
        updateData.photographerPhotoKey = formData.photographerPhotoKey;
      } else {
        updateData.photographerPhotoKey = deleteField();
      }

      await setDoc(doc(firestore, 'publicProfiles', user.uid), updateData, { merge: true });

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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-10 border-b border-border/50 pb-12">
        <div className="flex items-center gap-6">
          <Button variant="ghost" size="icon" className="rounded-full h-12 w-12 hover:bg-primary/10" onClick={() => router.back()}>
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div className="space-y-2">
            <h1 className="text-4xl lg:text-5xl font-headline font-bold tracking-tight">Studio Control Center</h1>
            <div className="flex flex-wrap items-center gap-4 text-[11px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
              <span className="flex items-center gap-2"><Settings className="w-4 h-4 text-primary" /> Production Active</span>
              {isDirty && (
                <span className="flex items-center gap-2 text-amber-500 animate-pulse">
                  <AlertTriangle className="w-4 h-4" /> Unsaved Changes
                </span>
              )}
            </div>
          </div>
        </div>
        <Button 
          className={cn(
            "w-full md:w-auto rounded-2xl gap-3 px-10 h-14 font-bold shadow-2xl transition-all",
            isDirty ? "bg-primary text-primary-foreground scale-105" : "bg-muted text-muted-foreground cursor-not-allowed"
          )} 
          onClick={handleSave}
          disabled={saving || !isDirty}
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          Synchronize Profile
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-12">
        <TabsList className="bg-card/40 backdrop-blur-md border border-border/30 p-1.5 rounded-[2rem] h-auto flex flex-wrap w-full lg:w-auto">
          <TabsTrigger value="studio" className="rounded-[1.5rem] px-6 py-3 font-bold text-[10px] uppercase">
            <Briefcase className="w-4 h-4 mr-2" /> Studio
          </TabsTrigger>
          <TabsTrigger value="portfolio" className="rounded-[1.5rem] px-6 py-3 font-bold text-[10px] uppercase">
            <Palette className="w-4 h-4 mr-2" /> Portfolio
          </TabsTrigger>
          <TabsTrigger value="photos" className="rounded-[1.5rem] px-6 py-3 font-bold text-[10px] uppercase">
            <ImageIcon className="w-4 h-4 mr-2" /> Photos
          </TabsTrigger>
          <TabsTrigger value="account" className="rounded-[1.5rem] px-6 py-3 font-bold text-[10px] uppercase">
            <User className="w-4 h-4 mr-2" /> Account
          </TabsTrigger>
        </TabsList>

        {/* STUDIO TAB */}
        <TabsContent value="studio" className="space-y-8">
          <Card className="bg-card/40 border-border/50 rounded-[2.5rem] overflow-hidden shadow-2xl">
            <CardHeader className="border-b border-border/30 px-10 py-10">
              <CardTitle className="text-3xl font-headline font-bold">Professional Identity</CardTitle>
              <CardDescription>Refine your studio branding used across all galleries.</CardDescription>
            </CardHeader>
            <CardContent className="p-10 space-y-8">
              {profileLoading ? (
                <Skeleton className="h-14 w-full" />
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <Label>Studio Name *</Label>
                      <Input value={formData.studioName} onChange={(e) => updateField('studioName', e.target.value)} placeholder="Cinematic Memories" className="h-14 rounded-xl" />
                    </div>
                    <div className="space-y-3">
                      <Label>WhatsApp Number *</Label>
                      <Input value={formData.whatsappNumber} onChange={(e) => updateField('whatsappNumber', e.target.value)} placeholder="03001234567" className="h-14 rounded-xl" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <Label>Photographer Name</Label>
                      <Input value={formData.photographerName} onChange={(e) => updateField('photographerName', e.target.value)} placeholder="Your Name" className="h-14 rounded-xl" />
                    </div>
                    <div className="space-y-3">
                      <Label>City</Label>
                      <Input value={formData.city} onChange={(e) => updateField('city', e.target.value)} placeholder="Karachi" className="h-14 rounded-xl" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label>Tagline</Label>
                    <Input value={formData.tagline} onChange={(e) => updateField('tagline', e.target.value)} placeholder="Capturing Emotions, Creating Memories" className="h-14 rounded-xl" />
                  </div>

                  <div className="pt-6 border-t border-border/20 space-y-4">
                    <Label className="text-lg font-bold">Social Media</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="relative">
                        <Instagram className="absolute left-4 top-4.5 w-5 h-5 text-pink-400" />
                        <Input value={formData.instagramLink} onChange={(e) => updateField('instagramLink', e.target.value)} placeholder="Instagram" className="pl-14 h-14 rounded-xl" />
                      </div>
                      <div className="relative">
                        <Facebook className="absolute left-4 top-4.5 w-5 h-5 text-blue-400" />
                        <Input value={formData.facebookLink} onChange={(e) => updateField('facebookLink', e.target.value)} placeholder="Facebook" className="pl-14 h-14 rounded-xl" />
                      </div>
                      <div className="relative">
                        <Youtube className="absolute left-4 top-4.5 w-5 h-5 text-red-400" />
                        <Input value={formData.youtubeLink} onChange={(e) => updateField('youtubeLink', e.target.value)} placeholder="YouTube" className="pl-14 h-14 rounded-xl" />
                      </div>
                      <div className="relative">
                        <Music2 className="absolute left-4 top-4.5 w-5 h-5 text-cyan-400" />
                        <Input value={formData.tiktokLink} onChange={(e) => updateField('tiktokLink', e.target.value)} placeholder="TikTok" className="pl-14 h-14 rounded-xl" />
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-border/20 space-y-6">
                    <div>
                      <Label className="text-lg font-bold">Branding Images</Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Upload karein ya URL paste karein
                      </p>
                    </div>

                    <div className="space-y-2">
                      <ImageUploader
                        label="Studio Logo"
                        value={formData.studioLogo}
                        onChange={(url, key) => {
                          updateField('studioLogo', url);
                          updateField('studioLogoKey', key || '');
                        }}
                        userId={user?.uid || ''}
                        type="logo"
                        maxSizeMB={20}
                      />
                      {formData.studioLogoKey && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleBrandingRemove('logo')}
                          className="rounded-xl gap-2 border-destructive/30 text-destructive"
                        >
                          <Trash2 className="w-3 h-3" />
                          Remove Logo
                        </Button>
                      )}
                    </div>

                    <div className="space-y-2">
                      <ImageUploader
                        label="Studio Banner"
                        value={formData.studioBanner}
                        onChange={(url, key) => {
                          updateField('studioBanner', url);
                          updateField('studioBannerKey', key || '');
                        }}
                        userId={user?.uid || ''}
                        type="banner"
                        maxSizeMB={20}
                      />
                      {formData.studioBannerKey && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleBrandingRemove('banner')}
                          className="rounded-xl gap-2 border-destructive/30 text-destructive"
                        >
                          <Trash2 className="w-3 h-3" />
                          Remove Banner
                        </Button>
                      )}
                    </div>

                    <div className="space-y-2">
                      <ImageUploader
                        label="Your Photo"
                        value={formData.photographerPhoto}
                        onChange={(url, key) => {
                          updateField('photographerPhoto', url);
                          updateField('photographerPhotoKey', key || '');
                        }}
                        userId={user?.uid || ''}
                        type="photo"
                        maxSizeMB={20}
                      />
                      {formData.photographerPhotoKey && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleBrandingRemove('photo')}
                          className="rounded-xl gap-2 border-destructive/30 text-destructive"
                        >
                          <Trash2 className="w-3 h-3" />
                          Remove Photo
                        </Button>
                      )}
                    </div>
                  </div>

                  {isEnterprise ? (
                    <div className="space-y-6 pt-10 border-t-2 border-primary/20">
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <div>
                          <Label className="text-primary">🌐 Your Subdomain</Label>
                          <p className="text-xs text-muted-foreground mt-2">
                            {isOwner
                              ? '👑 Owner — Unlimited changes allowed'
                              : 'Your portfolio URL — 30 din mein 1 baar change'}
                          </p>
                        </div>
                        <Badge className={cn(
                          "text-[10px] font-bold uppercase tracking-widest",
                          isOwner
                            ? "bg-purple-500/20 text-purple-400 border-purple-500/30"
                            : "bg-green-500/20 text-green-500 border-green-500/30"
                        )}>
                          {isOwner ? '👑 Owner Unlimited' : '✅ Enterprise Active'}
                        </Badge>
                      </div>
                      <div className="relative">
                        <Globe className="absolute left-4 top-4 w-5 h-5 text-primary z-10" />
                        <Input
                          value={formData.subdomain}
                          onChange={(e) => updateField('subdomain', e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                          placeholder="yourstudio"
                          className="pl-14 pr-36 h-14 rounded-xl font-mono"
                          maxLength={30}
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-primary pointer-events-none">
                          .hafash.pk
                        </span>
                      </div>
                      <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
                        <p className="flex-1 text-sm font-mono truncate">
                          https://{formData.subdomain || 'yourstudio'}.hafash.pk
                        </p>
                        <Button size="sm" variant="outline" onClick={handleCopyUrl} className="rounded-lg gap-2">
                          {copiedUrl ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiedUrl ? 'Copied' : 'Copy'}
                        </Button>
                      </div>

                      {isOwner && (
                        <div className="flex items-start gap-3 p-4 rounded-xl bg-purple-500/5 border border-purple-500/20">
                          <Sparkles className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                          <p className="text-[11px] text-purple-200/90 leading-relaxed">
                            <strong>Owner Account:</strong> Aap unlimited subdomain changes kar sakte hain. Koi 30-din limit nahi.
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-6 pt-10 border-t-2 border-primary/20">
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <div>
                          <Label className="text-primary">🌐 Personal Subdomain</Label>
                          <p className="text-xs text-muted-foreground mt-2">
                            Enterprise plan mein aapko apna personal portfolio URL milega
                          </p>
                        </div>
                        <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30 text-[10px] font-bold uppercase tracking-widest gap-1.5">
                          <Lock className="w-3 h-3" /> Enterprise Only
                        </Badge>
                      </div>

                      <div className="p-8 rounded-2xl bg-gradient-to-br from-primary/10 via-card/60 to-background border border-primary/30 text-center space-y-4">
                        <div className="bg-primary/15 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto">
                          <Globe className="w-8 h-8 text-primary" />
                        </div>
                        <div>
                          <p className="font-headline font-bold text-xl">Upgrade to Enterprise</p>
                          <p className="text-xs text-muted-foreground mt-2 max-w-md mx-auto leading-relaxed">
                            Rs. 3,500/month mein apna personal subdomain <strong className="text-primary">yourname.hafash.pk</strong> aur full custom domain milega
                          </p>
                        </div>
                        <Link href="/storage">
                          <Button className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold gap-2 h-12 px-8">
                            <Sparkles className="w-4 h-4" />
                            View Enterprise Plan
                          </Button>
                        </Link>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* PORTFOLIO TAB */}
        <TabsContent value="portfolio" className="space-y-8">
          {/* Theme Card */}
          <Card className="bg-card/40 border-border/50 rounded-[2.5rem] overflow-hidden shadow-2xl">
            <CardHeader className="border-b border-border/30 px-10 py-10">
              <CardTitle className="text-3xl font-headline font-bold flex items-center gap-3">
                <Palette className="w-8 h-8 text-primary" /> Portfolio Theme
              </CardTitle>
              <CardDescription>Choose the look of your portfolio page.</CardDescription>
            </CardHeader>
            <CardContent className="p-10">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {THEME_LIST.map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() => updateField('theme', theme.id)}
                    className={cn(
                      "p-4 rounded-2xl border-2 transition-all text-left space-y-3 group relative",
                      formData.theme === theme.id
                        ? "border-primary bg-primary/5 scale-105 shadow-xl"
                        : "border-border/30 hover:border-primary/50"
                    )}
                  >
                    <div className="text-4xl">{theme.preview}</div>
                    <div>
                      <p className="font-bold text-sm">{theme.name}</p>
                      <p className="text-[10px] text-muted-foreground mt-1 leading-tight">{theme.description}</p>
                    </div>
                    {formData.theme === theme.id && (
                      <CheckCircle2 className="w-5 h-5 text-primary absolute top-3 right-3" />
                    )}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* PORTFOLIO FOLDERS SECTION */}
          <Card className="bg-card/40 border-border/50 rounded-[2.5rem] overflow-hidden shadow-2xl">
            <CardHeader className="border-b border-border/30 px-10 py-10 flex flex-row items-center justify-between flex-wrap gap-4">
              <div>
                <CardTitle className="text-3xl font-headline font-bold flex items-center gap-3">
                  <Folder className="w-8 h-8 text-primary" /> Portfolio Folders
                </CardTitle>
                <CardDescription className="mt-2">
                  Apne kaam ko categories mein organize karein
                </CardDescription>
              </div>
              <Button
                onClick={openCreateFolderModal}
                className="rounded-xl gap-2 bg-primary text-primary-foreground font-bold h-12 px-6"
              >
                <FolderPlus className="w-4 h-4" />
                Create Folder
              </Button>
            </CardHeader>
            <CardContent className="p-10 space-y-8">
              {/* Guidance Box */}
              <div className="p-6 rounded-2xl bg-primary/5 border border-primary/20 space-y-3">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div className="space-y-2">
                    <p className="font-bold text-sm">💡 Folders kya hain?</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Folders aapke kaam ko categories mein organize karte hain. Client jab aapka portfolio kholega,
                      toh usay <strong>gol circle folders</strong> dikhenge — Instagram highlights jaisa.
                      Woh folder pe click karke us event ki saari photos dekh sakta hai.
                    </p>
                    <div className="pt-2 space-y-1">
                      <p className="text-xs font-bold text-foreground">Suggested folders:</p>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {['Mehndi', 'Barat', 'Walima', 'Birthday', 'Aqeeqa', 'Nikkah', 'Fashion', 'Product'].map((s) => (
                          <span key={s} className="text-[10px] px-2 py-1 rounded-full bg-primary/10 border border-primary/20 font-bold">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                    <p className="text-[11px] text-muted-foreground italic pt-1">
                      ⚠️ Folder nahi banaye toh saari photos ek hi "All Photos" grid mein dikhengi.
                    </p>
                    <p className="text-[11px] text-primary font-bold pt-1">
                      💡 Folder pe click karein → andar photos upload karein
                    </p>
                  </div>
                </div>
              </div>

              {/* Folder List — Clickable */}
              {portfolioFolders.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed border-border/40 rounded-[2rem]">
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Folder className="w-10 h-10 text-primary" />
                  </div>
                  <h3 className="font-headline font-bold text-xl mb-2">Abhi koi folder nahi</h3>
                  <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                    "Create Folder" button dabayein aur apne kaam ko organize karna shuru karein.
                  </p>
                  <Button onClick={openCreateFolderModal} className="rounded-xl gap-2">
                    <FolderPlus className="w-4 h-4" /> Create First Folder
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                  {portfolioFolders
                    .sort((a, b) => (a.order || 0) - (b.order || 0))
                    .map((folder) => {
                      const photoCount = portfolioPhotos.filter((p: any) => p.folderId === folder.id).length;
                      return (
                        <Link
                          key={folder.id}
                          href={`/dashboard/settings/portfolio/folders/${folder.id}`}
                          className="flex flex-col items-center gap-3 group cursor-pointer"
                        >
                          <div className="relative">
                            {/* Circle Folder */}
                            <div
                              className="w-[100px] h-[100px] rounded-full overflow-hidden border-2 group-hover:scale-105 transition-all"
                              style={{
                                borderColor: folder.coverImage ? 'var(--primary)' : 'rgba(212, 175, 55, 0.3)',
                              }}
                            >
                              {folder.coverImage ? (
                                <img
                                  src={folder.coverImage}
                                  alt={folder.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                                  <Folder className="w-10 h-10 text-primary" />
                                </div>
                              )}
                            </div>
                            {/* Edit/Delete buttons */}
                            <div className="absolute -top-1 -right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  openEditFolderModal(folder);
                                }}
                                className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:scale-110 transition-transform"
                                title="Edit folder"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleDeleteFolder(folder.id);
                                }}
                                className="w-6 h-6 rounded-full bg-destructive text-white flex items-center justify-center hover:scale-110 transition-transform"
                                title="Delete folder"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                          <div className="text-center space-y-0.5">
                            <p className="font-bold text-sm">{folder.name}</p>
                            <p className="text-[10px] text-muted-foreground">{photoCount} 📷</p>
                          </div>
                        </Link>
                      );
                    })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card/40 border-border/50 rounded-[2.5rem] overflow-hidden shadow-2xl">
            <CardHeader className="border-b border-border/30 px-10 py-10">
              <CardTitle className="text-2xl font-headline font-bold">About Section</CardTitle>
            </CardHeader>
            <CardContent className="p-10 space-y-6">
              <div className="space-y-3">
                <Label>Bio / About Me</Label>
                <Textarea
                  value={formData.aboutBio}
                  onChange={(e) => updateField('aboutBio', e.target.value)}
                  placeholder="Hi, I'm a professional wedding photographer based in Karachi..."
                  className="min-h-[150px] rounded-xl"
                  maxLength={500}
                />
                <p className="text-[10px] text-muted-foreground text-right">{formData.aboutBio.length}/500</p>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-4">
                <div className="space-y-2">
                  <Label>Years Experience</Label>
                  <Input type="number" value={formData.stats.years} onChange={(e) => updateField('stats', { ...formData.stats, years: Number(e.target.value) })} className="h-12 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label>Happy Clients</Label>
                  <Input type="number" value={formData.stats.clients} onChange={(e) => updateField('stats', { ...formData.stats, clients: Number(e.target.value) })} className="h-12 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label>Appreciations</Label>
                  <Input type="number" value={formData.stats.appreciations} onChange={(e) => updateField('stats', { ...formData.stats, appreciations: Number(e.target.value) })} className="h-12 rounded-xl" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/40 border-border/50 rounded-[2.5rem] overflow-hidden shadow-2xl">
            <CardHeader className="border-b border-border/30 px-10 py-10 flex flex-row items-center justify-between">
              <CardTitle className="text-2xl font-headline font-bold">Services</CardTitle>
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl gap-2"
                onClick={() => updateField('services', [...formData.services, { title: '' }])}
              >
                <Plus className="w-4 h-4" /> Add Service
              </Button>
            </CardHeader>
            <CardContent className="p-10 space-y-4">
              {formData.services.length === 0 ? (
                <p className="text-center text-muted-foreground italic py-8">No services added yet.</p>
              ) : (
                formData.services.map((service: any, idx: number) => (
                  <div key={idx} className="flex gap-3">
                    <Input
                      value={service.title}
                      onChange={(e) => {
                        const newServices = [...formData.services];
                        newServices[idx] = { ...service, title: e.target.value };
                        updateField('services', newServices);
                      }}
                      placeholder="e.g., Wedding Photography"
                      className="h-12 rounded-xl flex-1"
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-12 w-12 text-destructive rounded-xl"
                      onClick={() => updateField('services', formData.services.filter((_: any, i: number) => i !== idx))}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="bg-card/40 border-border/50 rounded-[2.5rem] overflow-hidden shadow-2xl">
            <CardHeader className="border-b border-border/30 px-10 py-10 flex flex-row items-center justify-between">
              <CardTitle className="text-2xl font-headline font-bold">Pricing Packages</CardTitle>
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl gap-2"
                onClick={() => updateField('packages', [...formData.packages, { name: '', price: 0, features: [] }])}
              >
                <Plus className="w-4 h-4" /> Add Package
              </Button>
            </CardHeader>
            <CardContent className="p-10 space-y-6">
              {formData.packages.length === 0 ? (
                <p className="text-center text-muted-foreground italic py-8">No packages added yet.</p>
              ) : (
                formData.packages.map((pkg: any, idx: number) => (
                  <div key={idx} className="p-6 rounded-2xl bg-background/40 border border-border/30 space-y-4">
                    <div className="flex gap-3 items-start">
                      <Input
                        value={pkg.name}
                        onChange={(e) => {
                          const newPkgs = [...formData.packages];
                          newPkgs[idx] = { ...pkg, name: e.target.value };
                          updateField('packages', newPkgs);
                        }}
                        placeholder="Package Name (e.g., Gold)"
                        className="h-12 rounded-xl flex-1"
                      />
                      <Input
                        type="number"
                        value={pkg.price}
                        onChange={(e) => {
                          const newPkgs = [...formData.packages];
                          newPkgs[idx] = { ...pkg, price: Number(e.target.value) };
                          updateField('packages', newPkgs);
                        }}
                        placeholder="Price"
                        className="h-12 rounded-xl w-32"
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-12 w-12 text-destructive rounded-xl"
                        onClick={() => updateField('packages', formData.packages.filter((_: any, i: number) => i !== idx))}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <Textarea
                      value={(pkg.features || []).join('\n')}
                      onChange={(e) => {
                        const newPkgs = [...formData.packages];
                        newPkgs[idx] = { ...pkg, features: e.target.value.split('\n').filter(f => f.trim()) };
                        updateField('packages', newPkgs);
                      }}
                      placeholder="Features (one per line)"
                      className="rounded-xl min-h-[80px] text-sm"
                    />
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="bg-card/40 border-border/50 rounded-[2.5rem] overflow-hidden shadow-2xl">
            <CardHeader className="border-b border-border/30 px-10 py-10">
              <CardTitle className="text-2xl font-headline font-bold flex items-center gap-3">
                <Play className="w-6 h-6 text-primary" /> Featured Video
              </CardTitle>
            </CardHeader>
            <CardContent className="p-10">
              <div className="space-y-3">
                <Label>YouTube Embed URL</Label>
                <Input
                  value={formData.videoUrl}
                  onChange={(e) => updateField('videoUrl', e.target.value)}
                  placeholder="https://www.youtube.com/embed/VIDEO_ID"
                  className="h-14 rounded-xl font-mono text-sm"
                />
                <p className="text-[10px] text-muted-foreground">Use embed URL format (not watch URL)</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PHOTOS TAB */}
        <TabsContent value="photos" className="space-y-8">
          <Card className="bg-card/40 border-border/50 rounded-[2.5rem] overflow-hidden shadow-2xl">
            <CardHeader className="border-b border-border/30 px-10 py-10">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <CardTitle className="text-3xl font-headline font-bold flex items-center gap-3">
                    <ImageIcon className="w-8 h-8 text-primary" /> Portfolio Photos
                  </CardTitle>
                  <CardDescription className="mt-2">
                    Yeh photos aapke subdomain portfolio pe dikhengi.
                  </CardDescription>
                </div>
                <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px] font-bold uppercase tracking-widest">
                  {portfolioPhotos.length} / 50
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-10 space-y-6">
              <div className="p-5 rounded-2xl bg-primary/5 border border-primary/20 flex items-start gap-3">
                <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-sm">💡 Photos ko folders mein assign karein</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Har photo ke neeche dropdown hai. Us se folder choose karein (Mehndi, Barat, etc).
                    Ya folder pe click karke andar upload karein.
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-border/40 rounded-[2rem] hover:border-primary/50 transition-all">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePortfolioPhotoUpload}
                  disabled={uploadingPhoto || portfolioPhotos.length >= 50}
                />
                <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                  {uploadingPhoto ? (
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  ) : (
                    <Upload className="w-8 h-8 text-primary" />
                  )}
                </div>
                <h3 className="font-headline font-bold text-xl mb-2">
                  {uploadingPhoto ? 'Uploading...' : 'Upload Portfolio Photo'}
                </h3>
                <p className="text-sm text-muted-foreground mb-6 text-center max-w-sm">
                  Apni best work ki photos upload karein. Max 10MB per photo.
                </p>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto || portfolioPhotos.length >= 50}
                  className="rounded-xl gap-2 bg-primary text-primary-foreground hover:bg-primary/90 font-bold h-12 px-8"
                >
                  <Plus className="w-4 h-4" />
                  Select Photo
                </Button>
              </div>

              {portfolioPhotos.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pt-6 border-t border-border/20">
                  {portfolioPhotos.map((photo) => (
                    <div key={photo.id} className="space-y-2">
                      <div className="relative group aspect-square rounded-2xl overflow-hidden border border-border/30">
                        {photo.thumbUrl || photo.url ? (
                          <img
                            src={photo.thumbUrl || photo.url}
                            alt={photo.caption || 'Portfolio'}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full bg-muted flex items-center justify-center">
                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Button
                            size="icon"
                            variant="destructive"
                            className="rounded-full h-12 w-12"
                            onClick={() => handleRemovePortfolioPhoto(photo.id)}
                          >
                            <Trash2 className="w-5 h-5" />
                          </Button>
                        </div>
                      </div>

                      {portfolioFolders.length > 0 && (
                        <select
                          value={photo.folderId || ''}
                          onChange={(e) => handleAssignPhoto(photo.id, e.target.value || null)}
                          className="w-full h-9 rounded-lg px-2 text-xs font-bold bg-background border border-border/40 focus:border-primary outline-none"
                        >
                          <option value="">📁 No Folder</option>
                          {portfolioFolders.map((f) => (
                            <option key={f.id} value={f.id}>
                              📁 {f.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ACCOUNT TAB */}
        <TabsContent value="account" className="space-y-8">
          <Card className="bg-card/40 border-border/50 rounded-[2.5rem] overflow-hidden shadow-2xl">
            <CardHeader className="border-b border-border/30 px-10 py-10">
              <CardTitle className="text-3xl font-headline font-bold flex items-center gap-4">
                <Shield className="w-8 h-8 text-primary" /> Security
              </CardTitle>
            </CardHeader>
            <CardContent className="p-10 space-y-6">
              <div>
                <Label>Primary Email</Label>
                <div className="flex items-center justify-between mt-3 p-6 bg-background/60 rounded-3xl border border-border/40">
                  <span className="font-mono text-sm">{user?.email}</span>
                  {user?.emailVerified && <Badge className="bg-green-500/20 text-green-500">Verified</Badge>}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/40 border-border/50 rounded-[2.5rem] overflow-hidden shadow-2xl">
            <CardHeader className="border-b border-border/30 px-10 py-10">
              <CardTitle className="text-3xl font-headline font-bold flex items-center gap-4">
                <HardDrive className="w-8 h-8 text-primary" /> Subscription
              </CardTitle>
            </CardHeader>
            <CardContent className="p-10 space-y-6">
              <div className="flex items-center justify-between bg-primary/5 p-8 rounded-2xl border border-primary/20">
                <div>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">Active Plan</p>
                  <p className="text-3xl font-headline font-bold text-primary mt-1">{profile?.planId?.toUpperCase() || 'STARTER'}</p>
                </div>
                <Link href="/storage">
                  <Button className="rounded-xl">Upgrade</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* FOLDER MODAL */}
      {/* ═══════════════════════════════════════════════════════ */}
      {showFolderModal && (
        <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto">
          <Card className="w-full max-w-lg rounded-[2rem] my-8">
            <CardContent className="p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center">
                    <FolderPlus className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-headline font-bold text-2xl">
                      {editingFolder ? 'Edit Folder' : 'Create New Folder'}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {editingFolder ? 'Folder details update karein' : 'Client ko yeh folder dikhega'}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setShowFolderModal(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="space-y-5">
                <div className="space-y-2">
                  <Label>Folder Name *</Label>
                  <Input
                    value={folderForm.name}
                    onChange={(e) => setFolderForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Mehndi, Barat, Walima"
                    className="h-12 rounded-xl"
                    maxLength={30}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    💡 Examples: Mehndi, Barat, Walima, Birthday, Aqeeqa, Fashion
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Description (optional)</Label>
                  <Textarea
                    value={folderForm.description}
                    onChange={(e) => setFolderForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Mehndi ceremonies ki photos..."
                    className="rounded-xl min-h-[80px]"
                    maxLength={150}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    💡 Client ko yeh description folder ke andar dikhegi
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Cover Image (optional)</Label>
                  <ImageUploader
                    label=""
                    value={folderForm.coverImage}
                    onChange={(url, key) => {
                      setFolderForm(prev => ({ ...prev, coverImage: url, coverKey: key || '' }));
                    }}
                    userId={user?.uid || ''}
                    type="logo"
                    maxSizeMB={20}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    💡 Cover nahi doge toh pehli photo automatically cover ban jayegi
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setShowFolderModal(false)}
                  className="flex-1 rounded-xl h-12"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveFolder}
                  disabled={savingFolder || !folderForm.name.trim()}
                  className="flex-1 rounded-xl gap-2 bg-primary hover:bg-primary/90 font-bold h-12"
                >
                  {savingFolder ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  {editingFolder ? 'Update Folder' : 'Create Folder'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}