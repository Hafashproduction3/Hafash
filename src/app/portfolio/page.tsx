"use client";

import { Camera, Phone, Instagram, ArrowRight, Sparkles, X, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useFirestore, useDoc, useCollection } from "@/firebase";
import { doc, collection, query } from "firebase/firestore";
import { useEffect, useState, useMemo } from "react";
import { refreshPhotoUrls } from "@/app/actions/storage"; // 👈 Import kiya

export default function HafashMasterPortfolio() {
  const firestore = useFirestore();
  const [mounted, setMounted] = useState(false);
  const [activeAlbum, setActiveAlbum] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  
  // Albums aur unki refreshed photos ke liye state
  const [albumsWithPhotos, setAlbumsWithPhotos] = useState<any[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(true);

  // Basic Data
  const dataRef = firestore ? doc(firestore, "portfolio_data", "master") : null;
  const { data: basicData } = useDoc(dataRef);

  // Albums Data
  const albumsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, "portfolio_albums"));
  }, [firestore]);
  const { data: albums } = useCollection(albumsQuery);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Jab albums fetch hon, toh unki photos ke fresh URLs layen
  useEffect(() => {
    async function fetchPhotos() {
      if (!albums || albums.length === 0) {
        setLoadingPhotos(false);
        return;
      }

      setLoadingPhotos(true);
      const updatedAlbums = await Promise.all(
        albums.map(async (album: any) => {
          if (!album.photos || album.photos.length === 0) {
            return { ...album, displayUrls: [] };
          }
          
          try {
            const res = await refreshPhotoUrls(album.photos);
            if (res.success) {
              const urls = album.photos.map((key: string) => res.urls[key] || '');
              return { ...album, displayUrls: urls };
            }
          } catch (e) {
            console.error("Failed to refresh", album.name);
          }
          return { ...album, displayUrls: [] };
        })
      );
      
      setAlbumsWithPhotos(updatedAlbums);
      setLoadingPhotos(false);
    }

    fetchPhotos();
  }, [albums]);

  if (!mounted) return null;

  const heroImage = basicData?.heroImage || "https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=2070&auto=format&fit=crop";
  const aboutImage = basicData?.aboutImage || "https://images.unsplash.com/photo-1537633552985-df8429e8048b?q=80&w=1000&auto=format&fit=crop";
  const bioText = basicData?.bioText || "I don't just take pictures; I curate timeless memories...";
  const whatsapp = basicData?.whatsapp || "923001234567";
  const instagram = basicData?.instagram || "https://instagram.com";

  const currentAlbum = albumsWithPhotos.find((a: any) => a.id === activeAlbum);

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-primary selection:text-black overflow-hidden font-sans">
      
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-6 flex justify-between items-center mix-blend-difference">
        <span className="text-2xl font-headline font-bold text-white italic tracking-tighter">Hafash.</span>
        <Link href="/">
          <Button variant="outline" className="rounded-full border-white/30 text-white hover:bg-white hover:text-black font-bold h-10 px-6">
            Back to Platform
          </Button>
        </Link>
      </nav>

      {/* Hero Section */}
      <section className="relative h-screen flex flex-col items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img src={heroImage} alt="Hero" className="w-full h-full object-cover opacity-50 scale-105" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#050505]/40 via-[#050505]/80 to-[#050505]" />
        </div>
        <div className="relative z-10 text-center space-y-8 px-4 mt-20">
          <h1 className="text-7xl md:text-9xl font-headline font-bold tracking-tighter leading-[0.9]">
            Capturing <br /> <span className="text-primary italic font-light">Emotions</span>
          </h1>
          <p className="text-base md:text-xl text-white/50 max-w-lg mx-auto font-light tracking-wide">
            Luxury Wedding, Event & Portrait Photography. Based in Karachi, Available Worldwide.
          </p>
          <div className="pt-10">
            <Link href="#gallery">
              <Button className="h-14 px-10 rounded-full bg-primary text-black hover:bg-primary/90 font-bold text-sm tracking-widest uppercase">
                View Portfolio <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="relative py-32 px-6 max-w-7xl mx-auto border-b border-white/5">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <div className="space-y-8">
            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
              <Camera className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-5xl md:text-7xl font-headline font-bold leading-tight">The Art of <br/> <span className="text-primary italic">Storytelling</span></h2>
            <p className="text-white/60 text-lg leading-relaxed font-light">{bioText}</p>
          </div>
          <div className="relative h-[600px] rounded-3xl overflow-hidden group">
            <img src={aboutImage} alt="About" className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
          </div>
        </div>
      </section>

      {/* Dynamic Portfolio Gallery */}
      <section id="gallery" className="py-32 px-6 max-w-7xl mx-auto space-y-10">
        <div className="text-center space-y-4">
          <h2 className="text-5xl md:text-7xl font-headline font-bold">Selected Works</h2>
          <p className="text-white/50 text-lg font-light">Browse through my recent projects.</p>
        </div>

        {/* Album Tabs */}
        <div className="flex flex-wrap justify-center gap-3">
          <button 
            onClick={() => setActiveAlbum(null)}
            className={`px-6 py-2 rounded-full border transition-all text-sm font-bold uppercase tracking-widest ${!activeAlbum ? 'bg-primary text-black border-primary' : 'border-white/20 text-white hover:bg-white/10'}`}
          >
            All
          </button>
          {albumsWithPhotos.map((album: any) => (
            <button 
              key={album.id}
              onClick={() => setActiveAlbum(album.id)}
              className={`px-6 py-2 rounded-full border transition-all text-sm font-bold uppercase tracking-widest ${activeAlbum === album.id ? 'bg-primary text-black border-primary' : 'border-white/20 text-white hover:bg-white/10'}`}
            >
              {album.name}
            </button>
          ))}
        </div>

        {/* Photos Grid */}
        <div className="pt-8">
          {loadingPhotos ? (
             <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>
          ) : activeAlbum ? (
            // Agar koi album select kiya hai
            <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
              {currentAlbum?.displayUrls?.map((img: string, i: number) => (
                img && (
                  <div key={i} onClick={() => setLightboxImage(img)} className="relative rounded-2xl overflow-hidden group break-inside-avoid border border-white/10 cursor-pointer">
                    <img src={img} alt="Portfolio" className="w-full h-auto object-cover transition-transform duration-1000 group-hover:scale-110" />
                  </div>
                )
              ))}
            </div>
          ) : (
            // Agar "All" selected hai
            <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
              {albumsWithPhotos.map((album: any) => 
                album.displayUrls?.slice(0, 2).map((img: string, i: number) => (
                  img && (
                    <div key={`${album.id}-${i}`} onClick={() => setLightboxImage(img)} className="relative rounded-2xl overflow-hidden group break-inside-avoid border border-white/10 cursor-pointer">
                      <img src={img} alt="Portfolio" className="w-full h-auto object-cover transition-transform duration-1000 group-hover:scale-110" />
                      <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest text-primary border border-primary/30">
                        {album.name}
                      </div>
                    </div>
                  )
                ))
              )}
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-32 px-6 overflow-hidden border-t border-white/5 bg-gradient-to-b from-[#050505] to-[#111]">
        <div className="relative max-w-4xl mx-auto text-center space-y-10">
          <Sparkles className="w-12 h-12 text-primary mx-auto mb-6" />
          <h2 className="text-5xl md:text-7xl font-headline font-bold">Let's Create <br/> <span className="text-primary italic">Magic</span> Together</h2>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-8">
            <Link href={`https://wa.me/${whatsapp}`} target="_blank" className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto h-16 px-12 rounded-full bg-primary text-black hover:bg-primary/90 font-bold text-lg">
                <Phone className="w-5 h-5 mr-3" /> Book via WhatsApp
              </Button>
            </Link>
            <Link href={instagram} target="_blank" className="w-full sm:w-auto">
              <Button variant="outline" className="w-full sm:w-auto h-16 px-12 rounded-full border-white/20 text-white hover:bg-white hover:text-black font-bold text-lg">
                <Instagram className="w-5 h-5 mr-3" /> Follow on Instagram
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setLightboxImage(null)}>
          <button className="absolute top-6 right-6 text-white/50 hover:text-white bg-white/10 p-3 rounded-full">
            <X className="w-6 h-6" />
          </button>
          <img src={lightboxImage} alt="Fullscreen" className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      <footer className="py-12 text-center text-white/30 text-xs uppercase tracking-widest font-bold">
        <p>© 2026 Hafash Production. All rights reserved.</p>
      </footer>
    </div>
  );
}