"use client";

import { useFirestore, useDoc, useUser } from '@/firebase';
import { useParams, useRouter } from 'next/navigation';
import { 
  Download, FileText, Check, X, Loader2, ArrowLeft, 
  ImageIcon, User, Calendar, Grid, CheckCircle2, Package,
  Share2, Copy, Link2, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { doc, collection, getDocs, query, where, updateDoc } from 'firebase/firestore';
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
  const [origin, setOrigin] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') setOrigin(window.location.origin);
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

  const { data: event, loading: dataLoading } = useDoc(eventRef);

  // ✅ Fetch favorites from subcollection
  useEffect(() => {
    let cancelled = false;

    async function loadFavorites() {
      if (!firestore || !id) {
        if (!cancelled) setLoadingFavorites(false);
        return;
      }

      try {
        setLoadingFavorites(true);

        const photosRef = collection(firestore, 'galleries', id, 'photos');
        const favQuery = query(photosRef, where('isFavorite', '==', true));
        const favSnap = await getDocs(favQuery);

        if (cancelled) return;

        const favs = favSnap.docs.map(d => ({ id: d.id, ...d.data() }));

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
          } catch (e) {}
        }

        const refreshedFavs = favs.map((p: any) => ({
          ...p,
          url: urlMap[p.storageKey] || p.url,
          masterUrl: urlMap[p.storageKey] || p.masterUrl,
          thumbUrl: p.thumbKey ? (urlMap[p.thumbKey] || p.thumbUrl) : (urlMap[p.storageKey] || p.url),
        }));

        if (!cancelled) setFavoriteItems(refreshedFavs);
      } catch (err) {
        console.error('[ALBUM_DETAIL]', err);
      } finally {
        if (!cancelled) setLoadingFavorites(false);
      }
    }

    loadFavorites();

    return () => { cancelled = true; };
  }, [firestore, id]);

  const selectedItems = favoriteItems;
  const hasLink = !!(event?.albumLinkToken && event?.albumLinkEnabled);
  const albumLinkUrl = hasLink ? `${origin}/album/${event.albumLinkToken}` : '';

  // ✅ Generate Album Link
  const handleGenerateLink = useCallback(async () => {
    if (!eventRef || isGenerating) return;
    setIsGenerating(true);

    try {
      const token = Array.from(crypto.getRandomValues(new Uint8Array(16)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      await updateDoc(eventRef, {
        albumLinkToken: token,
        albumLinkEnabled: true,
        albumLinkCreated: new Date().toISOString(),
      });

      const linkUrl = `${origin}/album/${token}`;
      navigator.clipboard.writeText(linkUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 3000);

      toast({
        title: "✅ Link Created & Copied",
        description: "Album designer ko bhejne ke liye ready hai.",
      });
    } catch (err: any) {
      console.error('[ALBUM_LINK]', err);
      toast({
        variant: "destructive",
        title: "Link Creation Failed",
        description: err.message,
      });
    } finally {
      setIsGenerating(false);
    }
  }, [eventRef, isGenerating, origin, toast]);

  // ✅ Copy existing link
  const handleCopyLink = useCallback(() => {
    if (!albumLinkUrl) return;
    navigator.clipboard.writeText(albumLinkUrl);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 3000);
    toast({ title: "✅ Link Copied!" });
  }, [albumLinkUrl, toast]);

  // ✅ Disable link
  const handleDisableLink = useCallback(async () => {
    if (!eventRef) return;
    if (!confirm('Link disable karna chahte hain? Designer link nahi khol payega.')) return;

    try {
      await updateDoc(eventRef, {
        albumLinkEnabled: false,
      });
      toast({ title: "Link Disabled" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed", description: err.message });
    }
  }, [eventRef, toast]);

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

  const handleDownloadAll = async () => {
    if (selectedItems.length === 0 || isProcessing) return;
    
    setIsProcessing(true);
    setProgress("Preparing package...");
    
    try {
      const zip = new JSZip();
      
      for (let i = 0; i < selectedItems.length; i++) {
        const item = selectedItems[i];
        setProgress(`Fetching ${i + 1}/${selectedItems.length}`);
        
        const url = item.masterUrl || item.url;
        if (!url) continue;
        
        const proxyUrl = `/api/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(item.fileName || `photo-${i + 1}.jpg`)}`;
        const res = await fetch(proxyUrl);
        if (!res.ok) continue;
        const blob = await res.blob();
        
        zip.file(item.fileName || `selection-${i + 1}.jpg`, blob);
      }
      
      setProgress("Generating ZIP...");
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `${event?.title || 'selections'}-all-favorites.zip`);
      
      toast({ title: "✅ Download Ready" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Download Failed", description: error.message });
    } finally {
      setIsProcessing(false);
      setProgress("");
    }
  };

  const handleDownloadSelected = async () => {
    if (selectedIds.size === 0 || isProcessing) return;
    
    setIsProcessing(true);
    setProgress("Preparing package...");
    
    try {
      const zip = new JSZip();
      const itemsToDownload = selectedItems.filter((i: any) => selectedIds.has(i.id));
      
      for (let i = 0; i < itemsToDownload.length; i++) {
        const item = itemsToDownload[i];
        setProgress(`Fetching ${i + 1}/${itemsToDownload.length}`);
        
        const url = item.masterUrl || item.url;
        if (!url) continue;
        
        const proxyUrl = `/api/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(item.fileName || `photo-${i + 1}.jpg`)}`;
        const res = await fetch(proxyUrl);
        if (!res.ok) continue;
        const blob = await res.blob();
        
        zip.file(item.fileName || `selection-${i + 1}.jpg`, blob);
      }
      
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `${event?.title || 'selections'}-selected.zip`);
      
      toast({ title: "✅ Download Ready" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Download Failed", description: error.message });
    } finally {
      setIsProcessing(false);
      setProgress("");
    }
  };

  if (authLoading || dataLoading || loadingFavorites) {
    return <HafashLoader text="Preparing Your Selection Workspace..." />;
  }

  if (!event) return null;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
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
              <span className="flex items-center gap-1.5 text-primary"><CheckCircle2 className="w-3 h-3" /> {selectedItems.length} Favorites</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          <Button 
            variant="outline" 
            className="rounded-xl font-bold gap-2 h-12 border-border/50 hover:bg-primary/5 hover:text-primary"
            onClick={handleDownloadAll}
            disabled={selectedItems.length === 0 || isProcessing}
          >
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {isProcessing ? progress : `Download All (${selectedItems.length})`}
          </Button>
        </div>
      </div>

      {/* ✅ ALBUM LINK CARD */}
      <div className="relative overflow-hidden rounded-[2rem] border border-primary/30 bg-gradient-to-br from-primary/10 via-card/60 to-background p-6 lg:p-8 shadow-xl">
        <div className="absolute -top-20 -right-20 w-48 h-48 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        
        <div className="relative space-y-5">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
              <Link2 className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-headline font-bold text-xl text-white flex items-center gap-2">
                Album Designer Link
                {hasLink && (
                  <span className="text-[9px] font-bold uppercase tracking-widest text-green-400 bg-green-500/10 border border-green-500/30 px-2 py-0.5 rounded-md">
                    ✓ Active
                  </span>
                )}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Album designer ko yeh link bhejein — woh sirf <strong className="text-primary">{selectedItems.length} favorites</strong> dekh aur download kar sakta hai.
              </p>
            </div>
          </div>

          {hasLink ? (
            /* ✅ Link exists — show + copy */
            <div className="space-y-3">
              <div className="flex items-center gap-2 bg-background/60 backdrop-blur-md border border-primary/20 rounded-2xl p-3">
                <Link2 className="w-4 h-4 text-primary shrink-0 ml-2" />
                <code className="flex-1 text-xs font-mono text-white/80 truncate">
                  {albumLinkUrl}
                </code>
                <Button
                  size="sm"
                  className="rounded-xl h-10 px-4 gap-2 bg-primary text-primary-foreground hover:bg-primary/90 font-bold shrink-0"
                  onClick={handleCopyLink}
                >
                  {linkCopied ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy
                    </>
                  )}
                </Button>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl gap-2 border-white/10 hover:bg-primary/5 text-xs"
                  onClick={() => window.open(albumLinkUrl, '_blank')}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Preview as Designer
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-xl gap-2 text-destructive hover:bg-destructive/10 text-xs"
                  onClick={handleDisableLink}
                >
                  <X className="w-3.5 h-3.5" />
                  Disable Link
                </Button>
              </div>
            </div>
          ) : (
            /* ❌ No link — generate button */
            <div className="space-y-3">
              <Button
                className="w-full md:w-auto h-14 px-8 rounded-2xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:from-primary/90 hover:to-primary/70 font-bold gap-3 shadow-lg shadow-primary/20"
                onClick={handleGenerateLink}
                disabled={isGenerating || selectedItems.length === 0}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creating Link...
                  </>
                ) : (
                  <>
                    <Share2 className="w-5 h-5" />
                    Create Album Designer Link
                  </>
                )}
              </Button>
              <p className="text-[11px] text-muted-foreground italic">
                💡 Ek click mein secure link ban jayega jo album designer khol sakta hai.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Selection Controls */}
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
          
          {selectedIds.size > 0 && selectedIds.size < selectedItems.length && (
            <Button 
              size="sm"
              className="rounded-lg gap-2 h-8 text-[10px] font-bold bg-primary/10 text-primary hover:bg-primary/20 border border-primary/30"
              onClick={handleDownloadSelected}
              disabled={isProcessing}
            >
              <Download className="w-3 h-3" />
              Download ({selectedIds.size})
            </Button>
          )}
        </div>
        <div className="bg-muted/30 px-3 py-1.5 rounded-lg border border-border/50 flex items-center gap-2">
          <Grid className="w-3 h-3 text-muted-foreground" />
          <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Selection View</span>
        </div>
      </div>

      {/* Favorites Grid */}
      {selectedItems.length === 0 ? (
        <div className="text-center py-40 border-2 border-dashed border-border/20 rounded-[3rem] bg-card/10">
          <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
          <p className="text-muted-foreground italic font-headline text-xl">No favorites selected yet.</p>
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