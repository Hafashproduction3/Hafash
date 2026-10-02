"use client";

import { useParams } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { useFirestore } from "@/firebase";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import {
  Camera, X, ChevronLeft, ChevronRight, Loader2,
  Sparkles, Filter, LayoutGrid
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { refreshPhotoUrls } from "@/app/actions/storage";
import { getTheme } from "@/lib/portfolio-themes";
import { cn } from "@/lib/utils";

export default function PortfolioPage() {
  const params = useParams();
  const subdomain = (params?.subdomain as string) || "";
  const firestore = useFirestore();

  const [photographer, setPhotographer] = useState<any>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPhotoIdx, setSelectedPhotoIdx] = useState<number | null>(null);
  const [displayLimit, setDisplayLimit] = useState(30);

  // Fetch photographer + portfolio photos
  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!firestore || !subdomain) {
        setLoading(false);
        return;
      }

      try {
        const userQuery = query(
          collection(firestore, "publicProfiles"),
          where("subdomain", "==", subdomain.toLowerCase()),
          limit(1)
        );
        const userSnap = await getDocs(userQuery);

        if (cancelled) return;
        if (userSnap.empty) { setLoading(false); return; }

        const photographerData: any = {
          userId: userSnap.docs[0].id,
          ...userSnap.docs[0].data(),
        };

        setPhotographer(photographerData);

        // Fresh URLs for portfolio photos
        const rawPhotos: any[] = photographerData.portfolioPhotos || [];
        if (rawPhotos.length > 0) {
          const keysToRefresh: string[] = [];
          rawPhotos.forEach((p: any) => {
            if (p.storageKey) keysToRefresh.push(p.storageKey);
            if (p.thumbKey) keysToRefresh.push(p.thumbKey);
          });

          let urlMap: Record<string, string> = {};
          if (keysToRefresh.length > 0) {
            try {
              const result = await refreshPhotoUrls(keysToRefresh);
              if (result.success) urlMap = result.urls;
            } catch {}
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

          if (!cancelled) setPhotos(refreshed);
        }
      } catch (err) {
        console.error("[PORTFOLIO_LOAD]", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [firestore, subdomain]);

  const theme = useMemo(() => {
    if (!photographer) return getTheme('royal-gold');
    return getTheme(photographer.theme, photographer.customColors);
  }, [photographer?.theme, photographer?.customColors]);

  // Get unique categories from photos (based on caption)
  const categories = useMemo(() => {
    const cats = new Set<string>();
    photos.forEach((p: any) => {
      if (p.caption) cats.add(p.caption.toLowerCase());
    });
    return ['all', ...Array.from(cats)];
  }, [photos]);

  // Filter photos
  const filteredPhotos = useMemo(() => {
    if (selectedCategory === 'all') return photos;
    return photos.filter((p: any) =>
      (p.caption || '').toLowerCase() === selectedCategory
    );
  }, [photos, selectedCategory]);

  const visiblePhotos = filteredPhotos.slice(0, displayLimit);
  const hasMore = displayLimit < filteredPhotos.length;

  // Lightbox navigation
  const goNext = () => {
    if (selectedPhotoIdx === null) return;
    setSelectedPhotoIdx((selectedPhotoIdx + 1) % filteredPhotos.length);
  };
  const goPrev = () => {
    if (selectedPhotoIdx === null) return;
    setSelectedPhotoIdx((selectedPhotoIdx - 1 + filteredPhotos.length) % filteredPhotos.length);
  };

  // Keyboard navigation
  useEffect(() => {
    if (selectedPhotoIdx === null) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedPhotoIdx(null);
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [selectedPhotoIdx, filteredPhotos.length]);

  // Lock body scroll when lightbox open
  useEffect(() => {
    if (selectedPhotoIdx !== null) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [selectedPhotoIdx]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div
          className="w-12 h-12 border-4 rounded-full animate-spin"
          style={{
            borderColor: 'var(--portfolio-border)',
            borderTopColor: 'var(--portfolio-primary)',
          }}
        />
      </div>
    );
  }

  return (
    <>
      {/* ═══════════════════════════════════════════════════ */}
      {/* PAGE HERO */}
      {/* ═══════════════════════════════════════════════════ */}
      <section
        className="py-20 lg:py-24 relative overflow-hidden"
        style={{ background: 'var(--portfolio-section-bg)' }}
      >
        <div
          className="absolute inset-0 opacity-5"
          style={{
            background: `radial-gradient(circle at center, var(--portfolio-primary) 0%, transparent 70%)`,
          }}
        />
        <div className="relative max-w-7xl mx-auto px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border mb-6"
            style={{
              borderColor: 'var(--portfolio-primary)',
              background: 'var(--portfolio-primary)10',
            }}
          >
            <Camera className="w-3 h-3" style={{ color: 'var(--portfolio-primary)' }} />
            <span
              className="text-[10px] font-bold uppercase tracking-[0.3em]"
              style={{ color: 'var(--portfolio-primary)' }}
            >
              Portfolio
            </span>
          </div>
          <h1
            className="text-5xl lg:text-7xl font-headline font-bold mb-4 leading-tight"
            style={{ color: 'var(--portfolio-heading-text)' }}
          >
            My Best Work
          </h1>
          <p
            className="text-lg lg:text-xl max-w-2xl mx-auto italic"
            style={{ color: 'var(--portfolio-muted-text)' }}
          >
            A curated collection of moments I've been honored to capture
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════ */}
      {/* CATEGORY FILTER */}
      {/* ═══════════════════════════════════════════════════ */}
      {categories.length > 1 && (
        <section
          className="py-8 border-b sticky top-20 z-30 backdrop-blur-xl"
          style={{
            background: 'var(--portfolio-header-bg)',
            borderColor: 'var(--portfolio-header-border)',
          }}
        >
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="flex items-center gap-3 flex-wrap justify-center">
              <div className="flex items-center gap-2 mr-4">
                <Filter className="w-4 h-4" style={{ color: 'var(--portfolio-primary)' }} />
                <span
                  className="text-xs font-bold uppercase tracking-widest"
                  style={{ color: 'var(--portfolio-muted-text)' }}
                >
                  Filter
                </span>
              </div>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    setSelectedCategory(cat);
                    setDisplayLimit(30);
                  }}
                  className={cn(
                    "px-5 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all",
                    selectedCategory === cat ? "scale-105" : "opacity-60 hover:opacity-100"
                  )}
                  style={{
                    background: selectedCategory === cat
                      ? 'var(--portfolio-primary)'
                      : 'transparent',
                    color: selectedCategory === cat
                      ? 'var(--portfolio-primary-text)'
                      : 'var(--portfolio-body-text)',
                    border: `1px solid ${selectedCategory === cat ? 'var(--portfolio-primary)' : 'var(--portfolio-border)'}`,
                  }}
                >
                  {cat === 'all' ? 'All Photos' : cat}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════ */}
      {/* PHOTOS GRID */}
      {/* ═══════════════════════════════════════════════════ */}
      <section className="py-16 lg:py-20" style={{ background: 'var(--portfolio-page-bg)' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">

          {filteredPhotos.length === 0 ? (
            <div className="text-center py-32">
              <LayoutGrid
                className="w-20 h-20 mx-auto mb-6"
                style={{ color: 'var(--portfolio-muted-text)', opacity: 0.2 }}
              />
              <h3
                className="text-2xl font-headline font-bold mb-3"
                style={{ color: 'var(--portfolio-heading-text)' }}
              >
                Portfolio Coming Soon
              </h3>
              <p
                className="text-sm italic"
                style={{ color: 'var(--portfolio-muted-text)' }}
              >
                Photographer abhi portfolio photos upload nahi ki.
              </p>
            </div>
          ) : (
            <>
              {/* Count */}
              <div className="text-center mb-10">
                <p
                  className="text-xs font-bold uppercase tracking-[0.3em]"
                  style={{ color: 'var(--portfolio-muted-text)' }}
                >
                  {filteredPhotos.length} {filteredPhotos.length === 1 ? 'Photo' : 'Photos'}
                </p>
              </div>

              {/* Masonry Grid */}
              <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
                {visiblePhotos.map((photo: any, idx: number) => (
                  <div
                    key={photo.id}
                    onClick={() => setSelectedPhotoIdx(idx)}
                    className="break-inside-avoid group relative overflow-hidden rounded-[2rem] cursor-pointer"
                    style={{ border: `1px solid var(--portfolio-border)` }}
                  >
                    <img
                      src={photo.thumbUrl || photo.url}
                      alt={photo.caption || `Portfolio ${idx + 1}`}
                      className="w-full h-auto object-cover transition-transform duration-1000 group-hover:scale-110"
                      loading="lazy"
                    />

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                      <div className="absolute bottom-6 left-6 right-6">
                        {photo.caption && (
                          <p className="text-white text-sm font-bold uppercase tracking-widest">
                            {photo.caption}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Load More */}
              {hasMore && (
                <div className="text-center mt-16">
                  <Button
                    size="lg"
                    onClick={() => setDisplayLimit(prev => prev + 30)}
                    className="rounded-full px-10 h-14 font-bold gap-2 shadow-xl transition-all hover:scale-105"
                    style={{
                      background: 'var(--portfolio-primary)',
                      color: 'var(--portfolio-primary-text)',
                    }}
                  >
                    Load More ({filteredPhotos.length - displayLimit} remaining)
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════ */}
      {/* LIGHTBOX */}
      {/* ═══════════════════════════════════════════════════ */}
      {selectedPhotoIdx !== null && filteredPhotos[selectedPhotoIdx] && (
        <div
          className="fixed inset-0 z-[100] bg-black/98 backdrop-blur-3xl flex items-center justify-center"
          onClick={() => setSelectedPhotoIdx(null)}
        >
          {/* Close */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-6 right-6 z-30 text-white h-14 w-14 hover:bg-white/10 rounded-full"
            onClick={(e) => { e.stopPropagation(); setSelectedPhotoIdx(null); }}
          >
            <X className="w-7 h-7" />
          </Button>

          {/* Counter */}
          <div className="absolute top-6 left-6 z-30 px-4 py-2 rounded-full bg-white/10 backdrop-blur-xl text-white text-sm font-bold">
            {selectedPhotoIdx + 1} / {filteredPhotos.length}
          </div>

          {/* Prev */}
          {filteredPhotos.length > 1 && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-4 lg:left-10 top-1/2 -translate-y-1/2 z-30 text-white h-16 w-16 hover:bg-white/10 rounded-full"
              onClick={(e) => { e.stopPropagation(); goPrev(); }}
            >
              <ChevronLeft className="w-10 h-10" />
            </Button>
          )}

          {/* Next */}
          {filteredPhotos.length > 1 && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 lg:right-10 top-1/2 -translate-y-1/2 z-30 text-white h-16 w-16 hover:bg-white/10 rounded-full"
              onClick={(e) => { e.stopPropagation(); goNext(); }}
            >
              <ChevronRight className="w-10 h-10" />
            </Button>
          )}

          {/* Image */}
          <img
            src={filteredPhotos[selectedPhotoIdx].url}
            alt={filteredPhotos[selectedPhotoIdx].caption || 'Fullscreen'}
            className="max-w-[95vw] max-h-[90vh] object-contain rounded-2xl animate-in fade-in duration-300"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Caption */}
          {filteredPhotos[selectedPhotoIdx].caption && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 px-6 py-3 rounded-full bg-white/10 backdrop-blur-xl text-white text-sm font-bold uppercase tracking-widest">
              {filteredPhotos[selectedPhotoIdx].caption}
            </div>
          )}
        </div>
      )}
    </>
  );
}