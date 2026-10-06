"use client";

import { useParams } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useFirestore } from "@/firebase";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import {
  Camera, X, ChevronLeft, ChevronRight, Loader2,
  Sparkles, Filter, LayoutGrid, Folder, Play
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
  const [folders, setFolders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'folders'>('all');
  const [selectedPhotoIdx, setSelectedPhotoIdx] = useState<number | null>(null);
  const [displayLimit, setDisplayLimit] = useState(30);

  // Fetch photographer + portfolio photos + folders
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

          // Also refresh folder cover images
          const rawFolders: any[] = photographerData.portfolioFolders || [];
          rawFolders.forEach((f: any) => {
            if (f.coverKey) keysToRefresh.push(f.coverKey);
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

          // Refresh folder covers
          const refreshedFolders = rawFolders
            .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
            .map((f: any) => ({
              ...f,
              coverImage: f.coverKey
                ? (urlMap[f.coverKey] || f.coverImage || '')
                : (f.coverImage || ''),
            }));

          if (!cancelled) setFolders(refreshedFolders);
        } else {
          if (!cancelled) setFolders(photographerData.portfolioFolders || []);
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

  const visiblePhotos = photos.slice(0, displayLimit);
  const hasMore = displayLimit < photos.length;

  // Lightbox navigation
  const goNext = () => {
    if (selectedPhotoIdx === null) return;
    setSelectedPhotoIdx((selectedPhotoIdx + 1) % photos.length);
  };
  const goPrev = () => {
    if (selectedPhotoIdx === null) return;
    setSelectedPhotoIdx((selectedPhotoIdx - 1 + photos.length) % photos.length);
  };

  useEffect(() => {
    if (selectedPhotoIdx === null) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedPhotoIdx(null);
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [selectedPhotoIdx, photos.length]);

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
      {/* PAGE HERO */}
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
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border mb-6"
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

      {/* 🆕 TABS — All Photos + Folders */}
      {photos.length > 0 && (
        <section
          className="py-6 border-b sticky top-20 z-30 backdrop-blur-xl"
          style={{
            background: 'var(--portfolio-header-bg)',
            borderColor: 'var(--portfolio-header-border)',
          }}
        >
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => {
                  setActiveTab('all');
                  setDisplayLimit(30);
                }}
                className={cn(
                  "px-6 py-3 rounded-full text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2",
                  activeTab === 'all' ? "scale-105" : "opacity-60 hover:opacity-100"
                )}
                style={{
                  background: activeTab === 'all' ? 'var(--portfolio-primary)' : 'transparent',
                  color: activeTab === 'all' ? 'var(--portfolio-primary-text)' : 'var(--portfolio-body-text)',
                  border: `1px solid ${activeTab === 'all' ? 'var(--portfolio-primary)' : 'var(--portfolio-border)'}`,
                }}
              >
                <LayoutGrid className="w-4 h-4" />
                All Photos
                <span className="text-[10px] opacity-70">({photos.length})</span>
              </button>

              {folders.length > 0 && (
                <button
                  onClick={() => setActiveTab('folders')}
                  className={cn(
                    "px-6 py-3 rounded-full text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2",
                    activeTab === 'folders' ? "scale-105" : "opacity-60 hover:opacity-100"
                  )}
                  style={{
                    background: activeTab === 'folders' ? 'var(--portfolio-primary)' : 'transparent',
                    color: activeTab === 'folders' ? 'var(--portfolio-primary-text)' : 'var(--portfolio-body-text)',
                    border: `1px solid ${activeTab === 'folders' ? 'var(--portfolio-primary)' : 'var(--portfolio-border)'}`,
                  }}
                >
                  <Folder className="w-4 h-4" />
                  Folders
                  <span className="text-[10px] opacity-70">({folders.length})</span>
                </button>
              )}
            </div>
          </div>
        </section>
      )}

      {/* CONTENT */}
      <section className="py-16 lg:py-20" style={{ background: 'var(--portfolio-page-bg)' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">

          {/* ═══════════════════════════════════════════════ */}
          {/* ALL PHOTOS TAB */}
          {/* ═══════════════════════════════════════════════ */}
          {activeTab === 'all' && (
            <>
              {photos.length === 0 ? (
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

                        {/* Folder badge — agar photo folder mein hai */}
                        {photo.folderId && folders.length > 0 && (
                          <div className="absolute top-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Badge
                              className="text-[10px] font-bold uppercase tracking-widest backdrop-blur-xl"
                              style={{
                                background: 'var(--portfolio-primary)90',
                                color: 'var(--portfolio-primary-text)',
                              }}
                            >
                              <Folder className="w-3 h-3 mr-1" />
                              {folders.find((f: any) => f.id === photo.folderId)?.name || 'Folder'}
                            </Badge>
                          </div>
                        )}

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
                        Load More ({photos.length - displayLimit} remaining)
                      </Button>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* ═══════════════════════════════════════════════ */}
          {/* FOLDERS TAB — Circle Folders */}
          {/* ═══════════════════════════════════════════════ */}
          {activeTab === 'folders' && (
            <>
              {folders.length === 0 ? (
                <div className="text-center py-32">
                  <Folder
                    className="w-20 h-20 mx-auto mb-6"
                    style={{ color: 'var(--portfolio-muted-text)', opacity: 0.2 }}
                  />
                  <h3
                    className="text-2xl font-headline font-bold mb-3"
                    style={{ color: 'var(--portfolio-heading-text)' }}
                  >
                    Koi Folder Nahi
                  </h3>
                  <p
                    className="text-sm italic"
                    style={{ color: 'var(--portfolio-muted-text)' }}
                  >
                    Photographer ne abhi folders nahi banaye.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-5 gap-6 lg:gap-8 max-w-5xl mx-auto">
                  {folders.map((folder: any) => {
                    const photoCount = photos.filter((p: any) => p.folderId === folder.id).length;
                    const coverImage = folder.coverImage ||
                      photos.find((p: any) => p.folderId === folder.id)?.thumbUrl ||
                      photos.find((p: any) => p.folderId === folder.id)?.url;

                    return (
                      <Link
                        key={folder.id}
                        href={`/portfolio/${folder.slug || folder.id}`}
                        className="flex flex-col items-center gap-3 group"
                      >
                        {/* Circle Folder */}
                        <div className="relative">
                          <div
                            className="w-[80px] h-[80px] sm:w-[100px] sm:h-[100px] rounded-full overflow-hidden border-2 transition-all group-hover:scale-105"
                            style={{
                              borderColor: 'var(--portfolio-primary)',
                              boxShadow: '0 0 0 4px var(--portfolio-page-bg), 0 0 0 6px var(--portfolio-primary)30',
                            }}
                          >
                            {coverImage ? (
                              <img
                                src={coverImage}
                                alt={folder.name}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <div
                                className="w-full h-full flex items-center justify-center"
                                style={{ background: 'var(--portfolio-primary)15' }}
                              >
                                <Folder
                                  className="w-10 h-10"
                                  style={{ color: 'var(--portfolio-primary)' }}
                                />
                              </div>
                            )}
                          </div>

                          {/* Hover ring */}
                          <div
                            className="absolute inset-0 rounded-full border-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                            style={{ borderColor: 'var(--portfolio-primary)' }}
                          />
                        </div>

                        {/* Folder Info */}
                        <div className="text-center space-y-0.5 max-w-[120px]">
                          <p
                            className="font-bold text-xs sm:text-sm truncate"
                            style={{ color: 'var(--portfolio-heading-text)' }}
                          >
                            {folder.name}
                          </p>
                          <p
                            className="text-[10px] font-bold uppercase tracking-widest"
                            style={{ color: 'var(--portfolio-muted-text)' }}
                          >
                            {photoCount} {photoCount === 1 ? 'photo' : 'photos'}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════ */}
      {/* LIGHTBOX */}
      {/* ═══════════════════════════════════════════════════ */}
      {selectedPhotoIdx !== null && photos[selectedPhotoIdx] && (
        <div
          className="fixed inset-0 z-[100] bg-black/98 backdrop-blur-3xl flex items-center justify-center"
          onClick={() => setSelectedPhotoIdx(null)}
        >
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-6 right-6 z-30 text-white h-14 w-14 hover:bg-white/10 rounded-full"
            onClick={(e) => { e.stopPropagation(); setSelectedPhotoIdx(null); }}
          >
            <X className="w-7 h-7" />
          </Button>

          <div className="absolute top-6 left-6 z-30 px-4 py-2 rounded-full bg-white/10 backdrop-blur-xl text-white text-sm font-bold">
            {selectedPhotoIdx + 1} / {photos.length}
          </div>

          {photos.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-4 lg:left-10 top-1/2 -translate-y-1/2 z-30 text-white h-16 w-16 hover:bg-white/10 rounded-full"
                onClick={(e) => { e.stopPropagation(); goPrev(); }}
              >
                <ChevronLeft className="w-10 h-10" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 lg:right-10 top-1/2 -translate-y-1/2 z-30 text-white h-16 w-16 hover:bg-white/10 rounded-full"
                onClick={(e) => { e.stopPropagation(); goNext(); }}
              >
                <ChevronRight className="w-10 h-10" />
              </Button>
            </>
          )}

          <img
            src={photos[selectedPhotoIdx].url}
            alt={photos[selectedPhotoIdx].caption || 'Fullscreen'}
            className="max-w-[95vw] max-h-[90vh] object-contain rounded-2xl animate-in fade-in duration-300"
            onClick={(e) => e.stopPropagation()}
          />

          {photos[selectedPhotoIdx].caption && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 px-6 py-3 rounded-full bg-white/10 backdrop-blur-xl text-white text-sm font-bold uppercase tracking-widest">
              {photos[selectedPhotoIdx].caption}
            </div>
          )}
        </div>
      )}
    </>
  );
}