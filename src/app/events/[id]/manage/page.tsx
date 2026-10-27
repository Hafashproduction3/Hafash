"use client";

import { useFirestore, useDoc, useUser, useCollection } from '@/firebase';
import { useParams, useRouter } from 'next/navigation';
import { 
  Trash2 as Trash2Icon, Image as ImageIcon, ArrowLeft as ArrowLeftIcon,
  Eye as EyeIcon, Loader2 as Loader2Icon, FileText as FileTextIcon,
  Sparkles as SparklesIcon, Copy as CopyIcon, Check as CheckIcon,
  LayoutGrid as LayoutGridIcon, AlertCircle as AlertCircleIcon,
  User as UserIcon, Calendar as CalendarIcon, Archive as ArchiveIcon,
  ExternalLink as ExternalLinkIcon, Music as MusicIcon, Play as PlayIcon,
  Pause as PauseIcon, Upload as UploadIcon, X as XIcon, Search as SearchIcon,
  Crown as CrownIcon, Zap, Star as StarIcon, Settings as SettingsIcon,
  Palette as PaletteIcon, Moon as MoonIcon, Sun as SunIcon, Link as LinkIcon,
  Heart, ShoppingBag, MessageSquare, Lock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from '@/hooks/use-toast';
import { doc, deleteDoc, updateDoc, collection, query, orderBy } from 'firebase/firestore';
import { deleteGalleryFiles, requestUploadUrl, getMusicSignedUrl, refreshPhotoUrls } from '@/app/actions/storage';
import Link from 'next/link';
import { useMemo, useEffect, useState, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import { HafashLoader } from '@/components/ui/hafash-loader';

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
  const [copiedLink, setCopiedLink] = useState(false);
  const [processingItems, setProcessingItems] = useState<Set<string>>(new Set());

  const [showAllAssets, setShowAllAssets] = useState(false);
  const [assetSearch, setAssetSearch] = useState('');
  const [displayLimit, setDisplayLimit] = useState(60);

  const [refreshedPhotos, setRefreshedPhotos] = useState<any[]>([]);
  const [refreshedCover, setRefreshedCover] = useState<string>('');

  const [isUploadingMusic, setIsUploadingMusic] = useState(false);
  const [musicUploadProgress, setMusicUploadProgress] = useState(0);
  const [isPlayingMusic, setIsPlayingMusic] = useState(false);
  const [currentMusicUrl, setCurrentMusicUrl] = useState<string>('');
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);
  const musicInputRef = useRef<HTMLInputElement | null>(null);

  // Modal States
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState<'main' | 'favorites' | 'products' | 'reviews' | 'privacy'>('main');
  
  // Local state for modal inputs to save on click
  const [modalSettings, setModalSettings] = useState({
    title: '',
    slug: '',
    date: '',
    isPaid: false,
    isLocked: true,
    enableFavorites: true,
    favoritesLimit: 50,
    enableProducts: false,
    digitalDownloadPrice: 0,
    enableReviews: true,
    autoApproveReviews: false,
    isPasswordProtected: false,
    password: '',
  });

  const [settings, setSettings] = useState({
    photographerNote: '',
    albumStatus: 'New Selection',
    isPublic: true,
    isPaid: false,
    isLocked: true
  });

  useEffect(() => {
    if (typeof window !== 'undefined') setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  const eventRef = useMemo(() => {
    if (!firestore || !id) return null;
    return doc(firestore, 'galleries', id);
  }, [firestore, id]);

  const { data: eventRaw, loading: dataLoading, error } = useDoc(eventRef);

  const photosQuery = useMemo(() => {
    if (!firestore || !id) return null;
    return query(
      collection(firestore, 'galleries', id, 'photos'),
      orderBy('order', 'asc')
    );
  }, [firestore, id]);

  const { data: subcollectionPhotos, loading: photosLoading } = useCollection(photosQuery);

  useEffect(() => {
    async function refreshUrls() {
      if (!subcollectionPhotos || subcollectionPhotos.length === 0) {
        setRefreshedPhotos([]);
        return;
      }

      const keysToRefresh: string[] = [];
      subcollectionPhotos.forEach((p: any) => {
        if (p.storageKey) keysToRefresh.push(p.storageKey);
        if (p.thumbKey) keysToRefresh.push(p.thumbKey);
      });

      const urlMap: Record<string, string> = {};
      const BATCH_SIZE = 200;
      
      for (let i = 0; i < keysToRefresh.length; i += BATCH_SIZE) {
        const batch = keysToRefresh.slice(i, i + BATCH_SIZE);
        try {
          const result = await refreshPhotoUrls(batch);
          if (result.success) {
            Object.assign(urlMap, result.urls);
          }
        } catch (err) {
          console.error('[REFRESH_MANAGE] Batch failed:', err);
        }
      }

      const updated = subcollectionPhotos.map((p: any) => ({
        ...p,
        url: urlMap[p.storageKey] || p.url,
        masterUrl: urlMap[p.storageKey] || p.masterUrl,
        thumbUrl: p.thumbKey 
          ? (urlMap[p.thumbKey] || p.thumbUrl) 
          : (urlMap[p.storageKey] || p.url),
      }));

      setRefreshedPhotos(updated);
    }

    refreshUrls();
  }, [subcollectionPhotos]);

  useEffect(() => {
    async function refreshCover() {
      if (!eventRaw?.coverImage) {
        setRefreshedCover('');
        return;
      }

      try {
        const urlObj = new URL(eventRaw.coverImage);
        const key = urlObj.pathname.startsWith('/') ? urlObj.pathname.slice(1) : urlObj.pathname;
        
        if (!key) {
          setRefreshedCover(eventRaw.coverImage);
          return;
        }

        const result = await refreshPhotoUrls([key]);
        if (result.success && result.urls[key]) {
          setRefreshedCover(result.urls[key]);
        } else {
          setRefreshedCover(eventRaw.coverImage);
        }
      } catch (err) {
        console.error('[REFRESH_COVER] Failed:', err);
        setRefreshedCover(eventRaw.coverImage);
      }
    }

    refreshCover();
  }, [eventRaw?.coverImage]);

  const event: any = useMemo(() => {
    if (!eventRaw) return null;
    const eventData = eventRaw as any;
    let photos: any[] = eventData.items || [];
    if (refreshedPhotos.length > 0) {
      photos = refreshedPhotos;
    }
    return { 
      ...eventData, 
      items: photos,
      coverImage: refreshedCover || eventData.coverImage,
    };
  }, [eventRaw, subcollectionPhotos, refreshedPhotos, refreshedCover]);

  useEffect(() => {
    if (event) {
      setSettings({
        photographerNote: event.photographerNote || '',
        albumStatus: event.albumStatus || 'New Selection',
        isPublic: !!event.isPublic,
        isPaid: !!event.isPaid,
        isLocked: !!event.isLocked
      });
      setCurrentMusicUrl(event.musicUrl || '');
      
      // Populate modal settings when event loads
      setModalSettings({
        title: event.title || '',
        slug: event.slug || event.id || '',
        date: event.date || '',
        isPaid: !!event.isPaid,
        isLocked: !!event.isLocked,
        enableFavorites: event.enableFavorites ?? true,
        favoritesLimit: event.favoritesLimit ?? 50,
        enableProducts: event.enableProducts ?? false,
        digitalDownloadPrice: event.digitalDownloadPrice ?? 0,
        enableReviews: event.enableReviews ?? true,
        autoApproveReviews: event.autoApproveReviews ?? false,
        isPasswordProtected: event.isPasswordProtected ?? false,
        password: '', // Don't show old password for security
      });
    }
  }, [event]);

  useEffect(() => {
    return () => {
      if (audioPreviewRef.current) {
        audioPreviewRef.current.pause();
        audioPreviewRef.current = null;
      }
    };
  }, []);

  const handleSaveModalSettings = async () => {
    if (!eventRef) return;
    try {
      let updateData: any = {
        title: modalSettings.title,
        slug: modalSettings.slug,
        date: modalSettings.date,
        isPaid: modalSettings.isPaid,
        isLocked: modalSettings.isLocked,
        enableFavorites: modalSettings.enableFavorites,
        favoritesLimit: Number(modalSettings.favoritesLimit),
        enableProducts: modalSettings.enableProducts,
        digitalDownloadPrice: Number(modalSettings.digitalDownloadPrice),
        enableReviews: modalSettings.enableReviews,
        autoApproveReviews: modalSettings.autoApproveReviews,
        isPasswordProtected: modalSettings.isPasswordProtected,
        updatedAt: new Date().toISOString()
      };

      // ✅ Password Hash logic (Yeh naya add kiya hai)
      if (modalSettings.isPasswordProtected && modalSettings.password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(modalSettings.password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashedPassword = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        updateData.hashedPassword = hashedPassword;
      } else if (!modalSettings.isPasswordProtected) {
        updateData.hashedPassword = '';
      }

      await updateDoc(eventRef, updateData);
      toast({ title: "Settings Saved" });
      setShowSettingsModal(false);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Save Failed", description: err.message });
    }
  };

  const handleUpdateSettings = useCallback(async () => {
    if (!eventRef) return;
    try {
      await updateDoc(eventRef, { 
        photographerNote: settings.photographerNote,
        updatedAt: new Date().toISOString() 
      });
      toast({ title: "Note Saved" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Update Failed" });
    }
  }, [eventRef, settings.photographerNote, toast]);

  const handleSetCover = useCallback(async (imageUrl: string) => {
    if (!eventRef) return;
    try {
      let coverKey = '';
      try {
        const urlObj = new URL(imageUrl);
        coverKey = urlObj.pathname.startsWith('/') ? urlObj.pathname.slice(1) : urlObj.pathname;
      } catch (e) {}
      
      await updateDoc(eventRef, { 
        coverImage: imageUrl, 
        coverKey: coverKey,
        updatedAt: new Date().toISOString() 
      });
      setRefreshedCover(imageUrl);
      toast({ title: "Cover Updated" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Update Failed" });
    }
  }, [eventRef, toast]);

  const handleDeletePhoto = useCallback(async (item: any) => {
    if (!eventRef || !event || !id || processingItems.has(item.id)) return;
    
    setProcessingItems(prev => {
      const next = new Set(prev);
      next.add(item.id);
      return next;
    });

    try {
      await deleteDoc(doc(firestore, 'galleries', id, 'photos', item.id));
      
      const currentCount = event.photoCount || event.items?.length || 0;
      await updateDoc(eventRef, { 
        photoCount: Math.max(currentCount - 1, 0),
        updatedAt: new Date().toISOString() 
      });
      
      const keys = [item.storageKey, item.thumbKey, item.originalKey].filter(Boolean);
      if (keys.length > 0) {
        void deleteGalleryFiles(keys).catch(e => console.error('[PHOTO_DELETE] R2:', e));
      }
      
      toast({ title: "Photo Removed" });
    } catch (err: any) {
      console.error('[PHOTO_DELETE] Error:', err);
      toast({ variant: "destructive", title: "Remove Failed" });
    } finally {
      setProcessingItems(prev => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  }, [firestore, eventRef, event, id, processingItems, toast]);

  const handleMusicUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !eventRef || !user || !id) return;

    if (!file.type.startsWith('audio/')) {
      toast({ variant: "destructive", title: "Invalid File" });
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast({ variant: "destructive", title: "File Too Large", description: "Music must be under 20MB." });
      return;
    }

    setIsUploadingMusic(true);
    setMusicUploadProgress(0);

    try {
      const { success, uploadUrl, key, error } = await requestUploadUrl({
        userId: user.uid,
        galleryId: id,
        fileName: `music-${file.name}`,
        contentType: file.type,
        fileSize: file.size
      });

      if (!success || !uploadUrl) throw new Error(error || "Failed to authorize upload.");

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            setMusicUploadProgress(Math.round((e.loaded / e.total) * 100));
          }
        });
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`Upload failed: ${xhr.status}`));
        });
        xhr.addEventListener('error', () => reject(new Error("Network error")));
        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.send(file);
      });

      const urlResult = await getMusicSignedUrl(key!);
      if (!urlResult.success || !urlResult.url) throw new Error(urlResult.error || "Failed URL");

      await updateDoc(eventRef, {
        musicUrl: urlResult.url,
        musicStorageKey: key,
        updatedAt: new Date().toISOString()
      });

      setCurrentMusicUrl(urlResult.url);
      toast({ title: "Music Added" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Upload Failed", description: err.message });
    } finally {
      setIsUploadingMusic(false);
      setMusicUploadProgress(0);
      if (musicInputRef.current) musicInputRef.current.value = '';
    }
  }, [eventRef, user, id, toast]);

  const handleRemoveMusic = useCallback(async () => {
    if (!eventRef || !event) return;
    try {
      const oldKey = event.musicStorageKey;
      await updateDoc(eventRef, {
        musicUrl: '', musicStorageKey: '', updatedAt: new Date().toISOString()
      });
      setCurrentMusicUrl('');
      if (audioPreviewRef.current) {
        audioPreviewRef.current.pause();
        setIsPlayingMusic(false);
      }
      if (oldKey) void deleteGalleryFiles([oldKey]).catch(e => {});
      toast({ title: "Music Removed" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Remove Failed" });
    }
  }, [eventRef, event, toast]);

  const toggleMusicPreview = useCallback(() => {
    if (!currentMusicUrl) return;
    if (isPlayingMusic) {
      if (audioPreviewRef.current) audioPreviewRef.current.pause();
      setIsPlayingMusic(false);
    } else {
      if (!audioPreviewRef.current) {
        audioPreviewRef.current = new Audio(currentMusicUrl);
        audioPreviewRef.current.volume = 0.5;
        audioPreviewRef.current.onended = () => setIsPlayingMusic(false);
      }
      audioPreviewRef.current.play().catch(err => {
        toast({ variant: "destructive", title: "Playback Failed" });
      });
      setIsPlayingMusic(true);
    }
  }, [currentMusicUrl, isPlayingMusic, toast]);

  const confirmDelete = useCallback(async () => {
    if (!eventRef || !event || deleteConfirmText !== 'DELETE' || isDeleting) return;
    setShowDeleteDialog(false);
    setIsDeleting(true); 

    if (typeof document !== 'undefined') document.body.style.pointerEvents = '';

    const storageKeys: string[] = [];
    if (Array.isArray(event.items)) {
      event.items.forEach((item: any) => {
        if (item?.storageKey) storageKeys.push(item.storageKey);
        if (item?.thumbKey) storageKeys.push(item.thumbKey);
        if (item?.originalKey) storageKeys.push(item.originalKey);
      });
    }
    if (event.musicStorageKey) storageKeys.push(event.musicStorageKey);

    try {
      if (subcollectionPhotos && subcollectionPhotos.length > 0) {
        const photosRef = collection(firestore, 'galleries', id, 'photos');
        const allPhotos = await import('firebase/firestore').then(m => m.getDocs(photosRef));
        for (const photoDoc of allPhotos.docs) {
          await deleteDoc(photoDoc.ref);
        }
      }

      await deleteDoc(eventRef);
      toast({ title: "Gallery Deleted" });
      router.replace('/dashboard');
      if (storageKeys.length > 0) {
        void deleteGalleryFiles(storageKeys).catch(e => {});
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Delete Failed" });
      setIsDeleting(false);
    }
  }, [eventRef, event, deleteConfirmText, router, toast, isDeleting, firestore, id, subcollectionPhotos]);

  const updateToggle = useCallback(async (field: string, value: any) => {
    if (!eventRef) return;
    const updateData: any = { [field]: value, updatedAt: new Date().toISOString() };
    if (field === 'isPaid') updateData.isLocked = !value;

    try {
      await updateDoc(eventRef, updateData);
      toast({ title: `${field === 'isPublic' ? 'Public Access' : 'Download Access'} Updated` });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Update Failed', description: err.message });
      setSettings((prev: any) => ({ ...prev, [field]: !value }));
    }
  }, [eventRef, toast]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    toast({ title: "Link Copied" });
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const filteredAssets = useMemo(() => {
    if (!event?.items) return [];
    const search = assetSearch.toLowerCase().trim();
    if (!search) return event.items;
    return event.items.filter((item: any) => 
      item.fileName?.toLowerCase().includes(search)
    );
  }, [event?.items, assetSearch]);

  if (authLoading || dataLoading) return (
    <HafashLoader text="Loading Workspace..." />
  );

  if (error || !event) return (
    <div className="text-center py-40 bg-[#161616] border border-white/10 rounded-3xl m-6">
      <ImageIcon className="w-16 h-16 text-muted-foreground mx-auto mb-6 opacity-20" />
      <h2 className="text-2xl font-headline font-bold text-white">Event not found</h2>
      <Button className="mt-8 rounded-xl h-12 px-8 bg-primary text-primary-foreground font-bold" onClick={() => router.push('/dashboard')}>Back to Dashboard</Button>
    </div>
  );

  const galleryUrl = `${origin}/gallery/${event.slug || event.id}`;
  const favoritesCount = Array.isArray(event.items) ? event.items.filter((i: any) => i.isFavorite).length : 0;
  const totalItems = event.items?.length || 0;

  return (
    <div className="w-full min-h-screen bg-black space-y-6 pb-24 animate-in fade-in duration-500 absolute top-0 left-0 z-50">
      
      {/* Header Container */}
      <div className="w-full border-b border-white/10 px-6 py-6 bg-black">
        <div className="max-w-[1800px] mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 bg-[#111] hover:bg-[#222] shrink-0 text-white" onClick={() => router.push('/dashboard')}>
              <ArrowLeftIcon className="w-4 h-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[9px] uppercase tracking-widest text-primary font-bold">{event.category}</span>
                <span className="text-muted-foreground text-[10px]">•</span>
                <span className="text-[10px] text-muted-foreground flex items-center gap-1"><CalendarIcon className="w-3 h-3" /> {event.date}</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-headline font-bold text-white leading-none">{event.title}</h1>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1.5">
                <UserIcon className="w-3 h-3" /> {event.clientName}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Link href={`/gallery/${event.slug || event.id}`} target="_blank" className="flex-1 md:flex-none">
               <Button size="sm" className="w-full md:w-auto rounded-xl h-9 bg-white text-black hover:bg-gray-200 font-bold gap-1.5 text-xs">
                 <EyeIcon className="w-3.5 h-3.5" /> Preview
               </Button>
            </Link>
            <Button 
              size="sm"
              variant="outline" 
              className="flex-1 md:flex-none rounded-xl h-9 border-white/10 font-bold gap-1.5 bg-[#111] hover:bg-[#222] text-white text-xs"
              onClick={() => handleCopy(galleryUrl)}
            >
              {copiedLink ? <CheckIcon className="w-3.5 h-3.5 text-green-500" /> : <CopyIcon className="w-3.5 h-3.5" />}
              {copiedLink ? "Copied" : "Share"}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-[1800px] mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start mt-6">
          
        {/* Left Side: Photos (Takes 9/12 columns) */}
        <div className="lg:col-span-9 space-y-6 w-full">
          
          <Card className="bg-[#111] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
            <CardHeader className="border-b border-white/10 px-5 py-4 flex flex-row items-center justify-between shrink-0 bg-[#161616]">
              <CardTitle className="text-base font-headline font-bold flex items-center gap-2 text-white">
                <ImageIcon className="w-4 h-4 text-primary" /> Gallery Photos <span className="text-muted-foreground text-xs font-sans font-normal ml-1">({totalItems})</span>
              </CardTitle>
              <Link href={`/events/${id}/upload`}>
                <Button size="sm" className="rounded-lg bg-primary/20 text-primary hover:bg-primary/30 font-bold gap-1.5 h-8 text-xs">
                  <UploadIcon className="w-3.5 h-3.5" /> Upload
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-5">
              {totalItems === 0 ? (
                <div className="text-center py-24 border-2 border-dashed border-white/10 rounded-2xl bg-black h-full flex flex-col items-center justify-center">
                  <LayoutGridIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                  <p className="text-muted-foreground italic text-sm">No photos uploaded yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                  {event.items.slice(0, 23).map((item: any) => {
                    const isCover = event.coverImage === item.url;
                    return (
                      <div key={item.id} className="group relative aspect-[4/5] rounded-xl overflow-hidden border border-white/10 bg-black">
                        <img src={item.thumbUrl || item.url} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt="Asset" loading="lazy" />
                        
                        <div className="absolute top-2 left-2 right-2 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <div className="flex gap-1 bg-black/80 backdrop-blur-md p-1 rounded-lg border border-white/20 shadow-xl">
                             <button 
                               onClick={() => !isCover && handleSetCover(item.url)}
                               className={cn("p-1.5 rounded-md transition-colors", isCover ? "text-primary" : "text-white hover:bg-white/20")}
                               title="Set Cover"
                             >
                               <StarIcon className={cn("w-3.5 h-3.5", isCover && "fill-primary")} />
                             </button>
                             <button 
                               onClick={() => handleDeletePhoto(item)}
                               className="p-1.5 rounded-md text-white hover:bg-destructive/90 transition-colors"
                               title="Delete"
                               disabled={processingItems.has(item.id)}
                             >
                               {processingItems.has(item.id) ? <Loader2Icon className="w-3.5 h-3.5 animate-spin" /> : <Trash2Icon className="w-3.5 h-3.5" />}
                             </button>
                          </div>
                          {isCover && (
                            <div className="bg-primary text-primary-foreground p-1.5 rounded-md shadow-lg" title="Current Cover">
                              <CrownIcon className="w-3.5 h-3.5" />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  
                  {totalItems > 23 && (
                    <button
                      onClick={() => setShowAllAssets(true)}
                      className="aspect-[4/5] rounded-xl border-2 border-dashed border-primary/40 flex flex-col items-center justify-center bg-[#161616] hover:border-primary hover:bg-[#222] transition-all cursor-pointer group"
                    >
                      <span className="text-3xl font-headline font-bold text-primary">+{totalItems - 23}</span>
                      <span className="text-[9px] font-bold uppercase tracking-widest text-primary mt-1 group-hover:scale-105 transition-transform">
                        View All
                      </span>
                    </button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Welcome Note Card */}
            <Card className="bg-[#111] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
              <CardHeader className="border-b border-white/10 px-5 py-4 shrink-0 bg-[#161616]">
                <CardTitle className="text-sm font-headline font-bold flex items-center gap-2 text-white">
                  <FileTextIcon className="w-4 h-4 text-primary" /> Welcome Note
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 flex-1 flex flex-col gap-3">
                <Textarea 
                  placeholder="Write a message..." 
                  className="flex-1 min-h-[100px] rounded-xl bg-black border-white/10 p-3 text-sm focus:border-primary/50 text-white/90 resize-none"
                  value={settings.photographerNote}
                  onChange={(e) => setSettings({...settings, photographerNote: e.target.value})}
                />
                <div className="flex justify-end">
                  <Button size="sm" className="rounded-lg px-6 h-8 text-xs font-bold" onClick={handleUpdateSettings}>
                    Save
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Background Music Card */}
            <Card className="bg-[#111] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
              <CardHeader className="border-b border-white/10 px-5 py-4 shrink-0 bg-[#161616]">
                <CardTitle className="text-sm font-headline font-bold flex items-center gap-2 text-white">
                  <MusicIcon className="w-4 h-4 text-primary" /> Music
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 flex-1 flex flex-col justify-center">
                <input ref={musicInputRef} type="file" accept="audio/*" className="hidden" onChange={handleMusicUpload} disabled={isUploadingMusic} />

                {!currentMusicUrl ? (
                  <div 
                    onClick={() => !isUploadingMusic && musicInputRef.current?.click()}
                    className={cn(
                      "h-full min-h-[100px] border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer group",
                      isUploadingMusic ? "border-primary/50 bg-primary/10" : "border-white/10 bg-black hover:border-primary/50 hover:bg-[#1A1A1A]"
                    )}
                  >
                    {isUploadingMusic ? (
                      <Loader2Icon className="w-5 h-5 text-primary animate-spin mb-1" />
                    ) : (
                      <UploadIcon className="w-5 h-5 text-muted-foreground group-hover:text-primary mb-1" />
                    )}
                    <p className="text-xs font-bold text-white">
                      {isUploadingMusic ? `Uploading... ${musicUploadProgress}%` : "Upload Music"}
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center justify-between bg-black rounded-xl p-3 border border-white/10">
                    <div className="flex items-center gap-3">
                      <Button
                        size="icon"
                        className="h-8 w-8 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shrink-0"
                        onClick={toggleMusicPreview}
                      >
                        {isPlayingMusic ? <PauseIcon className="w-3.5 h-3.5" /> : <PlayIcon className="w-3.5 h-3.5 ml-0.5" />}
                      </Button>
                      <div>
                        <p className="text-xs font-bold text-white">Background Track</p>
                        <p className="text-[9px] text-primary uppercase tracking-wider">{isPlayingMusic ? "Playing" : "Ready"}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-destructive hover:bg-destructive/10" onClick={handleRemoveMusic}>
                      <Trash2Icon className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Side: Settings Buttons */}
        <div className="lg:col-span-3 space-y-4 w-full sticky top-6">
          
          <Card className="bg-[#111] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
            <CardContent className="p-2 flex flex-col gap-2">
              <Button 
                variant="ghost" 
                className="w-full justify-start h-11 px-4 text-sm font-bold text-white hover:bg-[#222]"
                onClick={() => setShowSettingsModal(true)}
              >
                <SettingsIcon className="w-4 h-4 mr-3 text-primary" /> Settings
              </Button>
              <Button 
                variant="ghost" 
                className="w-full justify-start h-11 px-4 text-sm font-bold text-white hover:bg-[#222]"
                onClick={() => toast({title: "Coming soon", description: "Design & Cover options are coming soon."})}
              >
                <PaletteIcon className="w-4 h-4 mr-3 text-primary" /> Design and cover
              </Button>
            </CardContent>
          </Card>

          {/* Analytics Card */}
          <Card className="bg-[#111] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
            <CardHeader className="p-4 border-b border-white/10 bg-[#161616]">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                <Zap className="w-3.5 h-3.5" /> Analytics
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-black p-3 rounded-xl border border-white/5 text-center">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Views</p>
                  <p className="text-lg font-headline font-bold text-white">{event.viewCount || 0}</p>
                </div>
                <div className="bg-black p-3 rounded-xl border border-white/5 text-center">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Visitors</p>
                  <p className="text-lg font-headline font-bold text-white">{event.uniqueVisitors || 0}</p>
                </div>
                <div className="bg-black p-3 rounded-xl border border-white/5 text-center">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Favorites</p>
                  <p className="text-lg font-headline font-bold text-primary">{favoritesCount}</p>
                </div>
                <div className="bg-black p-3 rounded-xl border border-white/5 text-center">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Downloads</p>
                  <p className="text-lg font-headline font-bold text-white">{event.downloadCount || 0}</p>
                </div>
              </div>
              
              <Link href={`/events/${id}/analytics`} className="block">
                <Button variant="outline" className="w-full h-8 rounded-lg text-[10px] font-bold border-white/10 hover:bg-[#222] text-white">
                  Full Analytics <ExternalLinkIcon className="w-2.5 h-2.5 ml-1" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="bg-[#1A0A0A] border border-red-900/30 rounded-3xl overflow-hidden shadow-2xl">
            <CardContent className="p-4">
              <Button variant="destructive" className="w-full rounded-xl font-bold h-9 text-[11px]" onClick={() => setShowDeleteDialog(true)}>
                <Trash2Icon className="w-3.5 h-3.5 mr-1.5" /> Delete Gallery
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ═══ GALLERY SETTINGS MODAL (Wfolio Style) ═══ */}
      <Dialog open={showSettingsModal} onOpenChange={setShowSettingsModal}>
        <DialogContent className="bg-[#111] border border-white/10 rounded-2xl max-w-2xl p-0 overflow-hidden shadow-2xl [&>button]:hidden">
          
          {/* Modal Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <DialogTitle className="text-2xl font-headline font-bold text-white">Gallery settings</DialogTitle>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-white/10 text-muted-foreground" onClick={() => setShowSettingsModal(false)}>
              <XIcon className="w-5 h-5" />
            </Button>
          </div>

          {/* Modal Tabs */}
          <div className="px-6 border-b border-white/10 flex gap-6 overflow-x-auto custom-scrollbar">
            <button onClick={() => setActiveModalTab('main')} className={cn("text-sm font-bold pb-3 pt-2 whitespace-nowrap transition-colors", activeModalTab === 'main' ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-white")}>Main</button>
            <button onClick={() => setActiveModalTab('favorites')} className={cn("text-sm font-bold pb-3 pt-2 whitespace-nowrap transition-colors", activeModalTab === 'favorites' ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-white")}>Favorites</button>
            <button onClick={() => setActiveModalTab('products')} className={cn("text-sm font-bold pb-3 pt-2 whitespace-nowrap transition-colors", activeModalTab === 'products' ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-white")}>Products</button>
            <button onClick={() => setActiveModalTab('reviews')} className={cn("text-sm font-bold pb-3 pt-2 whitespace-nowrap transition-colors", activeModalTab === 'reviews' ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-white")}>Reviews</button>
            <button onClick={() => setActiveModalTab('privacy')} className={cn("text-sm font-bold pb-3 pt-2 whitespace-nowrap transition-colors", activeModalTab === 'privacy' ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-white")}>Privacy</button>
          </div>

          {/* Modal Body */}
          <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
            
            {/* ─── MAIN TAB ─── */}
            {activeModalTab === 'main' && (
              <>
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs font-bold text-muted-foreground mb-1 block">Gallery name</Label>
                    <Input 
                      value={modalSettings.title}
                      onChange={(e) => setModalSettings({...modalSettings, title: e.target.value})}
                      className="h-10 bg-[#161616] border-white/10"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-bold text-muted-foreground mb-1 block">Gallery link</Label>
                    <div className="flex">
                      <div className="h-10 px-3 flex items-center bg-[#161616] border border-r-0 border-white/10 rounded-l-md text-xs text-muted-foreground">
                        hafash.pk/gallery/
                      </div>
                      <Input 
                        value={modalSettings.slug}
                        onChange={(e) => setModalSettings({...modalSettings, slug: e.target.value})}
                        className="h-10 bg-[#161616] border-white/10 rounded-l-none"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-bold text-muted-foreground mb-1 block">Shoot date</Label>
                    <Input 
                      type="date"
                      value={modalSettings.date || ''}
                      onChange={(e) => setModalSettings({...modalSettings, date: e.target.value})}
                      className="h-10 bg-[#161616] border-white/10"
                    />
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-white">Allow original file downloads</p>
                    </div>
                    <Switch 
                      checked={modalSettings.isPaid} 
                      onCheckedChange={(val) => setModalSettings({...modalSettings, isPaid: val})} 
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-white">Add watermark</p>
                      <p className="text-xs text-muted-foreground">Applied to photos when downloads are disabled.</p>
                    </div>
                    <Switch 
                      checked={modalSettings.isLocked} 
                      onCheckedChange={(val) => setModalSettings({...modalSettings, isLocked: val})} 
                    />
                  </div>
                </div>
              </>
            )}

            {/* ─── FAVORITES TAB ─── */}
            {activeModalTab === 'favorites' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-white">Enable Favorites</p>
                    <p className="text-xs text-muted-foreground">Allow clients to heart photos.</p>
                  </div>
                  <Switch 
                    checked={modalSettings.enableFavorites} 
                    onCheckedChange={(val) => setModalSettings({...modalSettings, enableFavorites: val})} 
                  />
                </div>

                {modalSettings.enableFavorites && (
                  <div>
                    <Label className="text-xs font-bold text-muted-foreground mb-1 block">Favorites Limit (Max photos a client can select)</Label>
                    <Input 
                      type="number"
                      value={modalSettings.favoritesLimit}
                      onChange={(e) => setModalSettings({...modalSettings, favoritesLimit: Number(e.target.value)})}
                      className="h-10 bg-[#161616] border-white/10"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">Set to 0 for unlimited.</p>
                  </div>
                )}
              </div>
            )}

            {/* ─── PRODUCTS TAB ─── */}
            {activeModalTab === 'products' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-white">Enable Products (Paid Downloads)</p>
                    <p className="text-xs text-muted-foreground">Clients must pay to download high-res.</p>
                  </div>
                  <Switch 
                    checked={modalSettings.enableProducts} 
                    onCheckedChange={(val) => setModalSettings({...modalSettings, enableProducts: val, isPaid: !val ? modalSettings.isPaid : false})} 
                  />
                </div>

                {modalSettings.enableProducts && (
                  <div>
                    <Label className="text-xs font-bold text-muted-foreground mb-1 block">Digital Download Price (PKR)</Label>
                    <Input 
                      type="number"
                      value={modalSettings.digitalDownloadPrice}
                      onChange={(e) => setModalSettings({...modalSettings, digitalDownloadPrice: Number(e.target.value)})}
                      className="h-10 bg-[#161616] border-white/10"
                    />
                  </div>
                )}
              </div>
            )}
            
            {/* ─── REVIEWS TAB ─── */}
            {activeModalTab === 'reviews' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-white">Enable Reviews</p>
                    <p className="text-xs text-muted-foreground">Allow clients to leave feedback.</p>
                  </div>
                  <Switch 
                    checked={modalSettings.enableReviews} 
                    onCheckedChange={(val) => setModalSettings({...modalSettings, enableReviews: val})} 
                  />
                </div>

                {modalSettings.enableReviews && (
                  <div className="flex items-center justify-between pt-4 border-t border-white/10">
                    <div>
                      <p className="text-sm font-bold text-white">Auto-Approve Reviews</p>
                      <p className="text-xs text-muted-foreground">Show reviews immediately without your approval.</p>
                    </div>
                    <Switch 
                      checked={modalSettings.autoApproveReviews} 
                      onCheckedChange={(val) => setModalSettings({...modalSettings, autoApproveReviews: val})} 
                    />
                  </div>
                )}
              </div>
            )}

            {/* ─── PRIVACY TAB ─── */}
            {activeModalTab === 'privacy' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-white">Password Protect Gallery</p>
                    <p className="text-xs text-muted-foreground">Clients need a password to view photos.</p>
                  </div>
                  <Switch 
                    checked={modalSettings.isPasswordProtected} 
                    onCheckedChange={(val) => setModalSettings({...modalSettings, isPasswordProtected: val})} 
                  />
                </div>

                {modalSettings.isPasswordProtected && (
                  <div>
                    <Label className="text-xs font-bold text-muted-foreground mb-1 block">Set Password</Label>
                    <Input 
                      type="text"
                      placeholder="Enter gallery password..."
                      value={modalSettings.password}
                      onChange={(e) => setModalSettings({...modalSettings, password: e.target.value})}
                      className="h-10 bg-[#161616] border-white/10"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="p-6 border-t border-white/10 flex items-center justify-between bg-[#161616]">
            <Button 
              variant="ghost" 
              className="text-destructive hover:bg-destructive/10 hover:text-destructive font-bold text-xs"
              onClick={() => {
                setShowSettingsModal(false);
                setShowDeleteDialog(true);
              }}
            >
              <Trash2Icon className="w-4 h-4 mr-2" /> Delete gallery
            </Button>
            <Button 
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-8"
              onClick={handleSaveModalSettings}
            >
              Save
            </Button>
          </div>

        </DialogContent>
      </Dialog>

      {/* FULL SCREEN LIGHTBOX MODAL */}
      <Dialog open={showAllAssets} onOpenChange={setShowAllAssets}>
        <DialogContent className="max-w-[100vw] w-screen h-screen bg-black border-none rounded-none p-0 overflow-hidden flex flex-col gap-0 [&>button]:hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 lg:px-8 lg:py-6 border-b border-white/10 bg-[#0A0A0A] shrink-0 z-50">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30">
                <LayoutGridIcon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-headline font-bold text-white leading-none">All Gallery Photos</DialogTitle>
                <p className="text-xs text-muted-foreground mt-1">{filteredAssets.length} photos</p>
              </div>
            </div>

            <div className="flex items-center gap-4 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-80">
                <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by filename..."
                  className="pl-11 h-11 bg-[#111] border-white/10 rounded-xl text-white placeholder:text-muted-foreground focus:border-primary/50"
                  value={assetSearch}
                  onChange={(e) => setAssetSearch(e.target.value)}
                />
              </div>
              <Button variant="ghost" size="icon" className="h-11 w-11 rounded-xl shrink-0 bg-[#111] hover:bg-[#222] text-white" onClick={() => setShowAllAssets(false)}>
                <XIcon className="w-6 h-6" />
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 p-4 lg:p-8 custom-scrollbar">
            {filteredAssets.length === 0 ? (
              <div className="text-center py-32 flex flex-col items-center">
                <SearchIcon className="w-16 h-16 text-muted-foreground mb-6 opacity-20" />
                <p className="text-muted-foreground text-lg italic">No photos found matching your search.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3 lg:gap-4">
                  {filteredAssets.slice(0, displayLimit).map((item: any) => {
                    const isCover = event.coverImage === item.url;
                    const isProcessing = processingItems.has(item.id);
                    return (
                      <div key={item.id} className={cn(
                        "group relative aspect-[3/4] rounded-xl overflow-hidden border bg-black transition-all",
                        isCover ? "border-primary ring-2 ring-primary/30" : "border-white/10 hover:border-white/30"
                      )}>
                        <img src={item.thumbUrl || item.url} className="w-full h-full object-cover" alt={item.fileName || "Asset"} loading="lazy" />
                        
                        <div className="absolute top-3 left-3 right-3 flex justify-between opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-[-10px] group-hover:translate-y-0">
                           <div className="bg-black/80 backdrop-blur-md p-1.5 rounded-xl flex gap-1 border border-white/20 shadow-xl">
                             {!isCover && (
                               <button onClick={() => handleSetCover(item.url)} className="p-2 text-white hover:bg-white/20 rounded-lg transition-colors" title="Set Cover">
                                 <StarIcon className="w-4 h-4" />
                               </button>
                             )}
                             <button onClick={() => handleDeletePhoto(item)} className="p-2 text-white hover:bg-destructive/90 rounded-lg transition-colors" disabled={isProcessing} title="Delete">
                               {isProcessing ? <Loader2Icon className="w-4 h-4 animate-spin" /> : <Trash2Icon className="w-4 h-4" />}
                             </button>
                           </div>
                           {isCover && <div className="bg-primary p-2 rounded-xl text-primary-foreground shadow-lg"><CrownIcon className="w-4 h-4" /></div>}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {filteredAssets.length > displayLimit && (
                  <div className="flex justify-center pt-12 pb-8">
                    <Button variant="outline" className="rounded-xl h-12 px-8 font-bold border-primary/30 text-primary hover:bg-primary/10" onClick={() => setDisplayLimit(prev => prev + 80)}>
                      Load More Photos ({filteredAssets.length - displayLimit} remaining)
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-[#111] border border-white/10 rounded-2xl max-w-sm p-6 shadow-2xl">
          <AlertDialogHeader>
            <div className="bg-destructive/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircleIcon className="w-8 h-8 text-destructive" />
            </div>
            <AlertDialogTitle className="text-xl font-headline font-bold text-center text-white">Delete Gallery?</AlertDialogTitle>
            <AlertDialogDescription className="text-center pt-2">
              <p className="text-sm text-muted-foreground mb-4">
                This action cannot be undone. Please type <strong className="text-white">DELETE</strong> to confirm.
              </p>
              <Input 
                placeholder="Type DELETE..." 
                className="text-center font-bold h-12 rounded-xl border-white/10 bg-black text-white" 
                value={deleteConfirmText} 
                onChange={(e) => setDeleteConfirmText(e.target.value)} 
              />
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-3 mt-6">
            <AlertDialogCancel className="rounded-xl flex-1 h-11 font-bold border-white/10 hover:bg-[#222] text-white">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              className="rounded-xl bg-destructive text-white hover:bg-destructive/90 font-bold flex-1 h-11 disabled:opacity-50" 
              onClick={confirmDelete} 
              disabled={deleteConfirmText !== 'DELETE'}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}