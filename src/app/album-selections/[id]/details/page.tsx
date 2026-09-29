"use client";

import { useFirestore, useDoc, useUser } from '@/firebase';
import { useParams, useRouter } from 'next/navigation';
import { 
  Download, FileText, Check, X, Loader2, ArrowLeft, 
  ImageIcon, User, Calendar, Grid, CheckCircle2, Package
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { doc, collection, getDocs, query, where } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { HafashLoader } from '@/components/ui/hafash-loader';
import { refreshPhotoUrls } from '@/app/actions/storage';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export default function AlbumSelectionDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const { toast } = useToast();
  const router = useRouter();
  const firestore = useFirestore();
  const { user, loading: authLoading } = useUser();

  const [favoriteItems, setFavoriteItems] = useState<any[]>([]);
  const [loadingFavorites, setLoadingFavorites] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // ✅ Gallery document
  const eventRef = useMemo(() => {
    if (!firestore || !id) return null;
    return doc(firestore, 'galleries', id);
  }, [firestore, id]);

  const { data: event, loading: dataLoading } = useDoc(eventRef);

  // ✅ Fetch favorites from SUBCOLLECTION (not from event.items)
  useEffect(() => {
    let cancelled = false;

    async function loadFavorites() {
      if (!firestore || !id) {
        if (!cancelled) setLoadingFavorites(false);
        return;
      }

      try {
        setLoadingFavorites(true);
        console.log('[ALBUM_DETAIL] Loading favorites for:', id);

        const photosRef = collection(firestore, 'galleries', id, 'photos');
        const favQuery = query(photosRef, where('isFavorite', '==', true));
        const favSnap = await getDocs(favQuery);

        if (cancelled) return;

        const favs = favSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        console.log('[ALBUM_DETAIL] Favorites found:', favs.length);

        // ✅ Refresh URLs (7-day fix)
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
        console.error('[ALBUM_DETAIL] Error:', err);
      } finally {
        if (!cancelled) setLoadingFavorites(false);
      }
    }

    loadFavorites();

    return () => { cancelled = true; };
  }, [firestore, id]);

  const selectedItems = favoriteItems;

  const toggleSelect = (itemId: string) => {
    const next = new Set(selectedIds);
    if (next.has(itemId)) next.delete(itemId);
    else next.add(itemId);
    setSelectedIds(next);
  };

  const selectAll = () => {
    if (selectedIds.size === selectedItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(selectedItems.map((i: any) => i.id)));
    }
  };

  // ✅ Download via proxy (CORS bypass)
  const handleDownload = async () => {
    if (selectedIds.size === 0 || isProcessing) return;
    
    setIsProcessing(true);
    setProgress("Preparing package...");
    
    try {
      const zip = new JSZip();
      const itemsToDownload = selectedItems.filter((i: any) => selectedIds.has(i.id));
      
      for (let i = 0; i < itemsToDownload.length; i++) {
        const item = itemsToDownload[i];
        setProgress(`Fetching asset ${i + 1}/${itemsToDownload.length}`);
        
        const url = item.masterUrl || item.url;
        if (!url) continue;
        
        // ✅ Proxy se fetch (CORS bypass)
        const proxyUrl = `/api/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(item.fileName || `photo-${i + 1}.jpg`)}`;
        const res = await fetch(proxyUrl);
        if (!res.ok) throw new Error(`Failed to fetch ${item.fileName}`);
        const blob = await res.blob();
        
        const fileName = item.fileName || `selection-${item.id}.jpg`;
        zip.file(fileName, blob);
      }
      
      setProgress("Generating ZIP...");
      const content = await zip.generateAsync({ type: 'blob' });
      const zipName = `${event?.title || 'selections'}-package.zip`;
      saveAs(content, zipName);
      
      toast({ title: "Success", description: "Batch download started." });
    } catch (error: any) {
      console.error('[DOWNLOAD_BATCH]', error);
      toast({ variant: "destructive", title: "Download Failed", description: error.message });
    } finally {
      setIsProcessing(false);
      setProgress("");
    }
  };

  // ✅ CSV Export
  const handleExportCSV = () => {
    if (selectedItems.length === 0) return;
    
    const itemsToExport = selectedIds.size > 0 
      ? selectedItems.filter((i: any) => selectedIds.has(i.id))
      : selectedItems;

    const headers = ["ID", "Filename", "URL", "Master URL"];
    const rows = itemsToExport.map((i: any) => [
      i.id,
      i.fileName || "N/A",
      i.url,
      i.masterUrl || "N/A"
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(r => r.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const fileName = `${event?.title || 'album'}-selections.csv`;
    saveAs(blob, fileName);
    
    toast({ title: "CSV Exported", description: `Data for ${itemsToExport.length} assets ready.` });
  };

  if (authLoading || dataLoading || loadingFavorites) {
    return <HafashLoader text="Preparing Your Selection Workspace..." />;
  }

  if (!event) return null;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-border/50 pb-8">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="rounded-full" onClick={() => router.push('/album-selections')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">Selection Management</span>
            </div>
          </div>
          <div>
            <h1 className="text-4xl font-headline font-bold">{event.title}</h1>
            <div className="flex flex-wrap items-center gap-6 mt-2 text-muted-foreground text-[10px] font-bold uppercase tracking-widest">
              <span className="flex items-center gap-1.5"><User className="w-3 h-3 text-primary" /> {event.clientName}</span>
              <span className="flex items-center gap-1.5"><Calendar className="w-3 h-3 text-primary" /> {event.date}</span>
              <span className="flex items-center gap-1.5 text-primary"><CheckCircle2 className="w-3 h-3" /> {selectedItems.length} Total Favorites</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          <Button 
            variant="outline" 
            className="rounded-xl font-bold gap-2 h-12 border-border/50 hover:bg-primary/5 hover:text-primary"
            onClick={handleExportCSV}
            disabled={selectedItems.length === 0}
          >
            <FileText className="w-4 h-4" /> Export CSV
          </Button>
          <Button 
            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-bold gap-2 h-12 px-6 shadow-lg shadow-primary/20"
            onClick={handleDownload}
            disabled={selectedIds.size === 0 || isProcessing}
          >
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {isProcessing ? progress : `Download Selected (${selectedIds.size})`}
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-[10px] font-bold uppercase tracking-widest gap-2"
            onClick={selectAll}
            disabled={selectedItems.length === 0}
          >
            {selectedIds.size === selectedItems.length && selectedItems.length > 0 ? <X className="w-3 h-3" /> : <Check className="w-3 h-3" />}
            {selectedIds.size === selectedItems.length && selectedItems.length > 0 ? "Deselect All" : "Select All"}
          </Button>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            {selectedIds.size} / {selectedItems.length} Selected
          </span>
        </div>
        <div className="bg-muted/30 px-3 py-1.5 rounded-lg border border-border/50 flex items-center gap-2">
          <Grid className="w-3 h-3 text-muted-foreground" />
          <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Selection View</span>
        </div>
      </div>

      {selectedItems.length === 0 ? (
        <div className="text-center py-40 border-2 border-dashed border-border/20 rounded-[3rem] bg-card/10">
          <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
          <p className="text-muted-foreground italic font-headline text-xl">No favorites have been selected for this event yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {selectedItems.map((item: any) => {
            const isSelected = selectedIds.has(item.id);
            return (
              <div 
                key={item.id} 
                className={cn(
                  "bg-card border rounded-2xl overflow-hidden group cursor-pointer transition-all relative",
                  isSelected ? "border-primary ring-2 ring-primary/20 shadow-xl" : "border-border/50 hover:border-primary/50"
                )}
                onClick={() => toggleSelect(item.id)}
              >
                <div className="aspect-[4/5] relative overflow-hidden bg-background">
                  {item.thumbUrl || item.url ? (
                    <img 
                      src={item.thumbUrl || item.url} 
                      className={cn(
                        "w-full h-full object-cover transition-transform duration-700",
                        isSelected ? "scale-105" : "group-hover:scale-105"
                      )} 
                      alt={item.fileName || "Selection"}
                      loading="lazy"
                      decoding="async"
                    />
                  ) : null}
                  <div className={cn(
                    "absolute top-3 left-3 h-6 w-6 rounded-full flex items-center justify-center transition-all shadow-lg border-2",
                    isSelected ? "bg-primary text-primary-foreground border-primary" : "bg-black/20 text-transparent border-white/40 group-hover:border-white"
                  )}>
                    <Check className="w-3 h-3" />
                  </div>
                  <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="p-4 bg-card/80 backdrop-blur-md">
                   <p className="text-[9px] font-mono text-muted-foreground truncate" title={item.fileName}>
                     {item.fileName || `Asset: ${item.id.slice(0, 8)}`}
                   </p>
                   <p className="text-[10px] font-bold text-primary mt-1 uppercase tracking-tighter">
                     Selected Asset
                   </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="max-w-4xl mx-auto text-center mt-20 px-6 py-12 border-t border-border/20">
        <p className="text-muted-foreground text-[10px] uppercase tracking-[0.5em] font-bold">
          End-to-End Asset Integrity Guaranteed by Hafash
        </p>
      </div>
    </div>
  );
}