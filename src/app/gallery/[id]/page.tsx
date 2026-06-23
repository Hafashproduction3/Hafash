
"use client";

import { useFirestore } from '@/firebase';
import { useParams } from 'next/navigation';
import { Heart, Download, Share2, ArrowLeft, Camera, ShieldAlert, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import Link from 'next/link';

export default function ClientGalleryPage() {
  const params = useParams();
  const galleryParam = params?.id as string;
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [gallery, setGallery] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    async function fetchGallery() {
      if (!firestore || !galleryParam) return;
      
      setLoading(true);
      try {
        // 1. Try fetching by Document ID directly (most efficient)
        const docRef = doc(firestore, 'galleries', galleryParam);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setGallery({ ...docSnap.data(), id: docSnap.id });
        } else {
          // 2. Fallback: Search by Slug field
          const q = query(collection(firestore, 'galleries'), where('slug', '==', galleryParam));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            const result = querySnapshot.docs[0];
            setGallery({ ...result.data(), id: result.id });
          } else {
            setGallery(null);
          }
        }
      } catch (error) {
        console.error("Error fetching gallery:", error);
        setGallery(null);
      } finally {
        setLoading(false);
      }
    }
    fetchGallery();
  }, [firestore, galleryParam]);

  const handleFavorite = async (itemId: string, isCurrentlyFavorite: boolean) => {
    if (!firestore || !gallery) return;
    
    try {
      const galleryRef = doc(firestore, 'galleries', gallery.id);
      const updatedItems = gallery.items.map((item: any) => 
        item.id === itemId ? { ...item, isFavorite: !isCurrentlyFavorite } : item
      );
      
      await updateDoc(galleryRef, { items: updatedItems });
      setGallery({ ...gallery, items: updatedItems });
      
      toast({
        title: "Preference Updated",
        description: isCurrentlyFavorite ? "Removed from favorites." : "Added to favorites.",
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not update favorite status.",
      });
    }
  };

  const handleDownload = (url: string) => {
    if (gallery?.isLocked) {
      toast({
        variant: "destructive",
        title: "Downloads Locked",
        description: "Contact the photographer to unlock this gallery.",
      });
      return;
    }
    const link = document.createElement('a');
    link.href = url;
    link.download = `hafash-${gallery?.title || 'photo'}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading your memories...</p>
      </div>
    );
  }

  if (!gallery) return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
      <div className="p-6 rounded-full bg-destructive/10 mb-6">
        <ShieldAlert className="w-12 h-12 text-destructive" />
      </div>
      <h1 className="text-3xl font-headline font-bold mb-4">Gallery Not Found</h1>
      <p className="text-muted-foreground max-w-md mb-8">This gallery may have been removed or the link is incorrect. Please check with your photographer.</p>
      <Link href="/"><Button className="rounded-full px-8">Back to Home</Button></Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Gallery Header */}
      <div className="h-[60vh] relative overflow-hidden">
        <img 
          src={gallery.coverImage} 
          alt={gallery.title} 
          className="w-full h-full object-cover scale-105 filter blur-[2px]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
          <div className="mb-6 p-4 rounded-full border border-primary/50 bg-background/30 backdrop-blur-md">
            <Camera className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-4xl md:text-7xl font-headline font-bold mb-4 tracking-tight uppercase tracking-[0.2em]">{gallery.title}</h1>
          <p className="text-lg md:text-2xl font-body italic text-primary">{gallery.clientName}</p>
          <div className="mt-8 flex gap-4">
             <div className="px-6 py-2 rounded-full border border-border/50 bg-background/50 text-sm font-medium">
                {gallery.date}
             </div>
             <div className="px-6 py-2 rounded-full border border-border/50 bg-background/50 text-sm font-medium">
                {gallery.category}
             </div>
          </div>
        </div>
      </div>

      {/* Warning if Locked */}
      {gallery.isLocked && (
        <div className="max-w-4xl mx-auto mt-[-40px] relative z-10 px-6">
          <div className="bg-destructive/10 border border-destructive/30 rounded-2xl p-6 flex flex-col md:flex-row items-center gap-6 backdrop-blur-md">
            <div className="p-4 bg-destructive/20 rounded-full">
              <ShieldAlert className="w-8 h-8 text-destructive" />
            </div>
            <div className="text-center md:text-left">
              <h3 className="text-xl font-headline font-bold text-destructive">Downloads Currently Locked</h3>
              <p className="text-muted-foreground">Previews are watermarked. Original files will be available once unlocked.</p>
            </div>
            <Button className="md:ml-auto bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-full px-8">Contact Photographer</Button>
          </div>
        </div>
      )}

      {/* Image Grid */}
      <div className="max-w-7xl mx-auto px-6 pt-20">
        {gallery.items?.length === 0 ? (
          <div className="text-center py-20 bg-card/30 rounded-3xl border border-dashed border-border/50">
            <p className="text-muted-foreground italic">Your photographer is currently preparing this gallery.</p>
          </div>
        ) : (
          <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
            {gallery.items?.map((item: any) => (
              <div key={item.id} className="relative group break-inside-avoid overflow-hidden rounded-2xl border border-border/30 bg-card/50 shadow-xl cursor-zoom-in" onClick={() => setSelectedImage(item.url)}>
                <div className="relative overflow-hidden">
                  <img 
                    src={item.url} 
                    alt="Gallery Item" 
                    className="w-full h-auto object-cover transform transition-transform duration-700 group-hover:scale-110"
                  />
                  
                  {/* Watermark Logic */}
                  {gallery.isLocked && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
                      <div className="watermark-text text-xl">Hafash - Pay to Remove</div>
                    </div>
                  )}

                  {/* Overlays */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="absolute top-4 right-4 flex gap-2">
                      <Button 
                        size="icon" 
                        variant="secondary" 
                        className={`rounded-full bg-white/20 backdrop-blur-md hover:bg-primary hover:text-primary-foreground ${item.isFavorite ? 'bg-primary text-primary-foreground' : ''}`}
                        onClick={(e) => { e.stopPropagation(); handleFavorite(item.id, item.isFavorite); }}
                      >
                        <Heart className={`w-5 h-5 ${item.isFavorite ? 'fill-current' : ''}`} />
                      </Button>
                    </div>
                    <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center">
                      <Button 
                        size="sm" 
                        variant="secondary" 
                        className="rounded-full bg-white/20 backdrop-blur-md hover:bg-white text-white hover:text-black gap-2"
                        onClick={(e) => { e.stopPropagation(); handleDownload(item.url); }}
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </Button>
                      <Button size="icon" variant="ghost" className="rounded-full text-white" onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(window.location.href);
                        toast({ title: "Link Copied", description: "Gallery URL copied to clipboard." });
                      }}>
                        <Share2 className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Fullscreen Preview Modal */}
      {selectedImage && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <Button variant="ghost" className="absolute top-8 right-8 text-white rounded-full h-12 w-12 hover:bg-white/10" onClick={() => setSelectedImage(null)}>
            <ArrowLeft className="w-8 h-8" />
          </Button>
          <img src={selectedImage} alt="Fullscreen" className="max-w-full max-h-[90vh] object-contain shadow-2xl" />
          {gallery.isLocked && (
            <div className="absolute bottom-12 left-0 right-0 text-center">
               <span className="bg-primary/20 text-primary border border-primary/50 px-6 py-2 rounded-full font-headline italic">Hafash - Pay to Remove Watermark</span>
            </div>
          )}
        </div>
      )}

      {/* Mobile Sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 lg:hidden p-4 bg-background/80 backdrop-blur-md border-t border-border/50 flex justify-around">
          <Button variant="ghost" className="flex flex-col gap-1 h-auto py-2 text-xs">
            <Heart className="w-6 h-6" />
            Favorites
          </Button>
          <Button variant="ghost" className="flex flex-col gap-1 h-auto py-2 text-xs" onClick={() => {
             navigator.clipboard.writeText(window.location.href);
             toast({ title: "Link Copied" });
          }}>
            <Share2 className="w-6 h-6" />
            Share
          </Button>
          <Button variant="ghost" className="flex flex-col gap-1 h-auto py-2 text-xs" onClick={() => handleDownload('dummy')}>
            <Download className="w-6 h-6" />
            Download
          </Button>
      </div>
    </div>
  );
}
