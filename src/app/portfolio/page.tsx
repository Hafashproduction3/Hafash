"use client";

import {
  Phone,
  Camera,
  Play,
  Aperture,
  ArrowRight,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Video,
  Grid,
  X,
} from "lucide-react";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useFirestore, useDoc, useCollection } from "@/firebase";
import { doc, collection, query } from "firebase/firestore";
import { useEffect, useState, useMemo, useCallback } from "react";
import { refreshPhotoUrls } from "@/app/actions/storage";

export default function HafashMasterPortfolio() {
  const firestore = useFirestore();

  const [mounted, setMounted] = useState(false);
  const [hasEntered, setHasEntered] = useState(false);

  const [activeAlbum, setActiveAlbum] = useState<string | null>(null);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [mediaFilter, setMediaFilter] = useState<'all' | 'photos' | 'videos'>('all');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const [albumsWithPhotos, setAlbumsWithPhotos] = useState<any[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(true);
  
  // ✅ Album ki photos alag se save karenge
  const [albumPhotos, setAlbumPhotos] = useState<any[]>([]);
  const [loadingAlbumPhotos, setLoadingAlbumPhotos] = useState(false);

  const dataRef = useMemo(() => firestore ? doc(firestore, "portfolio_data", "master") : null, [firestore]);
  const { data: basicData } = useDoc(dataRef);

  const albumsQuery = useMemo(() => firestore ? query(collection(firestore, "portfolio_albums")) : null, [firestore]);
  const { data: albums } = useCollection(albumsQuery);

  useEffect(() => {
    setMounted(true);
  }, []);

  // ✅ STEP 1: Sirf albums ke cover load karo (Bijli ki speed)
  useEffect(() => {
    let cancelled = false;
    async function fetchAlbums() {
      if (!albums) return;
      if (albums.length === 0) {
        setAlbumsWithPhotos([]);
        setLoadingPhotos(false);
        return;
      }
      setLoadingPhotos(true);
      
      try {
        const updatedAlbums = await Promise.all(
          albums.map(async (album: any) => {
            const photoItems = Array.isArray(album.photos) ? album.photos : [];
            if (photoItems.length === 0) return { ...album, displayItems: [] };

            // Sirf pehli photo (cover) ka link mangwayo
            const firstPhoto = photoItems[0];
            const key = typeof firstPhoto === "string" ? firstPhoto : firstPhoto.key || '';
            
            if (!key) return { ...album, displayItems: [] };

            try {
              const res = await refreshPhotoUrls([key]);
              if (res?.success && res?.urls) {
                const url = res.urls[key] || '';
                if (url && url.startsWith("http")) {
                  return { 
                    ...album, 
                    displayItems: [{ key, url, thumbUrl: url, caption: 'Cover' }] 
                  };
                }
              }
            } catch (error) {
              console.error(error);
            }
            return { ...album, displayItems: [] };
          })
        );

        if (cancelled) return;
        setAlbumsWithPhotos(updatedAlbums);
      } catch (error) {
        console.error(error);
      } finally {
        if (!cancelled) setLoadingPhotos(false);
      }
    }
    fetchAlbums();
    return () => { cancelled = true; };
  }, [albums]);

  // ✅ STEP 2: Jab album khule, tab uski saari photos load karo
  useEffect(() => {
    if (!activeAlbum) {
      setAlbumPhotos([]);
      return;
    }

    const currentAlbum = albumsWithPhotos.find((a: any) => a.id === activeAlbum);
    if (!currentAlbum) return;

    // Agar pehle se photos load hain (cache) toh wapas mat load karo
    if (albumPhotos.length > 1 && albumPhotos[0]?.albumId === activeAlbum) return;

    let cancelled = false;
    async function loadAlbumPhotos() {
      setLoadingAlbumPhotos(true);
      try {
        const photoItems = Array.isArray(currentAlbum.photos) ? currentAlbum.photos : [];
        const keys = photoItems.map((p: any) => typeof p === "string" ? p : p.key || '');
        const validKeys = keys.filter((k: string) => k.length > 0);
        
        const res = await refreshPhotoUrls(validKeys);
        if (res?.success && res?.urls) {
          const displayItems = photoItems.map((p: any, idx: number) => {
            const key = typeof p === "string" ? p : p.key || '';
            const thumbKey = typeof p === "string" ? null : (p.thumbKey || null);
            const caption = typeof p === "string" ? 'General' : (p.caption || 'General');
            
            return { 
              key, 
              albumId: activeAlbum,
              index: idx,
              url: res.urls[key] || '', 
              thumbUrl: thumbKey ? (res.urls[thumbKey] || res.urls[key]) : res.urls[key], 
              caption 
            };
          }).filter((item: any) => item.url && item.url.startsWith("http"));
          
          if (!cancelled) setAlbumPhotos(displayItems);
        }
      } catch (error) {
        console.error(error);
      } finally {
        if (!cancelled) setLoadingAlbumPhotos(false);
      }
    }

    loadAlbumPhotos();
    return () => { cancelled = true; };
  }, [activeAlbum, albumsWithPhotos]);

  const heroImage = basicData?.heroImage || "https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=2070";
  const aboutImage = basicData?.aboutImage || "https://images.unsplash.com/photo-1537633552985-df8429e8048b?q=80&w=1000";
  const bioText = basicData?.bioText || "I don't just take pictures; I curate timeless memories.";
  const whatsapp = basicData?.whatsapp || "923001234567";
  
  const yearsExperience = basicData?.yearsExperience || "5+";
  const totalWeddings = basicData?.totalWeddings || "200+";
  const projectsCompleted = basicData?.happyClients || "100%";

  const currentAlbum = albumsWithPhotos.find((a: any) => a.id === activeAlbum);
  
  const isVideo = useCallback((url: string) => {
    if (!url) return false;
    return /\.(mp4|webm|ogg|mov|m4v)$/i.test(url.split("?")[0].split("#")[0]);
  }, []);

  // ✅ Ab visiblePhotos albumPhotos state se aayengi
  const visiblePhotos = useMemo(() => {
    if (!activeAlbum) return [];
    
    let items = albumPhotos;
    if (activeGroup) items = items.filter((i: any) => i.caption === activeGroup);
    
    // ✅ Ab grid ke liye bhi original url use hoga (taake lightbox mein sahi photo aaye)
    return items.map((i: any) => i.url).filter((url: string) => {
      if (!url || !url.startsWith("http")) return false;
      if (mediaFilter === 'videos') return isVideo(url);
      if (mediaFilter === 'photos') return !isVideo(url);
      return true;
    });
  }, [activeAlbum, activeGroup, albumPhotos, mediaFilter, isVideo]);

  const currentGroups = useMemo((): string[] => {
    if (!albumPhotos) return [];
    const groups: string[] = albumPhotos.map((i: any) => String(i.caption));
    return Array.from(new Set(groups)).filter((g: string) => g !== 'General' && g !== 'All'); 
  }, [albumPhotos]);

  const phoneNumber = String(whatsapp).replace(/\D/g, "");
  const whatsappNumber = phoneNumber.startsWith("0") ? `92${phoneNumber.slice(1)}` : phoneNumber;

    // ✅ Back button ke liye history push karo
    const openLightbox = (index: number) => {
      setLightboxIndex(index);
      if (typeof window !== 'undefined') {
        window.history.pushState({ lightbox: true }, '');
      }
    };
  
    const closeLightbox = useCallback(() => {
      setLightboxIndex(null);
    }, []);
  
    const showPrevious = useCallback(() => { 
      setLightboxIndex((c) => (c === null || visiblePhotos.length === 0 ? c : (c - 1 + visiblePhotos.length) % visiblePhotos.length)); 
    }, [visiblePhotos.length]);
    
    const showNext = useCallback(() => { 
      setLightboxIndex((c) => (c === null || visiblePhotos.length === 0 ? c : (c + 1) % visiblePhotos.length)); 
    }, [visiblePhotos.length]);
    
    const selectedImage = lightboxIndex !== null ? visiblePhotos[lightboxIndex] : null;
  
    // ✅ Back button se step-by-step navigate karo
    useEffect(() => {
      if (typeof window === 'undefined') return;
  
      const handlePopState = () => {
        // 1. Agar photo khuli hai toh band karo (album mein wapas)
        if (lightboxIndex !== null) {
          setLightboxIndex(null);
          return;
        }
  
        // 2. Agar album khula hai toh band karo (home par wapas)
        if (activeAlbum !== null) {
          setActiveAlbum(null);
          setActiveGroup(null);
          return;
        }
  
        // 3. Portfolio home par hai, toh bahar mat jane do
        window.history.pushState({ step: 'home' }, '');
      };
  
      window.addEventListener('popstate', handlePopState);
      
      // Shuru mein hi ek history step push karo
      window.history.pushState({ step: 'home' }, '');
  
      return () => window.removeEventListener('popstate', handlePopState);
    }, [lightboxIndex, activeAlbum]);

  useEffect(() => {
    if (lightboxIndex === null) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setLightboxIndex(null); // ✅ Sirf band karein, history change na karein
      }
      if (event.key === "ArrowLeft") showPrevious();
      if (event.key === "ArrowRight") showNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [lightboxIndex, showPrevious, showNext]);

  if (!mounted) return null;

  if (!hasEntered) {
    return (
      <main className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden bg-black text-white">
        <style jsx global>{`
          @keyframes hafashZoom { 0% { transform: scale(1.04); } 100% { transform: scale(1.16); } }
          @keyframes hafashReveal { 0% { opacity: 0; transform: translateY(28px); } 100% { opacity: 1; transform: translateY(0); } }
          @keyframes glowPulse { 0%, 100% { filter: drop-shadow(0 0 20px rgba(212,175,55,0.3)); } 50% { filter: drop-shadow(0 0 40px rgba(212,175,55,0.6)); } }
          .hafash-reveal { animation: hafashReveal 1.2s ease-out both; }
          .hafash-reveal-delay { animation: hafashReveal 1.4s .25s ease-out both; }
          .hafash-reveal-button { animation: hafashReveal 1.5s .5s ease-out both; }
          .hafash-logo-glow { animation: glowPulse 4s ease-in-out infinite; }
        `}</style>

        <div className="absolute inset-0">
          <img src={heroImage} alt="Hafash cinematic photography" className="h-full w-full object-cover opacity-45" style={{ animation: "hafashZoom 35s ease-in-out infinite alternate" }} />
          <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/40 to-black" />
          <div className="absolute inset-0 bg-black/20" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.8)_100%)]" />
        </div>

        <div className="pointer-events-none absolute inset-5 border border-white/15 md:inset-10" />

        <div className="relative z-10 mx-auto w-full max-w-5xl px-6 text-center flex flex-col items-center">
          
          <div className="hafash-reveal mb-8 flex justify-center">
             <img src="/hafash-logo.png" alt="Hafash Production" className="h-32 md:h-48 w-auto object-contain hafash-logo-glow transition-transform duration-700 hover:scale-105" />
          </div>

          <h1 className="hafash-reveal font-headline text-4xl md:text-7xl font-bold tracking-[0.2em] text-white">HAFASH</h1>

          <div className="hafash-reveal-delay mt-3 text-sm font-light uppercase tracking-[0.6em] text-primary md:text-xl">Production</div>

          <div className="mx-auto my-8 h-px w-24 bg-primary/50" />

          <p className="hafash-reveal-delay text-xs font-light uppercase tracking-[0.3em] text-white/60">Luxury Photography · Timeless Memories</p>

          <div className="hafash-reveal-button mt-14 flex flex-col items-center gap-6">
            <Button
              onClick={() => setHasEntered(true)}
              className="group h-14 rounded-full border border-primary/80 bg-transparent px-10 text-xs font-bold uppercase tracking-[0.25em] text-primary transition-all duration-500 hover:bg-primary hover:text-black md:h-16 md:px-12"
            >
              Enter The Gallery
              <ArrowRight className="ml-4 h-4 w-4 transition-transform duration-500 group-hover:translate-x-2" />
            </Button>
          </div>
        </div>

        <div className="absolute bottom-10 left-0 right-0 text-center text-[9px] uppercase tracking-[0.45em] text-white/30">A Story Worth Remembering</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#0f1115] relative pb-20 font-sans text-white selection:bg-primary selection:text-black">
      
      <div className="fixed inset-0 pointer-events-none z-0 bg-[#0f1115]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-[#0f1115] to-[#0f1115]" />
        <img src="https://i.postimg.cc/4yyH6jMt/Whats-App-Image-2026-11-07-at-2-30-38-AM.jpg" alt="Nikon Camera Setup" className="w-full h-full object-cover opacity-90 relative z-0" />
        <div className="absolute top-1/2 right-10 -translate-y-1/2 z-10 opacity-[0.1]">
          <img src="/hafash-logo.png" alt="Hafash Watermark" className="w-[300px] md:w-[500px] h-auto object-contain brightness-0" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-[#0f1115] via-[#0f1115]/80 to-transparent z-20" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f1115] via-transparent to-[#0f1115]/60 z-20" />
      </div>

      <style jsx global>{`
        @keyframes portfolioFade { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .portfolio-fade { animation: portfolioFade .9s ease-out both; }
        .cinematic-scrollbar::-webkit-scrollbar { height: 4px; }
        .cinematic-scrollbar::-webkit-scrollbar-track { background: #151515; }
        .cinematic-scrollbar::-webkit-scrollbar-thumb { background: rgba(212,175,55,.6); border-radius: 20px; }
        .portfolio-image { transition: transform 1s cubic-bezier(.2,.7,.2,1); }
        .portfolio-card:hover .portfolio-image { transform: scale(1.06); }
        html { scroll-behavior: smooth; scroll-padding-top: 100px; }
      `}</style>

      <div className="relative z-10">
        
        <nav className="fixed left-0 right-0 top-0 z-50 px-5 py-6 md:px-10 border-b border-white/5 bg-[#0f1115]/50 backdrop-blur-md">
          <div className="mx-auto flex max-w-[1600px] items-center justify-between">
            <button onClick={() => { setActiveAlbum(null); setActiveGroup(null); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="flex items-center gap-3">
              <img src="/hafash-logo.png" alt="Hafash Logo" className="h-10 w-10 md:h-12 md:w-12 object-contain" />
              <div className="text-left">
                <p className="font-headline text-lg md:text-xl font-bold tracking-wider">HAFASH<span className="text-primary">.</span></p>
                <p className="text-[8px] md:text-[9px] uppercase tracking-[0.3em] text-white/40">Production</p>
              </div>
            </button>
            
            <div className="hidden md:flex items-center gap-8 text-[11px] font-bold uppercase tracking-widest text-white/60">
              <Link href="#home" className="hover:text-primary transition-colors">Home</Link>
              <Link href="#gallery" className="hover:text-primary transition-colors">Portfolio</Link>
              <Link href="#about" className="hover:text-primary transition-colors">About</Link>
              <Link href="#contact" className="hover:text-primary transition-colors">Contact</Link>
            </div>
          </div>
        </nav>

        {!activeAlbum && (
          <section className="relative mx-auto max-w-[1600px] px-5 pb-20 pt-40 md:px-10 md:pb-28 md:pt-48" id="home">
            <div className="grid items-center gap-16 lg:grid-cols-2 lg:gap-24">
              
              <div className="order-2 flex justify-center lg:order-1 relative">
                <div className="relative w-full max-w-[420px]">
                  <div className="absolute -inset-4 rounded-t-[220px] rounded-b-xl border border-primary/20" />
                  <div className="absolute -inset-8 rounded-t-[240px] rounded-b-2xl border border-white/5" />
                  
                  <div className="relative aspect-[3/4] overflow-hidden rounded-t-[200px] rounded-b-lg border-[3px] border-primary/60 bg-[#111] shadow-[0_20px_80px_rgba(212,175,55,0.15)] group p-2">
                    <div className="relative w-full h-full overflow-hidden rounded-t-[190px] rounded-b-md">
                      <img src={aboutImage} alt="Hafash Production" className="h-full w-full object-cover transition-transform duration-[3s] group-hover:scale-110" loading="eager" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />
                    </div>
                  </div>

                  <div className="absolute -bottom-8 -right-8 flex h-24 w-24 items-center justify-center rounded-full border border-primary/40 bg-[#0a0a0a] shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-10">
                    <Aperture className="h-10 w-10 text-primary animate-[spin_15s_linear_infinite]" strokeWidth={1} />
                  </div>
                </div>
              </div>

              <div className="order-1 space-y-8 text-center lg:order-2 lg:text-left relative">
                <div className="inline-flex items-center gap-4 text-[10px] font-bold uppercase tracking-[0.4em] text-primary">
                  <span className="h-px w-10 bg-primary" />
                  Welcome To Hafash Production
                </div>

                <h1 className="font-headline text-5xl sm:text-6xl font-bold leading-[1.1] tracking-tight md:text-7xl lg:text-[5.5rem]">
                  Hello,<br />I'm <span className="font-light italic text-primary">Hamza Khan</span>
                </h1>

                <p className="mx-auto max-w-xl text-lg font-light leading-relaxed text-white/60 md:text-xl lg:mx-0">{bioText}</p>

                <div className="mx-auto h-px w-full max-w-sm bg-gradient-to-r from-primary/50 via-white/10 to-transparent lg:mx-0" />

                <div className="grid grid-cols-3 gap-4 py-4 max-w-lg mx-auto lg:mx-0">
                  <div className="flex flex-col items-center lg:items-start p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-sm transition-colors hover:bg-white/[0.05]">
                    <Camera className="w-4 h-4 text-primary mb-2" />
                    <p className="font-headline text-2xl sm:text-3xl font-bold text-white">{yearsExperience}</p>
                    <p className="mt-1 text-[8px] font-bold uppercase tracking-[0.15em] text-white/50">Years of Exp</p>
                  </div>
                  <div className="flex flex-col items-center lg:items-start p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-sm transition-colors hover:bg-white/[0.05]">
                    <ImageIcon className="w-4 h-4 text-primary mb-2" />
                    <p className="font-headline text-2xl sm:text-3xl font-bold text-white">{totalWeddings}</p>
                    <p className="mt-1 text-[8px] font-bold uppercase tracking-[0.15em] text-white/50">Weddings</p>
                  </div>
                  <div className="flex flex-col items-center lg:items-start p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-sm transition-colors hover:bg-white/[0.05]">
                    <Aperture className="w-4 h-4 text-primary mb-2" />
                    <p className="font-headline text-2xl sm:text-3xl font-bold text-white">{projectsCompleted}</p>
                    <p className="mt-1 text-[8px] font-bold uppercase tracking-[0.15em] text-white/50">Projects</p>
                  </div>
                </div>

                <div className="flex flex-col justify-center gap-4 pt-4 sm:flex-row lg:justify-start">
                  <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noopener noreferrer">
                    <Button className="group h-14 w-full sm:w-auto rounded-full bg-primary px-8 font-bold text-black shadow-[0_0_30px_rgba(212,175,55,0.2)] transition-all duration-300 hover:scale-105 hover:bg-primary/90">
                      <Phone className="mr-2 h-4 w-4 transition-transform group-hover:-rotate-12" /> Book Your Shoot
                    </Button>
                  </a>
                </div>
              </div>
            </div>
          </section>
        )}

        {!activeAlbum && (
          <section className="border-t border-white/5 py-16 md:py-24" id="gallery">
            <div className="mx-auto max-w-[1600px] px-5 md:px-10">
              <div className="mb-10 flex items-end justify-between">
                <div>
                  <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.4em] text-primary">Explore Our Work</p>
                  <h2 className="font-headline text-4xl font-bold md:text-5xl">Collections<span className="text-primary">.</span></h2>
                </div>
              </div>

              {loadingPhotos ? (
                 <div className="flex gap-6 overflow-hidden pb-6">
                   {Array.from({ length: 3 }).map((_, i) => (
                     <div key={i} className="animate-pulse h-72 w-56 md:h-80 md:w-64 bg-white/[0.06] rounded-xl shrink-0" />
                   ))}
                 </div>
              ) : (
                <div className="cinematic-scrollbar flex snap-x gap-6 overflow-x-auto pb-6">
                  {albumsWithPhotos.map((album: any, index: number) => (
                    <button 
                      key={album.id || index} 
                      onClick={() => { 
                        setActiveAlbum(album.id); 
                        setActiveGroup(null); 
                        setMediaFilter('all'); 
                        window.scrollTo({ top: 0, behavior: 'smooth' }); 
                        if (typeof window !== 'undefined') {
                          window.history.pushState({ album: true }, '');
                        }
                      }} 
                      className="group relative h-72 w-56 shrink-0 snap-start overflow-hidden rounded-xl text-left md:h-80 md:w-64 border border-white/10 hover:border-primary/50 transition-colors"
                    >
                      {album.displayItems?.[0]?.url ? (
                        <img src={album.displayItems[0].url} alt={album.name || "Collection"} className="portfolio-image h-full w-full object-cover opacity-80" loading="lazy" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-[#171717]"><Camera className="h-12 w-12 text-primary/40" /></div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                      <div className="absolute bottom-6 left-5 right-5">
                        <p className="font-headline text-2xl font-bold capitalize">{album.name || "Collection"}</p>
                        <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-primary">{album.photos?.length || 0} Media</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {activeAlbum && (
          <section className="mx-auto max-w-[1600px] px-5 py-20 md:px-10 md:py-28">
            <div className="animate-in fade-in duration-1000">
              <div className="relative mb-10 text-center">
                <button 
                  onClick={() => { 
                    setActiveAlbum(null); 
                    setActiveGroup(null); 
                    window.scrollTo({ top: 0, behavior: 'smooth' }); 
                    if (typeof window !== 'undefined') {
                      window.history.back();
                    }
                  }} 
                  className="mb-8 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-primary transition hover:text-white border border-primary/30 px-6 py-3 rounded-full hover:bg-primary/10"
                >
                  <ArrowLeft className="h-4 w-4" /> Back To All Collections
                </button>
                <h1 className="font-headline text-5xl md:text-8xl font-bold text-white capitalize mb-4">{currentAlbum?.name}</h1>
                <p className="text-white/50 tracking-widest uppercase text-sm">
                  {loadingAlbumPhotos ? "Loading..." : `${visiblePhotos.length} Masterpieces`}
                </p>
              </div>

              {currentGroups.length > 0 && (
                <div className="flex justify-center gap-6 md:gap-8 overflow-x-auto pb-8 pt-4 custom-scrollbar">
                  <button onClick={() => setActiveGroup(null)} className="flex flex-col items-center gap-3 shrink-0 group">
                    <div className={`p-[3px] rounded-full transition-all duration-300 ${!activeGroup ? 'bg-gradient-to-tr from-primary via-yellow-200 to-primary scale-105 shadow-[0_0_20px_rgba(212,175,55,0.3)]' : 'bg-white/10 group-hover:bg-white/20'}`}>
                       <div className="w-20 h-20 md:w-24 md:h-24 rounded-full border-[3px] border-[#0f1115] overflow-hidden bg-[#111] flex items-center justify-center"><ImageIcon className={`w-8 h-8 ${!activeGroup ? 'text-primary' : 'text-white/50'}`} /></div>
                    </div>
                    <span className={`text-xs md:text-sm font-headline font-bold ${!activeGroup ? 'text-primary' : 'text-white/60'}`}>All Work</span>
                  </button>

                  {currentGroups.map((group: string, i: number) => {
                    const firstPhoto = albumPhotos.find((item:any) => item.caption === group && item.thumbUrl);
                    return (
                      <button key={i} onClick={() => setActiveGroup(group)} className="flex flex-col items-center gap-3 shrink-0 group">
                        <div className={`p-[3px] rounded-full transition-all duration-300 ${activeGroup === group ? 'bg-gradient-to-tr from-primary via-yellow-200 to-primary scale-105 shadow-[0_0_20px_rgba(212,175,55,0.3)]' : 'bg-white/10 group-hover:bg-white/20'}`}>
                           <div className="w-20 h-20 md:w-24 md:h-24 rounded-full border-[3px] border-[#0f1115] overflow-hidden bg-[#111] relative">
                             {firstPhoto?.thumbUrl ? <img src={firstPhoto.thumbUrl} alt={String(group)} className="w-full h-full object-cover" /> : <span className="text-xs text-white/50 absolute inset-0 flex items-center justify-center">No Img</span>}
                             {activeGroup !== group && <div className="absolute inset-0 bg-black/30 transition-colors" />}
                           </div>
                        </div>
                        <span className={`text-xs md:text-sm font-headline font-bold capitalize ${activeGroup === group ? 'text-primary' : 'text-white/60'}`}>{String(group)}</span>
                      </button>
                    )
                  })}
                </div>
              )}

              <div className="flex justify-center gap-2 mb-10 border-b border-white/10 pb-4">
                <button onClick={() => setMediaFilter('all')} className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-full flex items-center gap-2 transition-colors ${mediaFilter === 'all' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'}`}><Grid className="w-4 h-4" /> All</button>
                <button onClick={() => setMediaFilter('photos')} className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-full flex items-center gap-2 transition-colors ${mediaFilter === 'photos' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'}`}><ImageIcon className="w-4 h-4" /> Photos</button>
                <button onClick={() => setMediaFilter('videos')} className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-full flex items-center gap-2 transition-colors ${mediaFilter === 'videos' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'}`}><Video className="w-4 h-4" /> Videos</button>
              </div>

              {loadingAlbumPhotos ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="animate-pulse aspect-square rounded-lg bg-white/[0.06]" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4">
                  {visiblePhotos.map((media: string, index: number) => (
                    media && (
                      <button 
                        key={`${media}-${index}`} 
                        onClick={() => openLightbox(index)} 
                        className="group relative block w-full aspect-square overflow-hidden rounded-lg bg-[#141414] text-left"
                      >
                        {isVideo(media) ? (
                          <div className="relative w-full h-full">
                            <video src={media} className="h-full w-full object-cover" muted playsInline preload="metadata" />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/50 bg-black/40 backdrop-blur">
                                <Play className="ml-1 h-4 w-4 fill-white text-white" />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <img 
                            src={media} 
                            alt="Portfolio" 
                            onError={(e) => { 
                              e.currentTarget.parentElement!.style.display = 'none'; 
                            }}
                            className="block h-full w-full object-cover transition-transform duration-1000 group-hover:scale-105" 
                            loading="lazy" 
                          />
                        )}
                      </button>
                    )
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        <section id="about" className="relative z-10 border-t border-white/5 py-24 px-5 md:px-10 bg-[#0a0a0a]/80 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <h2 className="font-headline text-4xl md:text-6xl font-bold text-white">About <span className="text-primary italic">Me</span></h2>
            <p className="text-lg md:text-xl text-white/60 leading-relaxed max-w-2xl mx-auto">
              I am a passionate photographer dedicated to capturing the beauty of your special moments. With years of experience in wedding and event photography, I turn fleeting moments into timeless memories.
            </p>
          </div>
        </section>

        <section id="contact" className="relative z-10 border-t border-white/5 py-24 px-5 md:px-10 bg-[#0a0a0a]/80 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <h2 className="font-headline text-4xl md:text-6xl font-bold text-white">Get In <span className="text-primary italic">Touch</span></h2>
            <p className="text-lg text-white/60">Ready to book your shoot or have a question? Let's connect.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-4">
              <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noopener noreferrer">
                <Button className="h-14 rounded-full bg-primary px-8 font-bold text-black hover:bg-primary/90">
                  <Phone className="mr-2 h-5 w-5" /> WhatsApp
                </Button>
              </a>
              <a href="mailto:info@hafash.pk">
                <Button variant="outline" className="h-14 rounded-full border-white/20 text-white hover:bg-white/10 px-8 font-bold">
                  Email Us
                </Button>
              </a>
            </div>
          </div>
        </section>

        {selectedImage && (
          <div 
            className="fixed inset-0 z-[150] flex flex-col items-center justify-center bg-black/98 p-4 backdrop-blur-xl select-none"
            onClick={closeLightbox}
            onContextMenu={(e) => e.preventDefault()}
          >
            {/* Top Bar (Counter + Close) */}
            <div className="absolute top-0 left-0 right-0 z-[160] flex items-center justify-between p-4 md:p-8 bg-gradient-to-b from-black/80 to-transparent">
              <div className="px-4 py-2 rounded-full bg-white/10 border border-white/10 backdrop-blur-md text-white text-xs font-bold tracking-[0.2em]">
                {lightboxIndex !== null ? lightboxIndex + 1 : 0} / {visiblePhotos.length}
              </div>
              <button 
                onClick={closeLightbox} 
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 border border-white/20 text-white hover:bg-primary hover:text-black transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Left Arrow */}
            {visiblePhotos.length > 1 && (
              <button 
                onClick={(e) => { e.stopPropagation(); showPrevious(); }} 
                className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 z-[160] flex h-12 w-12 md:h-14 md:w-14 items-center justify-center rounded-full border border-white/20 bg-black/50 text-white hover:bg-primary hover:text-black transition-all backdrop-blur-md"
              >
                <ChevronLeft className="h-6 w-6 md:h-8 md:w-8" />
              </button>
            )}

            {/* Main Image Area (Protected) */}
            <div 
              className="relative flex max-h-[80vh] max-w-[95vw] items-center justify-center animate-in zoom-in-95 duration-300"
              onClick={(e) => e.stopPropagation()}
              onContextMenu={(e) => e.preventDefault()}
            >
              {isVideo(selectedImage) ? (
                <video 
                  key={selectedImage} 
                  src={selectedImage} 
                  controls 
                  autoPlay 
                  playsInline 
                  className="max-h-[80vh] max-w-full rounded-lg shadow-2xl" 
                />
              ) : (
                <img 
                  key={selectedImage} 
                  src={selectedImage} 
                  alt="Hafash fullscreen portfolio" 
                  onError={() => {
                    alert("Yeh picture corrupt hai. Console check karein.");
                    closeLightbox();
                  }}
                  className="max-h-[80vh] max-w-full rounded-lg object-contain shadow-[0_0_100px_rgba(0,0,0,0.8)] pointer-events-none select-none" 
                />
              )}
            </div>

            {/* Right Arrow */}
            {visiblePhotos.length > 1 && (
              <button 
                onClick={(e) => { e.stopPropagation(); showNext(); }} 
                className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 z-[160] flex h-12 w-12 md:h-14 md:w-14 items-center justify-center rounded-full border border-white/20 bg-black/50 text-white hover:bg-primary hover:text-black transition-all backdrop-blur-md"
              >
                <ChevronRight className="h-6 w-6 md:h-8 md:w-8" />
              </button>
            )}
          </div>
        )}
      </div>
    </main>
  );
}