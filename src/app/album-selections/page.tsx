"use client";

import { useParams, useRouter } from 'next/navigation';
import { 
  Download, Loader2, ShieldCheck, BookOpen, Camera, 
  ArrowLeft, Lock, ChevronRight, Monitor 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useFirestore } from '@/firebase';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { HafashLoader } from '@/components/ui/hafash-loader';
import { refreshPhotoUrls } from '@/app/actions/storage';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export default function AlbumDetailsPage() {
  const params = useParams();
  const galleryId = (params?.id as string) || '';
  const { toast } = useToast();
  const router = useRouter();
  const firestore = useFirestore();
  
  const [activeGallery, setActiveGallery] = useState<any>(null);
  const [favoriteItems, setFavoriteItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPreparing, setIsPreparing] = useState(false);
  const [preparationStep, setPreparationStep] = useState<string>('');

  // ✅ Load everything in ONE effect
  useEffect(() => {
    let cancelled = false;

    async function loadAll() {
      if (!firestore || !galleryId) {
        if (!cancelled) setLoading(false);
        return;
      }

      try {
        setLoading(true);
        console.log('[ALBUM_DETAILS] Loading gallery:', galleryId);

        // ✅ Step 1: Get gallery
        const galleryRef = doc(firestore, 'galleries', galleryId);
        const gallerySnap = await getDoc(galleryRef);
        
        if (cancelled) return;
        
        if (!gallerySnap.exists()) {
          console.log('[ALBUM_DETAILS] Gallery not found');
          setActiveGallery(null);
          setLoading(false);
          return;
        }

        const galleryData = { id: gallerySnap.id, ...gallerySnap.data() };
        console.log('[ALBUM_DETAILS] Gallery loaded:', galleryData.title);
        setActiveGallery(galleryData);

        // ✅ Step 2: Get favorites from subcollection
        const photosRef = collection(firestore, 'galleries', galleryId, 'photos');
        const favQuery = query(photosRef, where('isFavorite', '==', true));
        const favSnap = await getDocs(favQuery);
        
        if (cancelled) return;
        
        const favs = favSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        console.log('[ALBUM_DETAILS] Favorites found:', favs.length);

        // ✅ Step 3: Refresh URLs
        const keysToRefresh: string[] = [];
        favs.forEach((p: any) => {
          if (p.storageKey) keysToRefresh.push(p.storageKey);
          if (p.thumbKey) keysToRefresh.push(p.thumbKey);
        });

        let urlMap: Record<string, string> = {};
        for (let i = 0; i < keysToRefresh.length; i += 200) {
          const batch = keysToRefresh.slice(i, i + 200);
          try {
            const result = await refreshPhotoUrls(batch);
            if (result.success) Object.assign(urlMap, result.urls);
          } catch (e) {
            console.error('[ALBUM_REFRESH]', e);
          }
        }

        const refreshedFavs = favs.map((p: any) => ({
          ...p,
          url: urlMap[p.storageKey] || p.url,
          masterUrl: urlMap[p.storageKey] || p.masterUrl,
          thumbUrl: p.thumbKey ? (urlMap[p.thumbKey] || p.thumbUrl) : (urlMap[p.storageKey] || p.url),
        }));

        if (!cancelled) setFavoriteItems(refreshedFavs);

      } catch (err: any) {
        console.error('[ALBUM_DETAILS] Error:', err);
        if (!cancelled) setActiveGallery(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadAll();

    return () => { cancelled = true; };
  }, [firestore, galleryId]);

  const selectedItems = favoriteItems;

  // ✅ Individual download
  const handleDownloadOriginal = useCallback(async (item: any) => {
    const downloadUrl = item.masterUrl || item.url;
    const filename = item.fileName || `${activeGallery?.title || 'hafash'}-${item.id}.jpg`;
    const proxyUrl = `/api/download?url=${encodeURIComponent(downloadUrl)}&filename=${encodeURIComponent(filename)}`;
    
    try {
      toast({ title: "Downloading...", description: "High-resolution master file." });
      const link = document.createElement('a');
      link.href = proxyUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      toast({ variant: "destructive", title: "Download Failed" });
    }
  }, [activeGallery?.title, toast]);

  // ✅ ZIP download
  const handleDownloadAll = useCallback(async () => {
    if (isPreparing || !activeGallery || selectedItems.length === 0) return;
    
    setIsPreparing(true);
    const zip = new JSZip();
    
    try {
      for (let i = 0; i < selectedItems.length; i++) {
        const item = selectedItems[i];
        setPreparationStep(`Fetching: ${i + 1} / ${selectedItems.length}`);
        
        const url = item.masterUrl || item.url;
        if (!url) continue;
        
        const proxyUrl = `/api/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(item.fileName || `photo-${i + 1}.jpg`)}`;
        const res = await fetch(proxyUrl);
        const blob = await res.blob();
        zip.file(item.fileName || `master-${i + 1}.jpg`, blob);
      }
      
      setPreparationStep('Compiling ZIP...');
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `${activeGallery.title || 'hafash'}-Selection.zip`);
      
      toast({ title: "Download Ready", description: `${selectedItems.length} masterpieces packaged.` });
    } catch (error) {
      toast({ variant: "destructive", title: "Package Error", description: "Failed to compile." });
    } finally {
      setIsPreparing(false);
      setPreparationStep('');
    }
  }, [activeGallery, selectedItems, isPreparing, toast]);

  // ✅ Loading
  if (loading) {
    return <HafashLoader text="Accessing Secure Review Workspace..." />;
  }

  // ✅ Not found
  if (!activeGallery) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
        <div className="bg-destructive/10 p-6 rounded-full mb-8 ring-4 ring-destructive/5">
          <Lock className="w-12 h-12 text-destructive" />
        </div>
        <h1 className="text-3xl lg:text-4xl font-headline font-bold mb-4 uppercase tracking-tighter">
          Gallery Not Found
        </h1>
        <p className="text-muted-foreground max-w-md mb-8 italic leading-relaxed">
          Yeh gallery exist nahi karti ya delete ho chuki hai.
        </p>
        <Link href="/album-selections">
          <Button className="rounded-full px-10 h-14 bg-primary text-primary-foreground font-bold shadow-2xl hover:scale-105 transition-all">
            Back to Selections
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-card border-b border-border/50 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon" 
                className="rounded-full" 
                onClick={() => router.push('/album-selections')}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <BookOpen className="w-5 h-5 text-primary" />
                </div>
                <span className="text-[10px] uppercase tracking-[0.4em] font-bold text-primary">
                  Designer Workspace
                </span>
              </div>
            </div>
            <h1 className="text-4xl md:text-6xl font-headline font-bold tracking-tight">
              {activeGallery.title}
            </h1>
            <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground font-medium">
              <span className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-primary" /> {activeGallery.clientName}
              </span>
              <span className="flex items-center gap-2 text-primary font-bold">
                {selectedItems.length} Selection Masterpieces
              </span>
              <span className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-green-500" /> Original File Access Active
              </span>
            </div>
          </div>
          
          <div className="flex gap-4 w-full md:w-auto">
            <Button 
              className="flex-1 md:flex-none h-14 px-10 bg-primary text-primary-foreground hover:bg-primary/90 rounded-full font-bold gap-3 shadow-xl transition-all hover:scale-105 active:scale-95 disabled:opacity-70"
              onClick={handleDownloadAll}
              disabled={isPreparing || selectedItems.length === 0}
            >
              {isPreparing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
              {isPreparing ? preparationStep : "Download Full Selection"}
            </Button>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-7xl mx-auto px-6 mt-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {selectedItems.map((item: any) => (
            <div 
              key={item.id} 
              className="bg-card border border-border/30 rounded-3xl overflow-hidden group hover:border-primary/50 transition-all shadow-lg hover:translate-y-[-4px]"
            >
              <div className="aspect-[4/5] relative overflow-hidden bg-background">
                <img 
                  src={item.thumbUrl || item.url} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                  alt="Selected Item"
                  loading="lazy"
                  decoding="async"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Button 
                    size="icon" 
                    className="h-16 w-16 rounded-full bg-primary text-primary-foreground shadow-2xl scale-75 group-hover:scale-100 transition-transform"
                    onClick={() => handleDownloadOriginal(item)}
                  >
                    <Download className="w-6 h-6" />
                  </Button>
                </div>
              </div>
              <div className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-mono text-muted-foreground uppercase mb-1">
                    Asset: {item.id.slice(0, 8)}
                  </p>
                  <p className="text-xs font-bold text-primary">High-Resolution Master</p>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="rounded-lg gap-2 text-[10px] font-bold uppercase hover:bg-primary/10 hover:text-primary"
                  onClick={() => handleDownloadOriginal(item)}
                >
                  Download <ChevronRight className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {selectedItems.length === 0 && (
          <div className="text-center py-40 border-2 border-dashed border-border/30 rounded-[3rem]">
            <Monitor className="w-12 h-12 text-muted-foreground mx-auto mb-6 opacity-20" />
            <p className="text-xl text-muted-foreground italic font-headline">
              No favorites have been synchronized for this selection.
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="max-w-4xl mx-auto text-center mt-20 px-6 py-12 border-t border-border/20">
        <div className="flex items-center justify-center gap-2 mb-6 text-primary">
          <img src="/hafash-logo.png" alt="Hafash" className="h-12 w-auto" />
          <span className="text-xl font-headline font-bold italic">Hafash Studio Flow</span>
        </div>
        <div className="text-[10px] uppercase tracking-[0.5em] text-muted-foreground/30 font-bold">
          End-to-End Asset Integrity Guaranteed by Hafash
        </div>
      </div>
    </div>
  );
}