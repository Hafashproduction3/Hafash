"use client";

import { useParams } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useFirestore } from "@/firebase";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import {
  Camera, X, ChevronLeft, ChevronRight, Loader2,
  LayoutGrid, Folder, ArrowRight, Search, Menu,
  Sparkles
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
  const [selectedPhotoIdx, setSelectedPhotoIdx] = useState<number | null>(null);
  const [displayLimit, setDisplayLimit] = useState(6);
  const [featuredFolder, setFeaturedFolder] = useState<any>(null);

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
            // Featured = sabse zyada photos wala folder
            const top = [...refreshedFolders].sort(
              (a, b) => (b.photoCount || 0) - (a.photoCount || 0)
            )[0];
            setFeaturedFolder(top || null);
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

  return (
    <div style={{ background: 'var(--portfolio-page-bg)' }}>

      {/* ═══════════════════════════════════════════════════ */}
      {/* TOP NAVIGATION (Minimal) */}
      {/* ═══════════════════════════════════════════════════ */}
      <nav
        className="border-b"
        style={{
          borderColor: 'var(--portfolio-border)',
          background: 'var(--portfolio-header-bg)',
        }}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-5 flex items-center justify-between">
          <Link href="/" className="space-y-0.5">
            <p
              className="text-xl lg:text-2xl font-headline font-bold tracking-wider"
              style={{ color: 'var(--portfolio-heading-text)' }}
            >
              {studioName.toUpperCase()}
            </p>
            <p
              className="text-[9px] font-bold uppercase tracking-[0.4em]"
              style={{ color: 'var(--portfolio-muted-text)' }}
            >
              Production
            </p>
          </Link>

          <div className="hidden lg:flex items-center gap-10">
            {[
              { label: 'Work', href: '/portfolio' },
              { label: 'Archive', href: '/portfolio' },
              { label: 'About', href: '/about' },
              { label: 'Contact', href: '/contact' },
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="text-xs font-bold uppercase tracking-[0.2em] transition-opacity hover:opacity-70"
                style={{ color: 'var(--portfolio-body-text)' }}
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <button
              className="w-8 h-8 flex items-center justify-center transition-opacity hover:opacity-70"
              style={{ color: 'var(--portfolio-body-text)' }}
            >
              <Search className="w-4 h-4" />
            </button>
            <button
              className="w-8 h-8 flex items-center justify-center transition-opacity hover:opacity-70"
              style={{ color: 'var(--portfolio-body-text)' }}
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      {/* ═══════════════════════════════════════════════════ */}
      {/* FEATURED + FOLDERS SPLIT */}
      {/* ═══════════════════════════════════════════════════ */}
      <section className="py-10 lg:py-16" style={{ background: 'var(--portfolio-page-bg)' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">

            {/* LEFT — Featured Folder */}
            {featuredFolder && (
              <div className="lg:col-span-7">
                <Link href={`/portfolio/${featuredFolder.slug || featuredFolder.id}`}>
                  <div
                    className="relative aspect-[4/3] rounded-2xl overflow-hidden group cursor-pointer border"
                    style={{ borderColor: 'var(--portfolio-border)' }}
                  >
                    {featuredFolder.coverImage ? (
                      <img
                        src={featuredFolder.coverImage}
                        alt={featuredFolder.name}
                        className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center"
                        style={{ background: 'var(--portfolio-card-bg)' }}
                      >
                        <Folder className="w-20 h-20" style={{ color: 'var(--portfolio-muted-text)', opacity: 0.3 }} />
                      </div>
                    )}

                    {/* Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

                    {/* Top-left label */}
                    <div className="absolute top-6 left-6">
                      <span
                        className="text-[10px] font-bold uppercase tracking-[0.4em]"
                        style={{ color: 'var(--portfolio-primary)' }}
                      >
                        {featuredFolder.name}
                      </span>
                    </div>

                    {/* Bottom content */}
                    <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-8 space-y-3">
                      <div className="flex items-center gap-2">
                        <Folder className="w-4 h-4" style={{ color: 'var(--portfolio-primary)' }} />
                        <span
                          className="text-[10px] font-bold uppercase tracking-[0.3em]"
                          style={{ color: 'var(--portfolio-primary)' }}
                        >
                          Folder / {featuredFolder.name}
                        </span>
                      </div>

                      <h2 className="text-4xl lg:text-6xl font-headline font-bold text-white uppercase tracking-tight">
                        {featuredFolder.name}
                      </h2>

                      <p className="text-xs lg:text-sm text-white/70 tracking-wider">
                        Featured · {featuredFolder.photoCount} Photos · {new Date().getFullYear()}
                        {featuredFolder.description ? ` · ${featuredFolder.description}` : ''}
                      </p>

                      <div className="pt-2">
                        <span
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md border-2 text-xs font-bold uppercase tracking-[0.2em] transition-all group-hover:gap-3"
                          style={{
                            borderColor: 'var(--portfolio-primary)',
                            color: 'var(--portfolio-primary)',
                          }}
                        >
                          Open Folder
                          <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            )}

            {/* RIGHT — Folders List */}
            <div className={cn("lg:col-span-5", !featuredFolder && "lg:col-span-12")}>
              <div className="space-y-4">
                <h3
                  className="text-[10px] font-bold uppercase tracking-[0.4em] pb-3 border-b"
                  style={{
                    color: 'var(--portfolio-muted-text)',
                    borderColor: 'var(--portfolio-border)',
                  }}
                >
                  Folders — {folders.length} {folders.length === 1 ? 'Collection' : 'Collections'}
                </h3>

                {folders.length === 0 ? (
                  <p
                    className="text-sm italic py-8 text-center"
                    style={{ color: 'var(--portfolio-muted-text)' }}
                  >
                    No folders yet
                  </p>
                ) : (
                  <div className="space-y-3">
                    {folders.map((folder: any) => (
                      <Link
                        key={folder.id}
                        href={`/portfolio/${folder.slug || folder.id}`}
                        className="flex items-center gap-4 p-3 rounded-xl border transition-all group hover:translate-x-1"
                        style={{
                          borderColor: 'var(--portfolio-border)',
                          background: 'var(--portfolio-card-bg)',
                        }}
                      >
                        {/* Thumbnail */}
                        <div
                          className="w-16 h-16 lg:w-20 lg:h-20 rounded-lg overflow-hidden shrink-0"
                          style={{ background: 'var(--portfolio-page-bg)' }}
                        >
                          {folder.coverImage ? (
                            <img
                              src={folder.coverImage}
                              alt={folder.name}
                              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Folder
                                className="w-6 h-6"
                                style={{ color: 'var(--portfolio-muted-text)', opacity: 0.4 }}
                              />
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p
                            className="font-headline font-bold text-lg lg:text-xl truncate"
                            style={{ color: 'var(--portfolio-heading-text)' }}
                          >
                            {folder.name}
                          </p>
                          <p
                            className="text-[10px] font-bold uppercase tracking-widest mt-0.5"
                            style={{ color: 'var(--portfolio-muted-text)' }}
                          >
                            {folder.photoCount || 0} Photos · Updated {new Date().getFullYear()}
                          </p>
                        </div>

                        {/* Arrow */}
                        <ArrowRight
                          className="w-4 h-4 shrink-0 transition-transform group-hover:translate-x-1"
                          style={{ color: 'var(--portfolio-primary)' }}
                        />
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════ */}
      {/* ALL PHOTOS GRID */}
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
            <div className="text-center mb-12">
              <h2
                className="text-[11px] font-bold uppercase tracking-[0.5em] mb-2"
                style={{ color: 'var(--portfolio-muted-text)' }}
              >
                All Photos — {photos.length} Items
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
                  </div>

                  {/* Bottom overlay with caption */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4 lg:p-5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs lg:text-sm font-bold text-white uppercase tracking-wider truncate">
                        {photo.caption || `Photo ${idx + 1}`}
                      </p>
                      <p className="text-[10px] font-bold text-white/60 tracking-widest shrink-0">
                        {String(idx + 1).padStart(2, '0')} / {String(photos.length).padStart(2, '0')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {hasMore && (
              <div className="text-center mt-12">
                <button
                  onClick={() => setDisplayLimit(prev => prev + 6)}
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
          background: 'var(--portfolio-header-bg)',
          borderColor: 'var(--portfolio-border)',
        }}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p
              className="text-[10px] font-bold uppercase tracking-[0.3em]"
              style={{ color: 'var(--portfolio-muted-text)' }}
            >
              {studioName} · Private Client Portfolio · {new Date().getFullYear()}
            </p>

            <div className="flex items-center gap-6 text-[10px] font-bold uppercase tracking-[0.3em]">
              {['Instagram', 'Email', 'Privacy', 'Credits'].map((item) => (
                <span
                  key={item}
                  className="cursor-pointer transition-opacity hover:opacity-70"
                  style={{ color: 'var(--portfolio-muted-text)' }}
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
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
    </div>
  );
}
