"use client";

import {
  Phone,
  Instagram,
  X,
  Camera,
  Play,
  Aperture,
  ArrowRight,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  MessageCircle,
  Video,
  Grid,
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
  const [allPhotos, setAllPhotos] = useState<string[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(true);

  const dataRef = useMemo(() => firestore ? doc(firestore, "portfolio_data", "master") : null, [firestore]);
  const { data: basicData } = useDoc(dataRef);

  const albumsQuery = useMemo(() => firestore ? query(collection(firestore, "portfolio_albums")) : null, [firestore]);
  const { data: albums } = useCollection(albumsQuery);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function fetchPhotos() {
      if (!albums) return;
      if (albums.length === 0) {
        setAlbumsWithPhotos([]);
        setAllPhotos([]);
        setLoadingPhotos(false);
        return;
      }
      setLoadingPhotos(true);
      try {
        const updatedAlbums = await Promise.all(
          albums.map(async (album: any) => {
            const photoItems = Array.isArray(album.photos) ? album.photos : [];
            if (photoItems.length === 0) return { ...album, displayItems: [] };

            const keys = photoItems.map((p: any) => typeof p === "string" ? p : p.key || '');
            const validKeys = keys.filter((k: string) => k.length > 0);
            
            try {
              if (validKeys.length === 0) return { ...album, displayItems: [] };

              const res = await refreshPhotoUrls(validKeys);
              if (res?.success && res?.urls) {
                const displayItems = photoItems.map((p: any) => {
                  const key = typeof p === "string" ? p : p.key || '';
                  const caption = typeof p === "string" ? 'General' : (p.caption || 'General');
                  return { key, url: res.urls[key] || '', caption };
                }).filter((item: any) => item.url && item.url.startsWith("http"));
                
                return { ...album, displayItems };
              }
            } catch (error) {
              console.error(error);
            }
            return { ...album, displayItems: [] };
          })
        );

        if (cancelled) return;
        setAlbumsWithPhotos(updatedAlbums);
        setAllPhotos(updatedAlbums.flatMap((album: any) => (album.displayItems || []).map((i: any) => i.url)).filter(Boolean));
      } catch (error) {
        console.error(error);
      } finally {
        if (!cancelled) setLoadingPhotos(false);
      }
    }
    fetchPhotos();
    return () => { cancelled = true; };
  }, [albums]);

  const heroImage = basicData?.heroImage || "https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=2070";
  const aboutImage = basicData?.aboutImage || "https://images.unsplash.com/photo-1537633552985-df8429e8048b?q=80&w=1000";
  const bioText = basicData?.bioText || "I don't just take pictures; I curate timeless memories.";
  const whatsapp = basicData?.whatsapp || "923001234567";
  const instagram = basicData?.instagram || "https://instagram.com";
  
  const yearsExperience = basicData?.yearsExperience || "5+";
  const totalWeddings = basicData?.totalWeddings || "200+";
  const happyClients = basicData?.happyClients || "100%";

  const currentAlbum = albumsWithPhotos.find((a: any) => a.id === activeAlbum);
  
  const isVideo = useCallback((url: string) => {
    if (!url) return false;
    return /\.(mp4|webm|ogg|mov|m4v)$/i.test(url.split("?")[0].split("#")[0]);
  }, []);

  const visiblePhotos = useMemo(() => {
    if (!activeAlbum) {
      return allPhotos.filter(url => {
        if (mediaFilter === 'videos') return isVideo(url);
        if (mediaFilter === 'photos') return !isVideo(url);
        return true;
      });
    }
    if (!currentAlbum || !currentAlbum.displayItems) return [];
    
    let items = currentAlbum.displayItems;
    if (activeGroup) items = items.filter((i: any) => i.caption === activeGroup);
    
    return items.map((i: any) => i.url).filter((url: string) => {
      if (mediaFilter === 'videos') return isVideo(url);
      if (mediaFilter === 'photos') return !isVideo(url);
      return true;
    });
  }, [activeAlbum, activeGroup, currentAlbum, allPhotos, mediaFilter, isVideo]);

  const currentGroups = useMemo((): string[] => {
    if (!currentAlbum || !currentAlbum.displayItems) return [];
    const groups: string[] = currentAlbum.displayItems.map((i: any) => String(i.caption));
    return Array.from(new Set(groups)).filter((g: string) => g !== 'General' && g !== 'All'); 
  }, [currentAlbum]);

  const phoneNumber = String(whatsapp).replace(/\D/g, "");
  const whatsappNumber = phoneNumber.startsWith("0") ? `92${phoneNumber.slice(1)}` : phoneNumber;
  const instagramUrl = String(instagram).startsWith("http") ? instagram : `https://instagram.com/${String(instagram).replace("@", "")}`;

  const closeLightbox = useCallback(() => setLightboxIndex(null), []);
  const showPrevious = useCallback(() => { setLightboxIndex((c) => (c === null || visiblePhotos.length === 0 ? c : (c - 1 + visiblePhotos.length) % visiblePhotos.length)); }, [visiblePhotos.length]);
  const showNext = useCallback(() => { setLightboxIndex((c) => (c === null || visiblePhotos.length === 0 ? c : (c + 1) % visiblePhotos.length)); }, [visiblePhotos.length]);
  const openLightbox = (index: number) => setLightboxIndex(index);
  const selectedImage = lightboxIndex !== null ? visiblePhotos[lightboxIndex] : null;

  useEffect(() => {
    if (lightboxIndex === null) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeLightbox();
      if (event.key === "ArrowLeft") showPrevious();
      if (event.key === "ArrowRight") showNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [lightboxIndex, closeLightbox, showPrevious, showNext]);

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
             <img 
               src="/hafash-logo.png" 
               alt="Hafash Production" 
               className="h-32 md:h-48 w-auto object-contain hafash-logo-glow transition-transform duration-700 hover:scale-105" 
             />
          </div>

          <h1 className="hafash-reveal font-headline text-4xl md:text-7xl font-bold tracking-[0.2em] text-white">
            HAFASH
          </h1>

          <div className="hafash-reveal-delay mt-3 text-sm font-light uppercase tracking-[0.6em] text-primary md:text-xl">
            Production
          </div>

          <div className="mx-auto my-8 h-px w-24 bg-primary/50" />

          <p className="hafash-reveal-delay text-xs font-light uppercase tracking-[0.3em] text-white/60">
            Luxury Photography · Timeless Memories
          </p>

          <div className="hafash-reveal-button mt-14 flex flex-col items-center gap-6">
            <Button
              onClick={() => setHasEntered(true)}
              className="group h-14 rounded-full border border-primary/80 bg-transparent px-10 text-xs font-bold uppercase tracking-[0.25em] text-primary transition-all duration-500 hover:bg-primary hover:text-black md:h-16 md:px-12"
            >
              Enter The Gallery
              <ArrowRight className="ml-4 h-4 w-4 transition-transform duration-500 group-hover:translate-x-2" />
            </Button>
            
            <a href="/" className="text-[10px] font-light uppercase tracking-[0.25em] text-white/40 hover:text-white transition-colors">
              Back to Platform
            </a>
          </div>
        </div>

        <div className="absolute bottom-10 left-0 right-0 text-center text-[9px] uppercase tracking-[0.45em] text-white/30">
          A Story Worth Remembering
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#080808] pb-20 font-sans text-white selection:bg-primary selection:text-black">
      <style jsx global>{`
        @keyframes portfolioFade { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .portfolio-fade { animation: portfolioFade .9s ease-out both; }
        .cinematic-scrollbar::-webkit-scrollbar { height: 4px; }
        .cinematic-scrollbar::-webkit-scrollbar-track { background: #151515; }
        .cinematic-scrollbar::-webkit-scrollbar-thumb { background: rgba(212,175,55,.6); border-radius: 20px; }
        .portfolio-image { transition: transform 1s cubic-bezier(.2,.7,.2,1); }
        .portfolio-card:hover .portfolio-image { transform: scale(1.06); }
      `}</style>

      <a 
        href={`https://wa.me/${whatsappNumber}`} 
        target="_blank" 
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-[100] flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_0_20px_rgba(37,211,102,0.4)] transition-transform hover:scale-110 md:h-16 md:w-16"
        aria-label="Book via WhatsApp"
      >
        <MessageCircle className="h-7 w-7 md:h-8 md:w-8" />
      </a>

      <nav className="fixed left-0 right-0 top-0 z-50 border-b border-white/[0.07] bg-[#080808]/85 px-5 py-4 backdrop-blur-2xl md:px-10">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between">
          <button onClick={() => { setActiveAlbum(null); setActiveGroup(null); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="flex items-center gap-3">
            <img src="/hafash-logo.png" alt="Hafash Logo" className="h-10 w-10 md:h-12 md:w-12 object-contain" />
            <div className="text-left">
              <p className="font-headline text-lg md:text-xl font-bold tracking-wider">HAFASH<span className="text-primary">.</span></p>
              <p className="text-[8px] md:text-[9px] uppercase tracking-[0.3em] text-white/40">Production</p>
            </div>
          </button>

          <div className="flex items-center gap-3">
            <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-white/65 transition hover:border-primary hover:text-primary">
              <Instagram className="h-4 w-4" />
            </a>
            <a href="/">
              <Button variant="outline" className="h-9 rounded-full border-white/15 bg-white/[0.03] px-4 text-[9px] font-bold uppercase tracking-widest text-white/80 hover:border-primary hover:bg-primary hover:text-black">
                Back to Platform
              </Button>
            </a>
          </div>
        </div>
      </nav>

      {!activeAlbum && (
        <section className="relative mx-auto max-w-[1600px] px-5 pb-20 pt-32 md:px-10 md:pb-28 md:pt-40">
          <div className="pointer-events-none absolute right-0 top-20 h-[450px] w-[450px] rounded-full bg-primary/[0.07] blur-[150px]" />

          <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-24">
            <div className="portfolio-fade order-2 flex justify-center lg:order-1">
              <div className="relative w-full max-w-[500px]">
                <div className="absolute -inset-4 rounded-t-full border border-primary/20" />
                <div className="absolute -inset-8 rounded-t-full border border-white/[0.06]" />
                <div className="relative aspect-[4/5] overflow-hidden rounded-t-full rounded-b-sm border border-primary/40 bg-[#151515]">
                  <img src={aboutImage} alt="Hafash Production" className="h-full w-full object-cover transition-transform duration-[2s] hover:scale-105" loading="eager" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                  <div className="absolute bottom-7 left-0 right-0 text-center">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.45em] text-white/80">Behind The Lens</p>
                  </div>
                </div>
                <div className="absolute -bottom-5 -right-3 flex h-20 w-20 items-center justify-center rounded-full border border-primary/50 bg-[#0b0b0b] shadow-2xl md:-right-8">
                  <Aperture className="h-9 w-9 text-primary" strokeWidth={1} />
                </div>
              </div>
            </div>

            <div className="portfolio-fade order-1 space-y-7 text-center lg:order-2 lg:text-left">
              <div className="inline-flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.35em] text-primary">
                <span className="h-px w-8 bg-primary" />
                Welcome To My World
                <span className="h-px w-8 bg-primary lg:hidden" />
              </div>

              <h1 className="font-headline text-6xl font-bold leading-[1.05] tracking-tight md:text-7xl lg:text-[6.5rem]">
                Hello,<br />I'm <span className="font-light italic text-primary">Hamza Khan</span>
              </h1>

              <p className="mx-auto max-w-xl text-lg font-light leading-8 text-white/55 md:text-xl lg:mx-0">{bioText}</p>

              <div className="mx-auto h-px max-w-md bg-gradient-to-r from-transparent via-primary/50 to-transparent lg:mx-0 lg:from-primary/50 lg:to-transparent" />

              <div className="grid grid-cols-3 gap-4 py-3">
                <div>
                  <p className="font-headline text-4xl font-bold text-primary md:text-5xl">{yearsExperience}</p>
                  <p className="mt-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-white/45 md:text-[11px]">Years Experience</p>
                </div>
                <div className="border-x border-white/10">
                  <p className="font-headline text-4xl font-bold text-primary md:text-5xl">{totalWeddings}</p>
                  <p className="mt-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-white/45 md:text-[11px]">Weddings</p>
                </div>
                <div>
                  <p className="font-headline text-4xl font-bold text-primary md:text-5xl">{happyClients}</p>
                  <p className="mt-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-white/45 md:text-[11px]">Happy Clients</p>
                </div>
              </div>

              <div className="flex flex-col justify-center gap-3 pt-3 sm:flex-row lg:justify-start">
                <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noopener noreferrer">
                  <Button className="h-14 w-full rounded-xl bg-primary px-8 font-bold text-black shadow-[0_0_30px_rgba(212,175,55,0.12)] transition-all hover:scale-[1.03] hover:bg-primary/90 sm:w-auto">
                    <Phone className="mr-2 h-5 w-5" /> Book Your Shoot
                  </Button>
                </a>
                <a href={instagramUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="h-14 w-full rounded-xl border-white/20 bg-transparent px-8 font-bold text-white hover:border-primary hover:bg-white/[0.05] sm:w-auto">
                    <Instagram className="mr-2 h-5 w-5" /> Follow Us
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </section>
      )}

      {!activeAlbum && (
        <section className="border-y border-white/[0.07] bg-[#0c0c0c] py-16 md:py-20">
          <div className="mx-auto max-w-[1600px] px-5 md:px-10">
            <div className="mb-10 flex items-end justify-between">
              <div>
                <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.4em] text-primary">Explore Our Work</p>
                <h2 className="font-headline text-4xl font-bold md:text-6xl">Collections<span className="text-primary">.</span></h2>
              </div>
              <p className="hidden text-[9px] uppercase tracking-[0.3em] text-white/35 md:block">Swipe To Explore</p>
            </div>

            <div className="cinematic-scrollbar flex snap-x gap-6 overflow-x-auto pb-6">
              <button onClick={() => { setActiveAlbum(null); setActiveGroup(null); }} className={`group relative h-72 w-56 shrink-0 snap-start overflow-hidden rounded-xl text-left md:h-80 md:w-64 ${!activeAlbum ? "ring-2 ring-primary ring-offset-4 ring-offset-[#0c0c0c]" : "border border-white/10"}`}>
                <img src={heroImage} alt="All works" className="portfolio-image h-full w-full object-cover opacity-60" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                <div className="absolute left-5 top-5 flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-black/30 backdrop-blur">
                  <ImageIcon className="h-4 w-4 text-primary" />
                </div>
                <div className="absolute bottom-6 left-5 right-5">
                  <p className="font-headline text-2xl font-bold">All Works</p>
                  <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.2em] text-primary">{allPhotos.length} Media</p>
                </div>
              </button>

              {albumsWithPhotos.map((album: any, index: number) => (
                <button key={album.id || index} onClick={() => { setActiveAlbum(album.id); setActiveGroup(null); setMediaFilter('all'); }} className={`group relative h-72 w-56 shrink-0 snap-start overflow-hidden rounded-xl text-left md:h-80 md:w-64 ${activeAlbum === album.id ? "ring-2 ring-primary ring-offset-4 ring-offset-[#0c0c0c]" : "border border-white/10"}`}>
                  {album.displayItems?.[0]?.url ? (
                    <img src={album.displayItems[0].url} alt={album.name || "Collection"} className="portfolio-image h-full w-full object-cover opacity-65" loading="lazy" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-[#171717]"><Camera className="h-12 w-12 text-primary/40" /></div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                  <div className="absolute left-5 top-5 flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-black/30 backdrop-blur">
                    <Aperture className="h-4 w-4 text-primary" />
                  </div>
                  <div className="absolute bottom-6 left-5 right-5">
                    <p className="font-headline text-2xl font-bold capitalize">{album.name || "Collection"}</p>
                    <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.2em] text-primary">{album.displayItems?.length || 0} Media</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-[1600px] px-5 py-20 md:px-10 md:py-28">
        {activeAlbum ? (
          <div className="animate-in fade-in duration-1000">
            <div className="relative mb-10 text-center">
              <button onClick={() => { setActiveAlbum(null); setActiveGroup(null); }} className="mb-8 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-primary transition hover:text-white border border-primary/30 px-6 py-3 rounded-full hover:bg-primary/10">
                <ArrowLeft className="h-4 w-4" /> Back To All Collections
              </button>
              <h1 className="font-headline text-5xl md:text-8xl font-bold text-white capitalize mb-4">{currentAlbum?.name}</h1>
              <p className="text-white/50 tracking-widest uppercase text-sm">{currentAlbum?.displayItems?.length || 0} Masterpieces</p>
            </div>

            {currentGroups.length > 0 && (
              <div className="flex justify-center gap-6 md:gap-8 overflow-x-auto pb-8 pt-4 custom-scrollbar">
                <button onClick={() => setActiveGroup(null)} className="flex flex-col items-center gap-3 shrink-0 group">
                  <div className={`p-[3px] rounded-full transition-all duration-300 ${!activeGroup ? 'bg-gradient-to-tr from-primary via-yellow-200 to-primary scale-105 shadow-[0_0_20px_rgba(212,175,55,0.3)]' : 'bg-white/10 group-hover:bg-white/20'}`}>
                     <div className="w-20 h-20 md:w-24 md:h-24 rounded-full border-[3px] border-[#080808] overflow-hidden bg-[#111] flex items-center justify-center"><ImageIcon className={`w-8 h-8 ${!activeGroup ? 'text-primary' : 'text-white/50'}`} /></div>
                  </div>
                  <span className={`text-xs md:text-sm font-headline font-bold ${!activeGroup ? 'text-primary' : 'text-white/60'}`}>All Work</span>
                </button>

                {currentGroups.map((group: string, i: number) => {
                  const firstPhoto = currentAlbum?.displayItems.find((item:any) => item.caption === group);
                  return (
                    <button key={i} onClick={() => setActiveGroup(group)} className="flex flex-col items-center gap-3 shrink-0 group">
                      <div className={`p-[3px] rounded-full transition-all duration-300 ${activeGroup === group ? 'bg-gradient-to-tr from-primary via-yellow-200 to-primary scale-105 shadow-[0_0_20px_rgba(212,175,55,0.3)]' : 'bg-white/10 group-hover:bg-white/20'}`}>
                         <div className="w-20 h-20 md:w-24 md:h-24 rounded-full border-[3px] border-[#080808] overflow-hidden bg-[#111] relative">
                           {firstPhoto?.url ? <img src={firstPhoto.url} alt={String(group)} className="w-full h-full object-cover" /> : <span className="text-xs text-white/50 absolute inset-0 flex items-center justify-center">No Img</span>}
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

            {/* 🚀 NAYA 3-COLUMN MOBILE GRID */}
            <div className="grid grid-cols-3 gap-1 md:gap-2">
              {visiblePhotos.map((media: string, index: number) => (
                media && (
                  <button key={`${media}-${index}`} onClick={() => openLightbox(index)} className="group relative block w-full aspect-square overflow-hidden bg-[#141414] text-left">
                    {isVideo(media) ? (
                      <div className="relative w-full h-full">
                        <video src={media} className="h-full w-full object-cover" muted playsInline preload="metadata" />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20"><div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/50 bg-black/40 backdrop-blur"><Play className="ml-0.5 h-3 w-3 fill-white text-white" /></div></div>
                      </div>
                    ) : (
                      <img src={media} alt="Portfolio" className="block h-full w-full object-cover transition-transform duration-1000 group-hover:scale-105" loading="lazy" />
                    )}
                  </button>
                )
              ))}
            </div>

            {visiblePhotos.length === 0 && (
              <div className="text-center py-20 text-white/40 italic">No media found in this filter.</div>
            )}
          </div>
        ) : (
          <div className="animate-in fade-in">
            <div className="mb-12 text-center">
              <h2 className="font-headline text-5xl font-bold md:text-7xl">The Gallery<span className="text-primary">.</span></h2>
            </div>
            {loadingPhotos ? (
              <div className="grid grid-cols-3 gap-1 md:gap-2">
                {Array.from({ length: 9 }).map((_, index) => (<div key={index} className={`animate-pulse rounded-lg bg-white/[0.06] aspect-square`} />))}
              </div>
            ) : (
              // 🚀 NAYA 3-COLUMN MOBILE GRID (HOME)
              <div className="grid grid-cols-3 gap-1 md:gap-2">
                {allPhotos.map((media, index) => (
                   media && (
                    <button key={index} onClick={() => openLightbox(index)} className="group relative block w-full aspect-square overflow-hidden border border-white/5 bg-[#141414] text-left">
                       {isVideo(media) ? (
                         <div className="relative w-full h-full"><video src={media} className="h-full w-full object-cover" muted playsInline preload="metadata" /><div className="absolute inset-0 flex items-center justify-center"><Play className="h-8 w-8 text-white" /></div></div>
                       ) : (
                         <img src={media} alt="Gallery" className="block h-full w-full object-cover transition-transform duration-1000 group-hover:scale-105" loading="lazy" />
                       )}
                    </button>
                   )
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {selectedImage && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/95 p-3 backdrop-blur-xl md:p-8" onClick={closeLightbox}>
          <button onClick={closeLightbox} aria-label="Close viewer" className="absolute right-5 top-5 z-[160] flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition hover:border-primary hover:text-primary md:right-8 md:top-8">
            <X className="h-5 w-5" />
          </button>

          {visiblePhotos.length > 1 && (
            <button onClick={(event) => { event.stopPropagation(); showPrevious(); }} aria-label="Previous media" className="absolute left-3 top-1/2 z-[160] flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/50 text-white transition hover:border-primary hover:text-primary md:left-8 md:h-14 md:w-14">
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}

          <div className="flex max-h-[88vh] max-w-[90vw] items-center justify-center" onClick={(event) => event.stopPropagation()}>
            {isVideo(selectedImage) ? (
              <video key={selectedImage} src={selectedImage} controls autoPlay playsInline className="max-h-[85vh] max-w-full rounded-lg shadow-2xl" />
            ) : (
              <img key={selectedImage} src={selectedImage} alt="Hafash fullscreen portfolio" className="max-h-[85vh] max-w-full rounded-lg object-contain shadow-2xl" />
            )}
          </div>

          {visiblePhotos.length > 1 && (
            <button onClick={(event) => { event.stopPropagation(); showNext(); }} aria-label="Next media" className="absolute right-3 top-1/2 z-[160] flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/50 text-white transition hover:border-primary hover:text-primary md:right-8 md:h-14 md:w-14">
              <ChevronRight className="h-6 w-6" />
            </button>
          )}

          <div className="absolute bottom-6 left-0 right-0 text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/55">
              {lightboxIndex !== null ? lightboxIndex + 1 : 0} / {visiblePhotos.length}
            </p>
          </div>
        </div>
      )}
    </main>
  );
}