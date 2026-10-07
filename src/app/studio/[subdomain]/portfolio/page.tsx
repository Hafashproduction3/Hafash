"use client";

import { useParams } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useFirestore } from "@/firebase";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import {
  Camera, X, ChevronLeft, ChevronRight, Loader2,
  Folder, Play, ArrowRight, Sparkles, Image as ImageIcon
} from "lucide-react";
import { refreshPhotoUrls } from "@/app/actions/storage";
import { getTheme } from "@/lib/portfolio-themes";

export default function PortfolioPage() {
  const params = useParams();
  const subdomain = (params?.subdomain as string) || "";
  const firestore = useFirestore();

  const [photographer, setPhotographer] = useState<any>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [folders, setFolders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhotoIdx, setSelectedPhotoIdx] = useState<number | null>(null);
  const [displayLimit, setDisplayLimit] = useState(9);

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

        const rawPhotos: any[] = photographerData.portfolioPhotos || [];
        const rawFolders: any[] = photographerData.portfolioFolders || [];

        if (rawPhotos.length > 0 || rawFolders.length > 0) {
          const keysToRefresh: string[] = [];
          rawPhotos.forEach((p: any) => {
            if (p.storageKey) keysToRefresh.push(p.storageKey);
            if (p.thumbKey) keysToRefresh.push(p.thumbKey);
          });
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

          const refreshedPhotos = rawPhotos
            .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
            .map((p: any) => ({
              ...p,
              url: urlMap[p.storageKey] || p.url || '',
              thumbUrl: p.thumbKey
                ? (urlMap[p.thumbKey] || p.thumbUrl || p.url)
                : (urlMap[p.storageKey] || p.url || ''),
            }));

          const refreshedFolders = rawFolders
            .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
            .map((f: any) => {
              const folderPhotos = refreshedPhotos.filter((p: any) => p.folderId === f.id);
              const firstPhoto = folderPhotos[0];
              return {
                ...f,
                coverImage: f.coverKey
                  ? (urlMap[f.coverKey] || f.coverImage || '')
                  : (f.coverImage || firstPhoto?.thumbUrl || firstPhoto?.url || ''),
                photoCount: folderPhotos.length,
              };
            });

          if (!cancelled) {
            setPhotos(refreshedPhotos);
            setFolders(refreshedFolders);
          }
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

  const heroImage = photographer?.studioBanner || 
    folders[0]?.coverImage || 
    photos[0]?.thumbUrl || 
    photos[0]?.url;

  const visiblePhotos = photos.slice(0, displayLimit);
  const hasMore = displayLimit < photos.length;

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
    document.body.style.overflow = selectedPhotoIdx !== null ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [selectedPhotoIdx]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
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

  if (!photographer) return null;

  const studioName = photographer.studioName || "Studio";
  const city = photographer.city;

  return (
    <div style={{ background: 'var(--portfolio-page-bg)' }}>

      {/* ═══════════════════════════════════════════════════ */}
      {/* HERO SECTION — Stories That Stay */}
      {/* ═══════════════════════════════════════════════════ */}
      <section className="relative h-[70vh] min-h-[500px] overflow-hidden">
        {heroImage ? (
          <img
            src={heroImage}
            alt={studioName}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(135deg, var(--portfolio-primary)20, var(--portfolio-page-bg))`,
            }}
          />
        )}

        {/* Dark overlays */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.8) 100%)',
          }}
        />

        {/* Content */}
        <div className="relative h-full flex items-center justify-center">
          <div className="text-center px-6 max-w-4xl">
            <h1
              className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-headline font-bold leading-[1.05] tracking-tight text-white mb-6"
              style={{
                textShadow: '0 4px 30px rgba(0,0,0,0.6)',
              }}
            >
              Stories that stay
            </h1>

            <p className="text-base lg:text-xl text-white/80 tracking-wide font-light">
              Timeless. Intimate. Real.
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════ */}
      {/* EXPLORE COLLECTIONS */}
      {/* ═══════════════════════════════════════════════════ */}
      {folders.length > 0 && (
        <section
          className="py-16 lg:py-24"
          style={{ background: 'var(--portfolio-page-bg)' }}
        >
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            {/* Section Title */}
            <div className="mb-10">
              <h2
                className="text-xs lg:text-sm font-bold uppercase tracking-[0.4em]"
                style={{ color: 'var(--portfolio-muted-text)' }}
              >
                Explore Collections
              </h2>
            </div>

            {/* Folders Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {folders.map((folder: any) => (
                <Link
                  key={folder.id}
                  href={`/portfolio/${folder.slug || folder.id}`}
                  className="group"
                >
                  <div
                    className="rounded-2xl border overflow-hidden transition-all duration-500 group-hover:translate-y-[-4px] group-hover:shadow-2xl"
                    style={{
                      borderColor: 'var(--portfolio-border)',
                      background: 'var(--portfolio-card-bg)',
                    }}
                  >
                    <div className="flex items-stretch">
                      {/* Cover */}
                      <div className="w-32 lg:w-40 aspect-square shrink-0 overflow-hidden">
                        {folder.coverImage ? (
                          <img
                            src={folder.coverImage}
                            alt={folder.name}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          />
                        ) : (
                          <div
                            className="w-full h-full flex items-center justify-center"
                            style={{ background: 'var(--portfolio-section-bg)' }}
                          >
                            <Folder
                              className="w-8 h-8"
                              style={{ color: 'var(--portfolio-muted-text)', opacity: 0.4 }}
                            />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 p-5 lg:p-6 flex flex-col justify-center min-w-0">
                        <h3
                          className="text-xl lg:text-2xl font-headline font-bold mb-2 truncate"
                          style={{ color: 'var(--portfolio-heading-text)' }}
                        >
                          {folder.name}
                        </h3>
                        <div className="flex items-center gap-2">
                          <ImageIcon
                            className="w-3.5 h-3.5"
                            style={{ color: 'var(--portfolio-muted-text)' }}
                          />
                          <span
                            className="text-xs font-bold uppercase tracking-widest"
                            style={{ color: 'var(--portfolio-muted-text)' }}
                          >
                            {folder.photoCount || 0} Photos
                          </span>
                        </div>
                      </div>

                      {/* Arrow */}
                      <div className="flex items-center pr-5">
                        <ChevronRight
                          className="w-4 h-4 transition-transform group-hover:translate-x-1"
                          style={{ color: 'var(--portfolio-primary)' }}
                        />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════ */}
      {/* ALL PHOTOS */}
      {/* ═══════════════════════════════════════════════════ */}
      {photos.length > 0 && (
        <section
          className="py-16 lg:py-24 border-t"
          style={{
            background: 'var(--portfolio-section-bg)',
            borderColor: 'var(--portfolio-border)',
          }}
        >
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="text-center mb-10">
              <h2
                className="text-xs lg:text-sm font-bold uppercase tracking-[0.4em]"
                style={{ color: 'var(--portfolio-muted-text)' }}
              >
                All Photos
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
              {visiblePhotos.map((photo: any, idx: number) => (
                <div
                  key={photo.id}
                  onClick={() => setSelectedPhotoIdx(idx)}
                  className="group relative overflow-hidden rounded-xl cursor-pointer border"
                  style={{ borderColor: 'var(--portfolio-border)' }}
                >
                  <div className="aspect-[4/3] overflow-hidden">
                    <img
                      src={photo.thumbUrl || photo.url}
                      alt={photo.caption || `Photo ${idx + 1}`}
                      className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                      loading="lazy"
                    />

                    {/* Video indicator */}
                    {photo.mediaType === 'video' && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div
                          className="w-16 h-16 rounded-full flex items-center justify-center backdrop-blur-md border-2"
                          style={{
                            background: 'rgba(0,0,0,0.5)',
                            borderColor: 'var(--portfolio-primary)',
                          }}
                        >
                          <Play
                            className="w-6 h-6 fill-current ml-1"
                            style={{ color: 'var(--portfolio-primary)' }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Bottom overlay */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4">
                    <p className="text-xs lg:text-sm font-bold text-white uppercase tracking-wider truncate">
                      {photo.caption || `Photo ${idx + 1}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {hasMore && (
              <div className="text-center mt-12">
                <button
                  onClick={() => setDisplayLimit(prev => prev + 9)}
                  className="inline-flex items-center gap-3 px-8 py-4 rounded-full border-2 text-xs font-bold uppercase tracking-[0.3em] transition-all hover:scale-105"
                  style={{
                    borderColor: 'var(--portfolio-primary)',
                    color: 'var(--portfolio-primary)',
                  }}
                >
                  <Sparkles className="w-4 h-4" />
                  Load More ({photos.length - displayLimit} remaining)
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════ */}
      {/* FOOTER */}
      {/* ═══════════════════════════════════════════════════ */}
      <footer
        className="border-t py-8"
        style={{
          background: 'var(--portfolio-page-bg)',
          borderColor: 'var(--portfolio-border)',
        }}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-8 text-center">
          <p
            className="text-[10px] font-bold uppercase tracking-[0.3em]"
            style={{ color: 'var(--portfolio-muted-text)' }}
          >
            © {new Date().getFullYear()} {studioName.toUpperCase()}
            {city ? ` · ${city.toUpperCase()}` : ''}
          </p>
        </div>
      </footer>

      {/* ═══════════════════════════════════════════════════ */}
      {/* LIGHTBOX */}
      {/* ═══════════════════════════════════════════════════ */}
      {selectedPhotoIdx !== null && photos[selectedPhotoIdx] && (
        <div
          className="fixed inset-0 z-[100] bg-black/98 backdrop-blur-3xl flex items-center justify-center"
          onClick={() => setSelectedPhotoIdx(null)}
        >
          <button
            className="absolute top-6 right-6 z-30 text-white h-14 w-14 hover:bg-white/10 rounded-full flex items-center justify-center transition-colors"
            onClick={(e) => { e.stopPropagation(); setSelectedPhotoIdx(null); }}
          >
            <X className="w-7 h-7" />
          </button>

          <div className="absolute top-6 left-6 z-30 px-4 py-2 rounded-full bg-white/10 backdrop-blur-xl text-white text-sm font-bold">
            {selectedPhotoIdx + 1} / {photos.length}
          </div>

          {photos.length > 1 && (
            <>
              <button
                className="absolute left-4 lg:left-10 top-1/2 -translate-y-1/2 z-30 text-white h-16 w-16 hover:bg-white/10 rounded-full flex items-center justify-center transition-colors"
                onClick={(e) => { e.stopPropagation(); goPrev(); }}
              >
                <ChevronLeft className="w-10 h-10" />
              </button>

              <button
                className="absolute right-4 lg:right-10 top-1/2 -translate-y-1/2 z-30 text-white h-16 w-16 hover:bg-white/10 rounded-full flex items-center justify-center transition-colors"
                onClick={(e) => { e.stopPropagation(); goNext(); }}
              >
                <ChevronRight className="w-10 h-10" />
              </button>
            </>
          )}

          {/* Photo ya Video */}
          {photos[selectedPhotoIdx].mediaType === 'video' && photos[selectedPhotoIdx].videoUrl ? (
            <video
              src={photos[selectedPhotoIdx].videoUrl}
              controls
              autoPlay
              className="max-w-[95vw] max-h-[90vh] object-contain rounded-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <img
              src={photos[selectedPhotoIdx].url}
              alt={photos[selectedPhotoIdx].caption || 'Fullscreen'}
              className="max-w-[95vw] max-h-[90vh] object-contain rounded-2xl animate-in fade-in duration-300"
              onClick={(e) => e.stopPropagation()}
            />
          )}

          {photos[selectedPhotoIdx].caption && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 px-6 py-3 rounded-full bg-white/10 backdrop-blur-xl text-white text-sm font-bold uppercase tracking-widest">
              {photos[selectedPhotoIdx].caption}
            </div>
          )}
        </div>
      )}
    </div>
  );
}